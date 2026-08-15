namespace Invoice.Domain.Exceptions;

public sealed class UnauthorizedException : DomainException
{
    public UnauthorizedException(string message = "Authentication required.") : base(message)
    {
    }
}
