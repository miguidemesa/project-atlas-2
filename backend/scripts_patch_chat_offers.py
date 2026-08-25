import os, re

os.chdir("/Users/migui/Documents/project-atlas 2/backend")

# 1. Domain: Kind on Message
p = "src/Atlas.Domain/Messages/Message.cs"
s = open(p).read()
if "Kind" not in s:
    s = s.replace("    public string Content { get; set; } = string.Empty;",
'''    public string Content { get; set; } = string.Empty;
    public string Kind { get; set; } = "user"; // user | offer''')
open(p, "w").write(s)

# 2. EF mapping
p = "src/Atlas.Infrastructure/Persistence/Configurations/MessageConfiguration.cs"
s = open(p).read()
if "kind" not in s:
    s = s.replace('        b.Property(x => x.Content).HasColumnName("content").HasMaxLength(2000).IsRequired();',
'''        b.Property(x => x.Content).HasColumnName("content").HasMaxLength(4000).IsRequired();
        b.Property(x => x.Kind).HasColumnName("kind").HasMaxLength(20).HasDefaultValue("user");''')
open(p, "w").write(s)

# 3. OfferService: card helper + hooks
p = "src/Atlas.Infrastructure/Offers/OfferService.cs"
s = open(p).read()

helper = '''
    /// <summary>Drops an interactive offer card into the buyer-seller thread.</summary>
    private async Task PostCardAsync(Offer o, Guid actorId, CancellationToken ct)
    {
        var actorRole = o.BuyerId == actorId ? "buyer" : "seller";
        var recipient = actorRole == "buyer" ? o.SellerId : o.BuyerId;
        var card = System.Text.Json.JsonSerializer.Serialize(new
        {
            type = "offer",
            offerId = o.Id,
            amount = o.Amount,
            listingId = o.ListingId,
            actorRole,
        });
        db.Messages.Add(new Domain.Messages.Message
        {
            Id = Guid.NewGuid(),
            SenderId = actorId,
            RecipientId = recipient,
            ListingId = o.ListingId,
            Content = card,
            Kind = "offer",
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync(ct);
    }

'''
anchor = "    // ---- helpers ----"
assert anchor in s
s = s.replace(anchor, helper + anchor)

# hook calls after each SaveChanges where relevant
hooks = [
    # MakeAsync: after initial save, before ToDto
    ('''        db.Offers.Add(offer);
        await db.SaveChangesAsync(ct);
        return await ToDtoAsync(offer, "buyer", ct);''',
     '''        db.Offers.Add(offer);
        await db.SaveChangesAsync(ct);
        await PostCardAsync(offer, buyerId, ct);
        return await ToDtoAsync(offer, "buyer", ct);'''),
    # CounterAsync
    ('''        db.Offers.Add(counter);
        await db.SaveChangesAsync(ct);

        return await ToDtoAsync(counter, offer.SellerId == actorId ? "seller" : "buyer", ct);''',
     '''        db.Offers.Add(counter);
        await db.SaveChangesAsync(ct);
        await PostCardAsync(counter, actorId, ct);

        return await ToDtoAsync(counter, offer.SellerId == actorId ? "seller" : "buyer", ct);'''),
    # AcceptAsync: after tx commit, before BuildOrderDto
    ('''        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        return await BuildOrderDtoAsync(order, "buyer");''',
     '''        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        await PostCardAsync(offer, actorId, ct);

        return await BuildOrderDtoAsync(order, "buyer");'''),
]
for old, new in hooks:
    assert old in s, old[:60]
    s = s.replace(old, new)

open(p, "w").write(s)

# 4. ConversationsController: kind on dto
p = "src/Atlas.Web.Api/Controllers/ConversationsController.cs"
s = open(p).read()
s = s.replace('''public sealed record MessageDto(
    Guid Id,
    Guid SenderId,
    bool Mine,
    string Content,
    DateTime CreatedAt);''','''public sealed record MessageDto(
    Guid Id,
    Guid SenderId,
    bool Mine,
    string Content,
    string Kind,
    DateTime CreatedAt);''')
s = s.replace('new MessageDto(m.Id, m.SenderId, m.SenderId == me, m.Content, m.CreatedAt)',
              'new MessageDto(m.Id, m.SenderId, m.SenderId == me, m.Content, m.Kind ?? "user", m.CreatedAt)')
open(p, "w").write(s)
print("backend patched")
