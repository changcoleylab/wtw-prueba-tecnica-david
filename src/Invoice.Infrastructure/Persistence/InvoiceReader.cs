using Invoice.Application.Invoices.Dtos;
using Microsoft.Data.SqlClient;
using System.Text.Json;

namespace Invoice.Infrastructure.Persistence;

internal static class InvoiceReader
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public static InvoiceResponse Map(SqlDataReader reader) => new()
    {
        Id = reader.GetGuid(reader.GetOrdinal("Id")),
        InvoiceNumber = reader.GetString(reader.GetOrdinal("InvoiceNumber")),
        IssueDate = DateOnly.FromDateTime(reader.GetDateTime(reader.GetOrdinal("IssueDate"))),
        DueDate = DateOnly.FromDateTime(reader.GetDateTime(reader.GetOrdinal("DueDate"))),
        Currency = reader.GetString(reader.GetOrdinal("Currency")).Trim(),
        Subtotal = reader.GetDecimal(reader.GetOrdinal("Subtotal")),
        Tax = reader.GetDecimal(reader.GetOrdinal("Tax")),
        Total = reader.GetDecimal(reader.GetOrdinal("Total")),
        Status = reader.GetString(reader.GetOrdinal("Status")),
        CreatedAt = reader.GetDateTime(reader.GetOrdinal("CreatedAt")),
        ClientId = reader.GetGuid(reader.GetOrdinal("ClientId")),
        ClientName = reader.GetString(reader.GetOrdinal("ClientName")),
        ClientDocument = reader.GetString(reader.GetOrdinal("ClientDocument")),
        ClientEmail = reader.IsDBNull(reader.GetOrdinal("ClientEmail"))
            ? null
            : reader.GetString(reader.GetOrdinal("ClientEmail")),
        Lines = ReadLines(reader)
    };

    public static async Task<IReadOnlyList<InvoiceResponse>> ReadAllAsync(
        SqlDataReader reader,
        CancellationToken cancellationToken)
    {
        var items = new List<InvoiceResponse>();
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(Map(reader));
        }

        return items;
    }

    private static IReadOnlyList<InvoiceLineDto> ReadLines(SqlDataReader reader)
    {
        int ordinal;
        try
        {
            ordinal = reader.GetOrdinal("LinesJson");
        }
        catch (IndexOutOfRangeException)
        {
            return [];
        }

        if (reader.IsDBNull(ordinal))
        {
            return [];
        }

        var json = reader.GetString(ordinal);
        if (string.IsNullOrWhiteSpace(json))
        {
            return [];
        }

        return JsonSerializer.Deserialize<List<InvoiceLineDto>>(json, JsonOptions) ?? [];
    }
}
