using Invoice.Domain.Exceptions;
using Microsoft.Data.SqlClient;

namespace Invoice.Infrastructure.Persistence;

internal static class SqlExceptionMapper
{
    public static bool IsUniqueViolation(SqlException exception) =>
        exception.Number is 2627 or 2601;

    public static Exception ToDomain(SqlException exception, string invoiceNumber) =>
        exception.Number switch
        {
            2627 or 2601 => new DuplicateInvoiceException(invoiceNumber),
            547 => new InvalidInvoiceException("The requested change is not valid."),
            _ => exception
        };
}
