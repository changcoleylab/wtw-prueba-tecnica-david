using Invoice.Application.Invoices;
using Invoice.Application.Invoices.Dtos;
using Invoice.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Invoice.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/invoices")]
[Produces("application/json")]
[Tags("Invoices")]
public sealed class InvoicesController : ControllerBase
{
    private readonly IInvoiceService _invoices;

    public InvoicesController(IInvoiceService invoices)
    {
        _invoices = invoices;
    }

    /// <summary>WTW: POST /invoice. Header opcional Idempotency-Key.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(InvoiceResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<InvoiceResponse>> Create(
        [FromBody] CreateInvoiceRequest request,
        [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey,
        CancellationToken cancellationToken)
    {
        var created = await _invoices.CreateAsync(request, CurrentUserId(), idempotencyKey, cancellationToken);
        return Created($"/api/v1/invoices/{created.Id}", created);
    }

    /// <summary>WTW: GET /invoice/{id}.</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(InvoiceResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<InvoiceResponse>> GetById(Guid id, CancellationToken cancellationToken)
        => Ok(await _invoices.GetByIdAsync(id, cancellationToken));

    /// <summary>WTW: GET /invoice/search?client={clientName}.</summary>
    [HttpGet("search")]
    [ProducesResponseType(typeof(IReadOnlyList<InvoiceResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<InvoiceResponse>>> Search(
        [FromQuery] string client,
        CancellationToken cancellationToken)
        => Ok(await _invoices.SearchAsync(client, cancellationToken));

    /// <summary>Lista paginada. Tras Authorize: page=1.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<InvoiceResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<InvoiceResponse>>> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
        => Ok(await _invoices.ListAsync(page, pageSize, cancellationToken));

    /// <summary>Cambia estado: Draft, Issued, Paid, Cancelled, Overdue.</summary>
    [HttpPatch("{id:guid}/status")]
    [ProducesResponseType(typeof(InvoiceResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<InvoiceResponse>> UpdateStatus(
        Guid id,
        [FromBody] UpdateInvoiceStatusRequest request,
        CancellationToken cancellationToken)
        => Ok(await _invoices.UpdateStatusAsync(id, request.Status, cancellationToken));

    /// <summary>¿Existe el número de factura? Ej. INV-2026-00001.</summary>
    [HttpGet("exists")]
    [ProducesResponseType(typeof(InvoiceExistsResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<InvoiceExistsResponse>> Exists(
        [FromQuery] string number,
        CancellationToken cancellationToken)
        => Ok(new InvoiceExistsResponse(await _invoices.ExistsByNumberAsync(number, cancellationToken)));

    private Guid? CurrentUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");
        return Guid.TryParse(value, out var id) ? id : null;
    }
}
