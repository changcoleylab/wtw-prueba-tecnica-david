namespace Invoice.Application.Invoices.Dtos;

public sealed class InvoiceResponse
{
    public required Guid Id { get; init; }
    public required string InvoiceNumber { get; init; }
    public required DateOnly IssueDate { get; init; }
    public required DateOnly DueDate { get; init; }
    public required string Currency { get; init; }
    public required decimal Subtotal { get; init; }
    public required decimal Tax { get; init; }
    public required decimal Total { get; init; }
    public required string Status { get; init; }
    public required DateTime CreatedAt { get; init; }
    public required Guid ClientId { get; init; }
    public required string ClientName { get; init; }
    public required string ClientDocument { get; init; }
    public string? ClientEmail { get; init; }
    public IReadOnlyList<InvoiceLineDto> Lines { get; init; } = [];
}
