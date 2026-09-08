using IssuingService.Contracts;
using System.Net.Http.Json;
using System.Text.Json;

namespace IssuingService.AntiCorruption
{
    public class LegacyIssuerAdapter
    {
        private readonly HttpClient _httpClient;
        private readonly string _legacyEndpoint;
        private readonly ILogger<LegacyIssuerAdapter> _logger;

        public LegacyIssuerAdapter(HttpClient httpClient, IConfiguration configuration, ILogger<LegacyIssuerAdapter> logger)
        {
            _httpClient = httpClient;
            _legacyEndpoint = configuration["IssuingService:LegacyEndpoint"] ?? "http://localhost:9090/issue";
            _logger = logger;
        }

        public async Task<PolicyResponse> IssuePolicyAsync(IssueRequest request)
        {
            var legacyRequest = MapToLegacyRequest(request);
            
            try
            {
                var response = await _httpClient.PostAsJsonAsync(_legacyEndpoint, legacyRequest);
                var responseBody = await response.Content.ReadAsStringAsync();
                
                _logger.LogInformation("Legacy issuer responded with status {StatusCode}", response.StatusCode);
                
                if (response.IsSuccessStatusCode)
                {
                    var legacyResponse = JsonSerializer.Deserialize<LegacyIssueResponse>(responseBody);
                    
                    if (legacyResponse != null && legacyResponse.result == "ERROR")
                    {
                        _logger.LogWarning("Legacy issuer returned business error: {Code} - {Message}", 
                            legacyResponse.code, legacyResponse.message);
                        
                        throw new LegacyBusinessException(
                            legacyResponse.code ?? "UNKNOWN_ERROR",
                            legacyResponse.message ?? "Unknown error from legacy system");
                    }
                    
                    return MapToPolicyResponse(legacyResponse!, request);
                }
                
                throw new LegacyCommunicationException(
                    $"Legacy issuer returned HTTP {(int)response.StatusCode}: {responseBody}");
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "Failed to communicate with legacy issuer");
                throw new LegacyCommunicationException($"Communication failed: {ex.Message}", ex);
            }
        }

        public async Task<PolicyQueryResponse?> QueryPolicyAsync(string externalRef)
        {
            try
            {
                var response = await _httpClient.GetAsync($"{_legacyEndpoint.Replace("/issue", "/policies")}?externalRef={externalRef}");
                
                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    var result = JsonSerializer.Deserialize<JsonElement>(content);
                    
                    return new PolicyQueryResponse
                    {
                        PolicyNumber = result.GetProperty("policy_number").GetString() ?? string.Empty,
                        ExternalRef = result.GetProperty("external_reference").GetString() ?? string.Empty
                    };
                }
                
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to query policy for external ref {ExternalRef}", externalRef);
                return null;
            }
        }

        private LegacyIssueRequest MapToLegacyRequest(IssueRequest request)
        {
            return new LegacyIssueRequest
            {
                order_id = request.OrderId,
                plate_number = request.Plate,
                vehicle_year = request.VehicleYear,
                city_code = request.CityCode,
                customer_document = request.DocumentId,
                premium_amount = request.Premium,
                currency_code = request.Currency,
                quote_reference = request.QuoteId,
                correlation_id = request.CorrelationId,
                legacy_field_1 = $"LEGACY-{DateTime.UtcNow:yyyyMMdd}",
                legacy_field_2 = "DEFAULT_VALUE",
                redundant_data = $"{request.Plate}-{request.VehicleYear}"
            };
        }

        private PolicyResponse MapToPolicyResponse(LegacyIssueResponse legacyResponse, IssueRequest request)
        {
            if (string.IsNullOrEmpty(legacyResponse.policy_number))
            {
                throw new LegacyBusinessException("NO_POLICY", "Legacy system did not return a policy number");
            }

            return new PolicyResponse
            {
                PolicyNumber = legacyResponse.policy_number,
                ExternalRef = legacyResponse.external_reference ?? request.OrderId,
                IssuedAt = DateTime.TryParse(legacyResponse.issued_date, out var date) ? date : DateTime.UtcNow,
                Status = "ISSUED"
            };
        }
    }

    public class LegacyBusinessException : Exception
    {
        public string ErrorCode { get; }
        
        public LegacyBusinessException(string errorCode, string message) : base(message)
        {
            ErrorCode = errorCode;
        }
    }

    public class LegacyCommunicationException : Exception
    {
        public LegacyCommunicationException(string message) : base(message) { }
        public LegacyCommunicationException(string message, Exception inner) : base(message, inner) { }
    }
}
