using System.Security.Claims;
using Atlas.Application.Common.Interfaces;
using Atlas.Application.Listings;
using Atlas.Application.Pricing;
using Atlas.Domain.Listings;
using Atlas.Infrastructure.Authentication;
using Atlas.Infrastructure.Persistence;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Atlas.Web.Api.Controllers;

public sealed record DealScoreDto(string Rating, decimal MedianPhp, double DeltaPct, int Samples);

public sealed record ListingDto(
    Guid Id,
    string Category,
    string Title,
    string Player,
    string Team,
    int Year,
    string Set,
    string? Parallel,
    bool Numbered,
    string? SerialNumber,
    bool Graded,
    string? GradingCompany,
    string? GradeValue,
    string? Condition,
    string? Description,
    string? ImageUrl,
    Guid SellerId,
    decimal Price,
    decimal? PreviousPrice,
    decimal? CurrentBid,
    int? BidCount,
    DateTime? EndsAt,
    string Type,
    string Format,
    string Status,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    DealScoreDto? DealScore);

public sealed record SellerDto(
    Guid UserId,
    string DisplayName,
    string Handle,
    decimal RatingAvg,
    int RatingCount,
    int SoldCount,
    int JoinedYear,
    bool Verified);

public sealed record PricePointDto(string Date, decimal Price);

public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize);

[ApiController]
[Route("api/listings")]
public class ListingsController(AtlasDbContext db, IObjectStorage storage, IValidator<CreateListingRequest> createValidator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Feed(
        [FromQuery] string? category,
        [FromQuery] string? format,
        [FromQuery] string? type,
        [FromQuery] bool? graded,
        [FromQuery] decimal? maxPrice,
        [FromQuery] string? player,
        [FromQuery] string? q,
        [FromQuery] string? sort,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 24,
        CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 60);

        var query = db.Listings.AsNoTracking().Where(l => l.Status == Domain.Listings.ListingStatus.Active);

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(l => l.Sport == category); // sport column carries category until the rename migration
        if (format == "fixed" || format == "auction")
            query = query.Where(l => l.ListingFormat == (format == "auction"
                ? Domain.Listings.ListingFormat.Auction
                : Domain.Listings.ListingFormat.FixedPrice));
        if (Enum.TryParse<Domain.Listings.ListingType>(type, ignoreCase: true, out var listingType))
            query = query.Where(l => l.Type == listingType);
        if (graded == true)
            query = query.Where(l => l.Graded);
        if (maxPrice is { } cap)
            query = query.Where(l => l.Price <= cap);
        if (!string.IsNullOrWhiteSpace(player))
            query = query.Where(l => l.Player == player);
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(l =>
                EF.Functions.ILike(l.Title, $"%{q}%") ||
                EF.Functions.ILike(l.Player, $"%{q}%") ||
                EF.Functions.ILike(l.Set, $"%{q}%") ||
                EF.Functions.ILike(l.Sport, $"%{q}%"));

        query = sort switch
        {
            "price_asc" => query.OrderBy(l => l.Price),
            "price_desc" => query.OrderByDescending(l => l.Price),
            _ => query.OrderByDescending(l => l.CreatedAt),
        };

        var total = await query.CountAsync(ct);
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var auctions = await AuctionsFor(items, ct);
        var bidCounts = await BidCountsFor(items.Select(l => l.Id), ct);
        var scores = await DealScoresFor(items, ct);

        var dtos = items
            .Select(l =>
            {
                auctions.TryGetValue(l.Id, out var auction);
                return ToDto(l, auction, bidCounts.GetValueOrDefault(l.Id), ToScoreDto(scores.GetValueOrDefault(l.Id)));
            })
            .ToList();

        // ending-soon sort happens in memory once auction end times are known
        if (sort == "ending")
            dtos = dtos.OrderBy(d => d.EndsAt ?? DateTime.MaxValue).ToList();

        return Ok(new { data = new PagedResult<ListingDto>(dtos, total, page, pageSize) });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Detail(Guid id, CancellationToken ct)
    {
        var listing = await db.Listings.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id, ct);
        if (listing is null)
            return NotFound(new { error = "Listing not found." });

        var sellerProfile = await db.SellerProfiles.AsNoTracking()
            .FirstOrDefaultAsync(s => s.UserId == listing.SellerId, ct);
        var historyRows = await db.PriceHistory.AsNoTracking()
            .Where(h => h.CardIdentityKey == id.ToString())
            .OrderBy(h => h.SaleDate)
            .ToListAsync(ct);
        var auctions = await AuctionsFor([listing], ct);
        var bidCounts = await BidCountsFor([listing.Id], ct);

        var dealScore = listing.ListingFormat == Domain.Listings.ListingFormat.FixedPrice
            ? DealScoreService.Evaluate(listing.Price, historyRows.Select(h => h.SalePrice).ToList())
            : null;

        var dto = new
        {
            listing = ToDto(listing, auctions.GetValueOrDefault(id), bidCounts.GetValueOrDefault(id), ToScoreDto(dealScore), includeDescription: true),
            seller = sellerProfile is null ? null : new SellerDto(
                sellerProfile.UserId,
                sellerProfile.DisplayName,
                sellerProfile.DisplayName.ToLowerInvariant().Replace(" ", "").Replace("&", ""),
                sellerProfile.RatingAvg,
                sellerProfile.RatingCount,
                sellerProfile.SoldCount,
                sellerProfile.JoinedDate.Year,
                sellerProfile.VerificationBadge),
            history = historyRows.Select(h => new PricePointDto(h.SaleDate.ToString("yyyy-MM-dd"), h.SalePrice)).ToList(),
        };
        return Ok(new { data = dto });
    }

    [Authorize]
    [HttpGet("mine")]
    public async Task<IActionResult> Mine(CancellationToken ct)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();

        var items = await db.Listings.AsNoTracking()
            .Where(l => l.SellerId == userId)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync(ct);
        return Ok(new { data = items.Select(l => ToDto(l, null, 0, null, includeDescription: true)).ToList() });
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateListingRequest request, CancellationToken ct)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();

        var validation = await createValidator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            return BadRequest(new { error = validation.Errors[0].ErrorMessage, errors = validation.Errors.Select(e => e.ErrorMessage) });

        var listing = new Listing
        {
            Id = Guid.NewGuid(),
            SellerId = userId.Value,
            Sport = request.Category,
            Type = ParseListingType(request.Type),
            Title = $"{request.Player} {request.Year} {request.Set}{(string.IsNullOrEmpty(request.Parallel) ? "" : $" {request.Parallel}")}".Trim(),
            Description = $"Listed by an Atlas seller. Ships bubble-wrapped with tracking anywhere in PH.",
            Player = request.Player.Trim(),
            Team = string.IsNullOrWhiteSpace(request.Team) ? "—" : request.Team.Trim(),
            Year = request.Year,
            Set = request.Set.Trim(),
            Parallel = string.IsNullOrWhiteSpace(request.Parallel) ? null : request.Parallel!.Trim(),
            Numbered = false,
            SerialNumber = null,
            Graded = request.Graded,
            GradingCompany = request.Graded ? request.GradingCompany : null,
            GradeValue = request.Graded ? request.GradeValue : null,
            Condition = request.Graded ? null : request.Condition,
            Price = Math.Round(request.Price, 2),
            ListingFormat = request.Format == "auction" ? ListingFormat.Auction : ListingFormat.FixedPrice,
            Status = ListingStatus.Active,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Listings.Add(listing);

        if (request.Format == "auction")
        {
            db.Auctions.Add(new Domain.Auctions.Auction
            {
                ListingId = listing.Id,
                StartPrice = listing.Price,
                EndTime = DateTime.UtcNow.AddHours(request.EndsInHours!.Value),
                Status = Domain.Auctions.AuctionStatus.Active,
            });
        }

        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Detail), new { id = listing.Id }, new { data = ToDto(listing, null, 0, null, includeDescription: true) });
    }

    [Authorize]
    [HttpPost("{id:guid}/photos")]
    public async Task<IActionResult> UploadPhoto(Guid id, IFormFile file, CancellationToken ct)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();

        var listing = await db.Listings.FirstOrDefaultAsync(l => l.Id == id, ct);
        if (listing is null) return NotFound(new { error = "Listing not found." });
        if (listing.SellerId != userId.Value) return Forbid();

        if (file is null || file.Length == 0)
            return BadRequest(new { error = "Choose a photo to upload." });
        if (file.Length > MaxPhotoBytes)
            return BadRequest(new { error = "Photos must be 5 MB or smaller." });
        if (!IsAllowedImage(file))
            return BadRequest(new { error = "Only JPEG, PNG or WebP images are accepted." });

        var existingCount = await db.ListingPhotos.CountAsync(p => p.ListingId == id, ct);
        if (existingCount >= MaxPhotosPerListing)
            return BadRequest(new { error = $"A listing can hold up to {MaxPhotosPerListing} photos." });

        // content wins over filename — never trust the declared extension
        var ext = SniffExtension(file);
        if (ext.Length == 0)
            return BadRequest(new { error = "That file does not look like a valid JPEG, PNG or WebP image." });

        await using var stream = file.OpenReadStream();
        var key = await storage.PutAsync(stream, $"{id}/{Guid.NewGuid():N}{ext}", file.ContentType, ct);
        var url = storage.GetUrl(key);

        db.ListingPhotos.Add(new ListingPhoto
        {
            Id = Guid.NewGuid(),
            ListingId = id,
            StorageKey = key,
            Url = url,
            SortOrder = existingCount,
        });

        // first photo becomes the tile image
        listing.ImageUrl ??= url;
        listing.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        return Ok(new { data = new { key, url } });
    }

    private static ListingType ParseListingType(string value) => value switch
    {
        "lot" => ListingType.Lot,
        "hobby_box" => ListingType.HobbyBox,
        "accessory" => ListingType.Accessory,
        _ => ListingType.SingleCard,
    };

    private static string ToApiType(ListingType type) => type switch
    {
        ListingType.Lot => "lot",
        ListingType.HobbyBox => "hobby_box",
        ListingType.Accessory => "accessory",
        _ => "single_card",
    };

    private static string ToApiStatus(ListingStatus status) => status switch
    {
        ListingStatus.Sold => "sold",
        ListingStatus.Ended => "ended",
        ListingStatus.Cancelled => "cancelled",
        ListingStatus.Draft => "draft",
        _ => "active",
    };

    private static string ToApiFormat(ListingFormat format) =>
        format == ListingFormat.Auction ? "auction" : "fixed";

    private const long MaxPhotoBytes = 5 * 1024 * 1024;
    private const int MaxPhotosPerListing = 6;

    private static bool IsAllowedImage(IFormFile file) =>
        file.ContentType is "image/jpeg" or "image/png" or "image/webp";

    private static string SniffExtension(IFormFile file)
    {
        Span<byte> header = stackalloc byte[12];
        using var s = file.OpenReadStream();
        var read = s.Read(header);
        file.OpenReadStream().Position = 0;

        if (read >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF) return ".jpg";
        if (read >= 8 && header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47) return ".png";
        if (read >= 12 && header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46
            && header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50) return ".webp";
        return "";
    }

    private Guid? CurrentUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) ? id : null;

    [HttpGet("sold/recent")]
    public async Task<IActionResult> RecentlySold([FromQuery] int limit = 6, CancellationToken ct = default)
    {
        limit = Math.Clamp(limit, 1, 12);
        var items = await db.Listings.AsNoTracking()
            .Where(l => l.Status == ListingStatus.Sold)
            .OrderByDescending(l => l.UpdatedAt)
            .Take(limit)
            .ToListAsync(ct);
        return Ok(new { data = items.Select(l => new
        {
            id = l.Id,
            title = l.Title,
            player = l.Player,
            category = l.Sport,
            price = l.Price,
            imageUrl = l.ImageUrl,
            soldAt = l.UpdatedAt,
        }) });
    }

    [Authorize]
    [HttpPost("{id:guid}/sold")]
    public async Task<IActionResult> MarkSold(Guid id, CancellationToken ct)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();

        var listing = await db.Listings.FirstOrDefaultAsync(l => l.Id == id, ct);
        if (listing is null) return NotFound(new { error = "Listing not found." });
        if (listing.SellerId != userId.Value) return Forbid();
        if (listing.Status != ListingStatus.Active)
            return BadRequest(new { error = "Only active listings can be marked as sold." });

        listing.Status = ListingStatus.Sold;
        listing.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok(new { data = ToDto(listing, null, 0, null, includeDescription: true) });
    }

    private async Task<Dictionary<Guid, int>> BidCountsFor(IEnumerable<Guid> listingIds, CancellationToken ct)
    {
        var ids = listingIds.ToList();
        return await db.Bids.AsNoTracking()
            .Where(b => ids.Contains(b.ListingId))
            .GroupBy(b => b.ListingId)
            .ToDictionaryAsync(g => g.Key, g => g.Count(), ct);
    }

    private async Task<Dictionary<Guid, Domain.Auctions.Auction>> AuctionsFor(IReadOnlyList<Domain.Listings.Listing> listings, CancellationToken ct)
    {
        var ids = listings.Select(l => l.Id).ToList();
        return await db.Auctions.AsNoTracking()
            .Where(a => ids.Contains(a.ListingId))
            .ToDictionaryAsync(a => a.ListingId, ct);
    }

    private async Task<Dictionary<Guid, DealScoreResult?>> DealScoresFor(List<Domain.Listings.Listing> listings, CancellationToken ct)
    {
        var fixedIds = listings
            .Where(l => l.ListingFormat == Domain.Listings.ListingFormat.FixedPrice)
            .Select(l => l.Id.ToString())
            .ToList();
        if (fixedIds.Count == 0)
            return [];

        var histories = await db.PriceHistory.AsNoTracking()
            .Where(h => fixedIds.Contains(h.CardIdentityKey))
            .GroupBy(h => h.CardIdentityKey)
            .ToDictionaryAsync(g => g.Key, g => g.Select(x => x.SalePrice).ToList(), ct);

        return listings.ToDictionary(
            l => l.Id,
            l => histories.TryGetValue(l.Id.ToString(), out var prices)
                ? DealScoreService.Evaluate(l.Price, prices)
                : null);
    }

    private static DealScoreDto? ToScoreDto(DealScoreResult? score) =>
        score is null ? null : new DealScoreDto(
            score.Rating switch
            {
                DealRating.GreatDeal => "great",
                DealRating.Fair => "fair",
                _ => "above",
            },
            score.MedianPricePhp,
            (double)score.DeltaPct,
            score.SampleCount);

    private static ListingDto ToDto(
        Domain.Listings.Listing l,
        Domain.Auctions.Auction? auction,
        int bidCount,
        DealScoreDto? score = null,
        bool includeDescription = false) =>
        new(
            l.Id,
            l.Sport,
            l.Title,
            l.Player,
            l.Team,
            l.Year,
            l.Set,
            l.Parallel,
            l.Numbered,
            l.SerialNumber,
            l.Graded,
            l.GradingCompany,
            l.GradeValue,
            l.Condition,
            includeDescription ? l.Description : null,
            l.ImageUrl,
            l.SellerId,
            l.Price,
            null, // previous sale price arrives from market ingestion later
            auction?.CurrentBid,
            auction is null ? null : bidCount,
            auction?.EndTime,
            ToApiType(l.Type),
            ToApiFormat(l.ListingFormat),
            ToApiStatus(l.Status),
            l.CreatedAt,
            l.UpdatedAt,
            score);
}
