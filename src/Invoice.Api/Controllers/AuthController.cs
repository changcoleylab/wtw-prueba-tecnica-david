using Invoice.Application.Auth;
using Invoice.Application.Auth.Dtos;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Invoice.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
[Produces("application/json")]
[Tags("Auth")]
public sealed class AuthController : ControllerBase
{
    private readonly IAuthService _auth;

    public AuthController(IAuthService auth)
    {
        _auth = auth;
    }

    /// <summary>Emite un JWT. Usuario demo: analyst@invoicehub.local / InvoiceHub!2026</summary>
    [HttpPost("login")]
    [EnableRateLimiting("login")]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var response = await _auth.LoginAsync(request, cancellationToken);
        return Ok(response);
    }
}
