using Invoice.Application.Common;
using Invoice.Application.Invoices.Dtos;

namespace Invoice.Application.Invoices;

public interface IInvoiceService
{
    Task<InvoiceResponse> CreateAsync(
        CreateInvoiceRequest request,
        Guid? createdBy,
        string? idempotencyKey,
        CancellationToken cancellationToken);

    Task<InvoiceResponse> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    Task<IReadOnlyList<InvoiceResponse>> SearchAsync(string clientName, CancellationToken cancellationToken);

    Task<PagedResult<InvoiceResponse>> ListAsync(int page, int pageSize, CancellationToken cancellationToken);

    Task<InvoiceResponse> UpdateStatusAsync(Guid id, string status, CancellationToken cancellationToken);

    Task<bool> ExistsByNumberAsync(string invoiceNumber, CancellationToken cancellationToken);
}
