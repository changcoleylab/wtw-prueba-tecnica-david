namespace Invoice.Infrastructure.Authentication;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Key { get; set; } = string.Empty;
    public string Issuer { get; set; } = "InvoiceHub";
    public string Audience { get; set; } = "InvoiceHub";
    public int ExpirationMinutes { get; set; } = 120;
}
