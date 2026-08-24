using Atlas.Application.Common.Interfaces;
using Atlas.Application.MarketData;
using Atlas.Infrastructure.Authentication;
using Atlas.Infrastructure.MarketData;
using Atlas.Infrastructure.MarketData.PriceCharting;
using Atlas.Infrastructure.Persistence;
using Atlas.Infrastructure.Storage;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace Atlas.Infrastructure.DI;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        services.AddDbContext<AtlasDbContext>(options =>
            options.UseNpgsql(config.GetConnectionString("DefaultConnection")));

        services
            .AddIdentityCore<AppUser>(options =>
            {
                options.User.RequireUniqueEmail = true;
                options.Password.RequiredLength = 8;
                options.Password.RequireNonAlphanumeric = false;
                options.Password.RequireUppercase = false;
            })
            .AddEntityFrameworkStores<AtlasDbContext>()
            .AddDefaultTokenProviders();

        var jwt = config.GetSection("Jwt");
        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = jwt["Issuer"],
                    ValidAudience = jwt["Audience"],
                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(jwt["SecretKey"] ?? throw new InvalidOperationException("Jwt:SecretKey is not configured."))),
                    ClockSkew = TimeSpan.FromSeconds(30),
                };
            });

        services.AddAuthorization();

        services.AddSingleton<ITokenService, TokenService>();
        services.AddScoped<IAuthService, AuthService>();

        AddObjectStorage(services, config);
        AddMarketData(services, config);

        return services;
    }

    private static void AddMarketData(IServiceCollection services, IConfiguration config)
    {
        var section = config.GetSection("MarketData");
        var provider = section["Provider"] ?? "None";

        if (provider.Equals("PriceCharting", StringComparison.OrdinalIgnoreCase))
        {
            services.Configure<PriceChartingOptions>(section.GetSection(PriceChartingOptions.SectionName.Split(':').Last()));
            services.AddHttpClient<PriceChartingClient>((sp, client) =>
            {
                var opts = sp.GetRequiredService<IOptions<PriceChartingOptions>>().Value;
                client.Timeout = TimeSpan.FromSeconds(opts.TimeoutSeconds);
            });
            services.AddSingleton<ICardPriceProvider>(sp => sp.GetRequiredService<PriceChartingClient>());
        }
        else
        {
            services.AddSingleton<ICardPriceProvider, UnavailableCardPriceProvider>();
        }

        services.AddSingleton<IFxRateProvider>(new FixedFxRateProvider(
            config.GetValue<decimal?>("MarketData:FxUsdPhp") ?? 58.5m));

        services.AddScoped<MarketDataIngestionService>();
    }

    private static void AddObjectStorage(IServiceCollection services, IConfiguration config)
    {
        var section = config.GetSection("Storage");
        var provider = section["Provider"] ?? "Local";

        if (!provider.Equals("Local", StringComparison.OrdinalIgnoreCase))
            throw new NotSupportedException(
                $"Storage provider '{provider}' is not implemented yet. Use 'Local' for development.");

        var basePath = section["Local:Path"] ?? "App_Data/uploads";
        var publicBaseUrl = section["PublicBaseUrl"] ?? "http://localhost:5000/uploads";

        services.AddSingleton<IObjectStorage>(_ => new LocalFileSystemStorage(basePath, publicBaseUrl));
    }
}
