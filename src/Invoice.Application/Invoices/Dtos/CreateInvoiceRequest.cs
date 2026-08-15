namespace Invoice.Application.Invoices.Dtos;

public sealed record CreateInvoiceRequest
{
    public required string ClientName { get; init; }
    public required string ClientDocument { get; init; }
    public string? ClientEmail { get; init; }
    public required string InvoiceNumber { get; init; }
    public DateOnly IssueDate { get; init; }
    public DateOnly DueDate { get; init; }
    public required string Currency { get; init; }
    public decimal Subtotal { get; init; }
    public decimal Tax { get; init; }
    public decimal Total { get; init; }
    public IReadOnlyList<InvoiceLineDto>? Lines { get; init; }
}
