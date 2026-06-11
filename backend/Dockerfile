# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY ["src/RwandaMotor.API/RwandaMotor.API.csproj", "src/RwandaMotor.API/"]
COPY ["src/RwandaMotor.Application/RwandaMotor.Application.csproj", "src/RwandaMotor.Application/"]
COPY ["src/RwandaMotor.Domain/RwandaMotor.Domain.csproj", "src/RwandaMotor.Domain/"]
COPY ["src/RwandaMotor.Infrastructure/RwandaMotor.Infrastructure.csproj", "src/RwandaMotor.Infrastructure/"]

RUN dotnet restore "src/RwandaMotor.API/RwandaMotor.API.csproj"

COPY . .
RUN dotnet publish "src/RwandaMotor.API/RwandaMotor.API.csproj" -c Release -o /app/publish --no-restore

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

RUN adduser --disabled-password --gecos "" appuser && chown -R appuser /app
USER appuser

COPY --from=build --chown=appuser:appuser /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080
ENTRYPOINT ["dotnet", "RwandaMotor.API.dll"]
