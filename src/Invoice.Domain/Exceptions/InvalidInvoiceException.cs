namespace Invoice.Domain.Exceptions;

public sealed class InvalidInvoiceException : DomainException
{
    public InvalidInvoiceException(string message) : base(message)
    {
    }
}
