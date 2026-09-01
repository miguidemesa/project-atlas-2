FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /app

# Copy backend project definitions and restore
COPY backend/src/Atlas.Domain/Atlas.Domain.csproj backend/src/Atlas.Domain/
COPY backend/src/Atlas.Application/Atlas.Application.csproj backend/src/Atlas.Application/
COPY backend/src/Atlas.Infrastructure/Atlas.Infrastructure.csproj backend/src/Atlas.Infrastructure/
COPY backend/src/Atlas.Web.Api/Atlas.Web.Api.csproj backend/src/Atlas.Web.Api/

RUN dotnet restore backend/src/Atlas.Web.Api/Atlas.Web.Api.csproj

# Copy all backend source files and publish
COPY backend/src/ backend/src/
WORKDIR /app/backend/src/Atlas.Web.Api
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "Atlas.Web.Api.dll"]
