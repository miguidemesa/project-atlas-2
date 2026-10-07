using System.Security.Claims;
using Atlas.Application.Common.Interfaces;
using Atlas.Application.Listings;
using Atlas.Domain.Listings;
using Atlas.Infrastructure.Persistence;
using Atlas.Web.Api.Listings;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Atlas.Web.Api.Controllers;

[ApiController]
[Route("api/listings")]
public class ListingsController(
    AtlasDbContext db,
    IObjectStorage storage,
    IValidator<CreateListingRequest> createValidator,
    ListingDtoBuilder dtos) : ControllerBase
{
    private const int MaxPageSize = 60;

    [HttpGet]
    public async Task<IActionResult> Feed([FromQuery] FeedQuery f, CancellationToken ct)
    {
        if (f.Category is not null && !CategoryList.IsValid(f.Category))
            return BadRequest(new { error = $"Unknown category '{f.Category}'." });
        ListingType? listingType = null;
        if (!string.IsNullOrWhiteSpace(f.Type))
        {
            if (!ListingTypes.TryParse(f.Type, out var parsed))
                return BadRequest(new { error = $"Unknown type '{f.Type}'." });
            listingType = parsed;
        }

        var page = Math.Max(1, f.Page);
        var pageSize = Math.Clamp(f.PageSize, 1, MaxPageSize);
        var query = db.LiveListings(DateTime.UtcNow);

        if (f.Category is not null) query = query.Where(l => l.Category == f.Category);
        if (f.Format == "fixed") query = query.Where(l => l.ListingFormat == ListingFormat.FixedPrice);
        if (f.Format == "auction" || f.Sort == "ending") query = query.Where(l => l.ListingFormat == ListingFormat.Auction);
        if (listingType is { } type) query = query.Where(l => l.Type == type);
        if (f.Graded == true) query = query.Where(l => l.Graded);
        if (f.MinPrice is { } floor) query = query.Where(l => l.Price >= floor);
        if (f.MaxPrice is { } cap) query = query.Where(l => l.Price <= cap);
        if (!string.IsNullOrWhiteSpace(f.Language)) query = query.Where(l => l.Language == f.Language);
        if (!string.IsNullOrWhiteSpace(f.Player)) query = query.Where(l => l.Player == f.Player);
        if (!string.IsNullOrWhiteSpace(f.Q))
        {
            var pattern = $"%{EscapeLike(f.Q.Trim())}%";
            query = query.Where(l =>
                EF.Functions.ILike(l.Title, pattern, "\\")
                || EF.Functions.ILike(l.Player, pattern, "\\")
                || EF.Functions.ILike(l.Set, pattern, "\\")
                || (l.CardNumber != null && EF.Functions.ILike(l.CardNumber, pattern, "\\")));
        }

        query = f.Sort switch
        {
            "price_asc" => query.OrderBy(l => l.Price).ThenByDescending(l => l.CreatedAt),
            "price_desc" => query.OrderByDescending(l => l.Price).ThenByDescending(l => l.CreatedAt),
            "popular" => query.OrderByDescending(l => l.ViewCount).ThenByDescending(l => l.CreatedAt),
            "ending" => query.OrderByEndingSoonest(db),
            _ => query.OrderByDescending(l => l.CreatedAt),
        };

        var total = await query.CountAsync(ct);
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return Ok(new { data = new PagedResult<ListingDto>(await dtos.BuildAsync(items, ct), total, page, pageSize) });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Detail(Guid id, CancellationToken ct)
    {
        var listing = await db.Listings.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id, ct);
        if (listing is null)
            return NotFound(new { error = "Listing not found." });

        // atomic increment: no lost updates under concurrent views
        // ponytail: counts every GET (refreshes, bots); dedupe per visitor if "Trending" gets gamed
        await db.Listings.Where(l => l.Id == id)
            .ExecuteUpdateAsync(s => s.SetProperty(l => l.ViewCount, l => l.ViewCount + 1), ct);
        listing.ViewCount++;

        var dto = (await dtos.BuildAsync([listing], ct, withDetail: true))[0];
        var seller = await dtos.SellerAsync(listing.SellerId, ct);
        var history = await dtos.HistoryAsync(id, ct);
        return Ok(new { data = new ListingDetailDto(dto, seller, history) });
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
        return Ok(new { data = await dtos.BuildAsync(items, ct, withDetail: true) });
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

        ListingTypes.TryParse(request.Type, out var type);
        var serial = string.IsNullOrWhiteSpace(request.SerialNumber) ? null : request.SerialNumber.Trim();
        var listing = new Listing
        {
            Id = Guid.NewGuid(),
            SellerId = userId.Value,
            Category = request.Category,
            Type = type,
            Title = ListingTitle.Build(request),
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            Player = request.Player.Trim(),
            Team = string.IsNullOrWhiteSpace(request.Team) ? null : request.Team.Trim(),
            Year = request.Year,
            Set = request.Set.Trim(),
            CardNumber = string.IsNullOrWhiteSpace(request.CardNumber) ? null : request.CardNumber.Trim(),
            Language = request.Language ?? ListingLanguages.Default,
            Parallel = string.IsNullOrWhiteSpace(request.Parallel) ? null : request.Parallel.Trim(),
            Numbered = serial is not null,
            SerialNumber = serial,
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
        return CreatedAtAction(nameof(Detail), new { id = listing.Id }, new { data = (await dtos.BuildAsync([listing], ct, withDetail: true))[0] });
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
        return Ok(new { data = (await dtos.BuildAsync([listing], ct, withDetail: true))[0] });
    }

    /// <summary>
    /// Price-intelligence at listing time: how many ACTIVE listings share this
    /// exact card identity, and their price spread. Excludes the caller.
    /// </summary>
    [Authorize]
    [HttpGet("competing")]
    public async Task<IActionResult> Competing(
        [FromQuery] string player,
        [FromQuery] int year,
        [FromQuery] string set,
        [FromQuery] string? parallel,
        CancellationToken ct)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();

        var norm = (string v) => v.Trim().ToLowerInvariant();
        var par = string.IsNullOrWhiteSpace(parallel) ? null : parallel!.Trim().ToLowerInvariant();

        var candidates = await db.Listings.AsNoTracking()
            .Where(l => l.Status == ListingStatus.Active
                && l.SellerId != userId
                && l.Player.ToLower() == norm(player)
                && l.Year == year
                && l.Set.ToLower() == norm(set))
            .Select(l => new { l.Price, l.Parallel })
            .ToListAsync(ct);

        var prices = candidates
            .Where(c => string.IsNullOrWhiteSpace(c.Parallel)
                ? string.IsNullOrWhiteSpace(parallel)
                : !string.IsNullOrWhiteSpace(parallel) && c.Parallel!.ToLower() == par)
            .Select(c => c.Price)
            .OrderBy(p => p)
            .ToList();

        if (prices.Count == 0)
            return Ok(new { data = new CompetingResult(0, 0, 0, 0) });

        var mid = prices.Count / 2;
        var median = prices.Count % 2 == 1 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2m;

        return Ok(new { data = new CompetingResult(prices.Count, prices.First(), median, prices.Last()) });
    }

    /// <summary>A user's % or _ is a literal character in search, never a wildcard.</summary>
    private static string EscapeLike(string s) =>
        s.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");
}
