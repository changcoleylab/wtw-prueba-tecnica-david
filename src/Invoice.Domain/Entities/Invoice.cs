using Invoice.Domain.Enums;
using Invoice.Domain.Exceptions;

namespace Invoice.Domain.Entities;

public sealed class Invoice
{
    public Guid Id { get; init; }
    public Guid ClientId { get; init; }
    public required string InvoiceNumber { get; init; }
    public DateOnly IssueDate { get; init; }
    public DateOnly DueDate { get; init; }
    public required string Currency { get; init; }
    public decimal Subtotal { get; init; }
    public decimal Tax { get; init; }
    public decimal Total { get; init; }
    public InvoiceStatus Status { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
    public Guid? CreatedBy { get; init; }

    public static Invoice Issue(
        Guid id,
        Guid clientId,
        string invoiceNumber,
        DateOnly issueDate,
        DateOnly dueDate,
        string currency,
        decimal subtotal,
        decimal tax,
        decimal total,
        Guid? createdBy = null)
    {
        var invoice = new Invoice
        {
            Id = id,
            ClientId = clientId,
            InvoiceNumber = invoiceNumber,
            IssueDate = issueDate,
            DueDate = dueDate,
            Currency = CurrencyCodes.Normalize(currency),
            Subtotal = subtotal,
            Tax = tax,
            Total = total,
            Status = InvoiceStatus.Issued,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = createdBy
        };

        invoice.EnsureInvariants();
        return invoice;
    }

    public void EnsureInvariants()
    {
        if (string.IsNullOrWhiteSpace(InvoiceNumber))
        {
            throw new InvalidInvoiceException("Invoice number is required.");
        }

        if (DueDate < IssueDate)
        {
            throw new InvalidInvoiceException("Due date must be greater than or equal to issue date.");
        }

        if (Subtotal < 0 || Tax < 0 || Total < 0)
        {
            throw new InvalidInvoiceException("Monetary amounts cannot be negative.");
        }

        CurrencyCodes.Normalize(Currency);
    }
}
