FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /app

# Copy all project files and restore dependencies
COPY src/Atlas.Domain/Atlas.Domain.csproj src/Atlas.Domain/
COPY src/Atlas.Application/Atlas.Application.csproj src/Atlas.Application/
COPY src/Atlas.Infrastructure/Atlas.Infrastructure.csproj src/Atlas.Infrastructure/
COPY src/Atlas.Web.Api/Atlas.Web.Api.csproj src/Atlas.Web.Api/

RUN dotnet restore src/Atlas.Web.Api/Atlas.Web.Api.csproj

# Copy the rest of the source code and build
COPY src/ src/
WORKDIR /app/src/Atlas.Web.Api
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# Configure default ports for container environments (Render/Railway/Docker)
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "Atlas.Web.Api.dll"]
