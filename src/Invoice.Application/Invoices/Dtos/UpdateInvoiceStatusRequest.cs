namespace Invoice.Application.Invoices.Dtos;

public sealed record UpdateInvoiceStatusRequest
{
    public required string Status { get; init; }
}
