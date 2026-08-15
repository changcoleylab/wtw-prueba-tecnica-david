namespace Invoice.Domain.Exceptions;

public sealed class DuplicateInvoiceException : DomainException
{
    public string InvoiceNumber { get; }

    public DuplicateInvoiceException(string invoiceNumber)
        : base($"Invoice number '{invoiceNumber}' already exists.")
    {
        InvoiceNumber = invoiceNumber;
    }
}
