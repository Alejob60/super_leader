using IssuingService.AntiCorruption;
using IssuingService.Contracts;
using Microsoft.AspNetCore.Mvc;

namespace IssuingService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class IssueController : ControllerBase
    {
        private readonly LegacyIssuerAdapter _legacyAdapter;
        private readonly ILogger<IssueController> _logger;

        public IssueController(LegacyIssuerAdapter legacyAdapter, ILogger<IssueController> logger)
        {
            _legacyAdapter = legacyAdapter;
            _logger = logger;
        }

        [HttpPost]
        public async Task<IActionResult> IssuePolicy([FromBody] IssueRequest request)
        {
            try
            {
                _logger.LogInformation("Processing issue request for order {OrderId} with correlation {CorrelationId}",
                    request.OrderId, request.CorrelationId);

                var policy = await _legacyAdapter.IssuePolicyAsync(request);
                
                _logger.LogInformation("Policy {PolicyNumber} issued successfully for order {OrderId}",
                    policy.PolicyNumber, request.OrderId);

                return Ok(policy);
            }
            catch (LegacyBusinessException ex)
            {
                _logger.LogWarning("Legacy business error for order {OrderId}: {ErrorCode} - {Message}",
                    request.OrderId, ex.ErrorCode, ex.Message);
                
                return Ok(new
                {
                    result = "ERROR",
                    code = ex.ErrorCode,
                    message = ex.Message
                });
            }
            catch (LegacyCommunicationException ex)
            {
                _logger.LogError(ex, "Communication error for order {OrderId}", request.OrderId);
                return StatusCode(502, new { error = "Legacy system unavailable", details = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error for order {OrderId}", request.OrderId);
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        [HttpGet("policies")]
        public async Task<IActionResult> QueryPolicy([FromQuery] string externalRef)
        {
            if (string.IsNullOrEmpty(externalRef))
            {
                return BadRequest(new { error = "externalRef is required" });
            }

            var policy = await _legacyAdapter.QueryPolicyAsync(externalRef);
            
            if (policy == null)
            {
                return NotFound(new { error = "Policy not found" });
            }

            return Ok(policy);
        }
    }
}
