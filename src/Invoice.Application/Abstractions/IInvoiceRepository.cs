using Invoice.Application.Common;
using Invoice.Application.Invoices.Dtos;

namespace Invoice.Application.Abstractions;

public interface IInvoiceRepository
{
    Task<InvoiceResponse> CreateAsync(
        Guid id,
        Guid clientId,
        string invoiceNumber,
        DateOnly issueDate,
        DateOnly dueDate,
        string currency,
        decimal subtotal,
        decimal tax,
        decimal total,
        string status,
        Guid? createdBy,
        string? linesJson,
        CancellationToken cancellationToken);

    Task<InvoiceResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    Task<IReadOnlyList<InvoiceResponse>> SearchByClientNameAsync(
        string clientName,
        CancellationToken cancellationToken);

    Task<PagedResult<InvoiceResponse>> ListAsync(int page, int pageSize, CancellationToken cancellationToken);

    Task<InvoiceResponse?> UpdateStatusAsync(Guid id, string status, CancellationToken cancellationToken);

    Task<bool> ExistsByNumberAsync(string invoiceNumber, CancellationToken cancellationToken);
}
