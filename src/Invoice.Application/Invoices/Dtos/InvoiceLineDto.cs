namespace Invoice.Application.Invoices.Dtos;

public sealed class InvoiceLineDto
{
    public required string Description { get; init; }
    public decimal Quantity { get; init; } = 1;
    public decimal UnitPrice { get; init; }
    public decimal Amount { get; init; }
}
