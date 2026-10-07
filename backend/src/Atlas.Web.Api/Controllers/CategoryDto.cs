namespace Atlas.Web.Api.Controllers;

public sealed record CategoryDto(string Slug, string Name, string Group, int Hue, int ActiveListings);
