using System.Data;
using Invoice.Application.Abstractions;
using Invoice.Application.Common;
using Invoice.Application.Invoices.Dtos;
using Invoice.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace Invoice.Infrastructure.Repositories;

public sealed class InvoiceRepository : IInvoiceRepository
{
    private readonly SqlConnectionFactory _connections;

    public InvoiceRepository(SqlConnectionFactory connections)
    {
        _connections = connections;
    }

    public async Task<InvoiceResponse> CreateAsync(
        Guid id,
        Guid clientId,
        string invoiceNumber,
        DateOnly issueDate,
        DateOnly dueDate,
        string currency,
        decimal subtotal,
        decimal tax,
        decimal total,
        string status,
        Guid? createdBy,
        string? linesJson,
        CancellationToken cancellationToken)
    {
        await using var connection = _connections.Create();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedureNames.InvoiceCreate, connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.Parameters.AddWithValue("@Id", id);
        command.Parameters.AddWithValue("@ClientId", clientId);
        command.Parameters.AddWithValue("@InvoiceNumber", invoiceNumber);
        command.Parameters.Add("@IssueDate", SqlDbType.Date).Value = issueDate.ToDateTime(TimeOnly.MinValue);
        command.Parameters.Add("@DueDate", SqlDbType.Date).Value = dueDate.ToDateTime(TimeOnly.MinValue);
        command.Parameters.AddWithValue("@Currency", currency);
        command.Parameters.AddWithValue("@Subtotal", subtotal);
        command.Parameters.AddWithValue("@Tax", tax);
        command.Parameters.AddWithValue("@Total", total);
        command.Parameters.AddWithValue("@Status", status);
        command.Parameters.AddWithValue("@CreatedBy", createdBy is null ? DBNull.Value : createdBy);
        command.Parameters.AddWithValue("@LinesJson", string.IsNullOrWhiteSpace(linesJson) ? DBNull.Value : linesJson);

        try
        {
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
            {
                throw new InvalidOperationException("Invoice create did not return a row.");
            }

            return InvoiceReader.Map(reader);
        }
        catch (SqlException ex)
        {
            throw SqlExceptionMapper.ToDomain(ex, invoiceNumber);
        }
    }

    public async Task<InvoiceResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        await using var connection = _connections.Create();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedureNames.InvoiceGetById, connection)
        {
            CommandType = CommandType.StoredProcedure
        };
        command.Parameters.AddWithValue("@Id", id);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return InvoiceReader.Map(reader);
    }

    public async Task<IReadOnlyList<InvoiceResponse>> SearchByClientNameAsync(
        string clientName,
        CancellationToken cancellationToken)
    {
        await using var connection = _connections.Create();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedureNames.InvoiceSearch, connection)
        {
            CommandType = CommandType.StoredProcedure
        };
        command.Parameters.AddWithValue("@ClientName", clientName);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await InvoiceReader.ReadAllAsync(reader, cancellationToken);
    }

    public async Task<InvoiceResponse?> UpdateStatusAsync(
        Guid id,
        string status,
        CancellationToken cancellationToken)
    {
        await using var connection = _connections.Create();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedureNames.InvoiceUpdateStatus, connection)
        {
            CommandType = CommandType.StoredProcedure
        };
        command.Parameters.AddWithValue("@Id", id);
        command.Parameters.AddWithValue("@Status", status);

        try
        {
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
            {
                return null;
            }

            return InvoiceReader.Map(reader);
        }
        catch (SqlException ex)
        {
            throw SqlExceptionMapper.ToDomain(ex, status);
        }
    }

    public async Task<PagedResult<InvoiceResponse>> ListAsync(
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        await using var connection = _connections.Create();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedureNames.InvoiceList, connection)
        {
            CommandType = CommandType.StoredProcedure
        };
        command.Parameters.AddWithValue("@Page", page);
        command.Parameters.AddWithValue("@PageSize", pageSize);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var total = 0;
        if (await reader.ReadAsync(cancellationToken))
        {
            total = reader.GetInt32(reader.GetOrdinal("TotalCount"));
        }

        await reader.NextResultAsync(cancellationToken);
        var items = await InvoiceReader.ReadAllAsync(reader, cancellationToken);
        return new PagedResult<InvoiceResponse>(items, total, page, pageSize);
    }

    public async Task<bool> ExistsByNumberAsync(string invoiceNumber, CancellationToken cancellationToken)
    {
        await using var connection = _connections.Create();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedureNames.InvoiceExistsByNumber, connection)
        {
            CommandType = CommandType.StoredProcedure
        };
        command.Parameters.AddWithValue("@InvoiceNumber", invoiceNumber);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is not null and not DBNull && Convert.ToInt32(result) == 1;
    }
}
