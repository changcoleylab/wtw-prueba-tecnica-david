using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using FluentValidation;
using Invoice.Application.Abstractions;
using Invoice.Application.Common;
using Invoice.Application.Invoices.Dtos;
using Invoice.Domain.Enums;
using Invoice.Domain.Exceptions;
using InvoiceEntity = Invoice.Domain.Entities.Invoice;

namespace Invoice.Application.Invoices;

public sealed class InvoiceService : IInvoiceService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly IInvoiceRepository _invoices;
    private readonly IClientRepository _clients;
    private readonly IIdempotencyStore _idempotency;
    private readonly IValidator<CreateInvoiceRequest> _validator;

    public InvoiceService(
        IInvoiceRepository invoices,
        IClientRepository clients,
        IIdempotencyStore idempotency,
        IValidator<CreateInvoiceRequest> validator)
    {
        _invoices = invoices;
        _clients = clients;
        _idempotency = idempotency;
        _validator = validator;
    }

    public async Task<InvoiceResponse> CreateAsync(
        CreateInvoiceRequest request,
        Guid? createdBy,
        string? idempotencyKey,
        CancellationToken cancellationToken)
    {
        await _validator.ValidateAndThrowAsync(request, cancellationToken);

        if (string.IsNullOrWhiteSpace(idempotencyKey))
        {
            return await PersistAsync(request, createdBy, cancellationToken);
        }

        var key = idempotencyKey.Trim();
        if (key.Length > 128)
        {
            throw new InvalidInvoiceException("Idempotency-Key must be 128 characters or fewer.");
        }

        var hash = Fingerprint(request);
        var reservation = await _idempotency.ReserveAsync(key, hash, cancellationToken);

        if (!reservation.Inserted)
        {
            if (!string.Equals(reservation.Record.RequestHash, hash, StringComparison.OrdinalIgnoreCase))
            {
                throw new ConflictException("Idempotency-Key was reused with a different payload.");
            }

            if (reservation.Record.ResponseStatus == 0)
            {
                throw new ConflictException("A request with this Idempotency-Key is already being processed.");
            }

            var cached = JsonSerializer.Deserialize<InvoiceResponse>(reservation.Record.ResponseBody, JsonOptions);
            return cached ?? throw new InvalidOperationException("Stored idempotent response could not be read.");
        }

        try
        {
            var created = await PersistAsync(request, createdBy, cancellationToken);
            var body = JsonSerializer.Serialize(created, JsonOptions);
            await _idempotency.CompleteAsync(key, StatusCodes201, body, cancellationToken);
            return created;
        }
        catch
        {
            await _idempotency.AbandonAsync(key, cancellationToken);
            throw;
        }
    }

    public async Task<InvoiceResponse> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var invoice = await _invoices.GetByIdAsync(id, cancellationToken);
        return invoice ?? throw new InvoiceNotFoundException(id);
    }

    public async Task<IReadOnlyList<InvoiceResponse>> SearchAsync(
        string clientName,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(clientName))
        {
            throw new InvalidInvoiceException("Query parameter 'client' is required.");
        }

        return await _invoices.SearchByClientNameAsync(clientName.Trim(), cancellationToken);
    }

    public Task<PagedResult<InvoiceResponse>> ListAsync(
        int page,
        int pageSize,
        CancellationToken cancellationToken)
        => _invoices.ListAsync(page, pageSize, cancellationToken);

    public async Task<InvoiceResponse> UpdateStatusAsync(
        Guid id,
        string status,
        CancellationToken cancellationToken)
    {
        if (!Enum.TryParse<InvoiceStatus>(status, ignoreCase: true, out var parsed))
        {
            throw new InvalidInvoiceException("Status must be Draft, Issued, Paid, Cancelled or Overdue.");
        }

        var updated = await _invoices.UpdateStatusAsync(id, parsed.ToString(), cancellationToken);
        return updated ?? throw new InvoiceNotFoundException(id);
    }

    public Task<bool> ExistsByNumberAsync(string invoiceNumber, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(invoiceNumber))
        {
            return Task.FromResult(false);
        }

        return _invoices.ExistsByNumberAsync(invoiceNumber.Trim(), cancellationToken);
    }

    private async Task<InvoiceResponse> PersistAsync(
        CreateInvoiceRequest request,
        Guid? createdBy,
        CancellationToken cancellationToken)
    {
        var client = await _clients.GetOrCreateAsync(
            request.ClientName,
            request.ClientDocument,
            request.ClientEmail,
            cancellationToken);

        var subtotal = ResolveSubtotal(request);
        var tax = request.Tax;
        var total = subtotal + tax;

        var invoice = InvoiceEntity.Issue(
            Guid.NewGuid(),
            client.Id,
            request.InvoiceNumber,
            request.IssueDate,
            request.DueDate,
            request.Currency,
            subtotal,
            tax,
            total,
            createdBy);

        return await _invoices.CreateAsync(
            invoice.Id,
            invoice.ClientId,
            invoice.InvoiceNumber,
            invoice.IssueDate,
            invoice.DueDate,
            invoice.Currency,
            invoice.Subtotal,
            invoice.Tax,
            invoice.Total,
            invoice.Status.ToString(),
            invoice.CreatedBy,
            SerializeLines(request.Lines),
            cancellationToken);
    }

    private static decimal ResolveSubtotal(CreateInvoiceRequest request)
    {
        if (request.Lines is not { Count: > 0 })
        {
            return request.Subtotal;
        }

        return request.Lines.Sum(line =>
            line.Amount > 0 ? line.Amount : line.Quantity * line.UnitPrice);
    }

    private static string? SerializeLines(IReadOnlyList<InvoiceLineDto>? lines)
    {
        if (lines is null || lines.Count == 0)
        {
            return null;
        }

        return JsonSerializer.Serialize(lines, JsonOptions);
    }

    private static string Fingerprint(CreateInvoiceRequest request)
    {
        var json = JsonSerializer.Serialize(request, JsonOptions);
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(json)));
    }

    private const int StatusCodes201 = 201;
}
