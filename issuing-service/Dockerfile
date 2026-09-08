FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 5000

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["src/IssuingService/IssuingService.csproj", "IssuingService/"]
RUN dotnet restore "IssuingService/IssuingService.csproj"
COPY src/IssuingService/ .
RUN dotnet publish "IssuingService.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:5000
ENTRYPOINT ["dotnet", "IssuingService.dll"]
