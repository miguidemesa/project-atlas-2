namespace Atlas.Application.Listings;

/// <param name="Hue">OKLCH hue angle the frontend derives the game's page skin from.</param>
public sealed record CategoryInfo(string Slug, string Name, string Group, int Hue, IReadOnlyList<string> Aliases);
