using Microsoft.AspNetCore.Mvc;

namespace Invoice.Api.Controllers;

[ApiController]
[Route("api/v1/health")]
[ApiExplorerSettings(IgnoreApi = true)]
public sealed class HealthController : ControllerBase
{
    /// <summary>Liveness de la API. SQL: GET /health/ready.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(HealthPayload), StatusCodes.Status200OK)]
    public IActionResult Get() => Ok(new HealthPayload("ok", DateTime.UtcNow));
}

public sealed record HealthPayload(string Status, DateTime Utc);
