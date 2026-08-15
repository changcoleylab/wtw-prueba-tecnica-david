namespace Invoice.Domain;

public static class CurrencyCodes
{
    public static readonly IReadOnlySet<string> Allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "COP", "USD", "EUR"
    };

    public static string Normalize(string currency)
    {
        if (string.IsNullOrWhiteSpace(currency) || !Allowed.Contains(currency))
        {
            throw new Exceptions.InvalidInvoiceException("Currency must be COP, USD or EUR.");
        }

        return currency.ToUpperInvariant();
    }
}
