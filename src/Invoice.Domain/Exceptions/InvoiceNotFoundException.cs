namespace Invoice.Domain.Exceptions;

public sealed class InvoiceNotFoundException : DomainException
{
    public Guid InvoiceId { get; }

    public InvoiceNotFoundException(Guid invoiceId)
        : base($"Invoice '{invoiceId}' was not found.")
    {
        InvoiceId = invoiceId;
    }
}
