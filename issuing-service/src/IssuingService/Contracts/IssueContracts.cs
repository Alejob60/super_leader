namespace IssuingService.Contracts
{
    public class IssueRequest
    {
        public string OrderId { get; set; } = string.Empty;
        public string Plate { get; set; } = string.Empty;
        public int VehicleYear { get; set; }
        public string CityCode { get; set; } = string.Empty;
        public string DocumentId { get; set; } = string.Empty;
        public decimal Premium { get; set; }
        public string Currency { get; set; } = "COP";
        public string QuoteId { get; set; } = string.Empty;
        public string CorrelationId { get; set; } = string.Empty;
    }

    public class PolicyResponse
    {
        public string PolicyNumber { get; set; } = string.Empty;
        public string ExternalRef { get; set; } = string.Empty;
        public DateTime IssuedAt { get; set; }
        public string Status { get; set; } = "ISSUED";
    }

    public class LegacyIssueRequest
    {
        public string order_id { get; set; } = string.Empty;
        public string plate_number { get; set; } = string.Empty;
        public int vehicle_year { get; set; }
        public string city_code { get; set; } = string.Empty;
        public string customer_document { get; set; } = string.Empty;
        public decimal premium_amount { get; set; }
        public string currency_code { get; set; } = "COP";
        public string quote_reference { get; set; } = string.Empty;
        public string correlation_id { get; set; } = string.Empty;
        public string legacy_field_1 { get; set; } = string.Empty;
        public string legacy_field_2 { get; set; } = string.Empty;
        public string redundant_data { get; set; } = string.Empty;
    }

    public class LegacyIssueResponse
    {
        public string? result { get; set; }
        public string? code { get; set; }
        public string? message { get; set; }
        public string? policy_number { get; set; }
        public string? external_reference { get; set; }
        public string? issued_date { get; set; }
        public string? legacy_status { get; set; }
    }

    public class PolicyQueryResponse
    {
        public string PolicyNumber { get; set; } = string.Empty;
        public string ExternalRef { get; set; } = string.Empty;
    }
}
