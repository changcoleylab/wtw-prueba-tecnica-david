using System.Data;
using Invoice.Application.Abstractions;
using Invoice.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace Invoice.Infrastructure.Repositories;

public sealed class IdempotencyStore : IIdempotencyStore
{
    private readonly SqlConnectionFactory _connections;

    public IdempotencyStore(SqlConnectionFactory connections)
    {
        _connections = connections;
    }

    public async Task<IdempotencyReservation> ReserveAsync(
        string key,
        string requestHash,
        CancellationToken cancellationToken)
    {
        await using var connection = _connections.Create();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedureNames.IdempotencyReserve, connection)
        {
            CommandType = CommandType.StoredProcedure
        };
        command.Parameters.AddWithValue("@IdempotencyKey", key);
        command.Parameters.AddWithValue("@RequestHash", requestHash);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new InvalidOperationException("Idempotency reserve did not return a row.");
        }

        var inserted = reader.GetBoolean(reader.GetOrdinal("Inserted"));
        var record = new IdempotencyRecord(
            reader.GetString(reader.GetOrdinal("IdempotencyKey")),
            reader.GetString(reader.GetOrdinal("RequestHash")).Trim(),
            reader.GetInt32(reader.GetOrdinal("ResponseStatus")),
            reader.GetString(reader.GetOrdinal("ResponseBody")));

        return new IdempotencyReservation(inserted, record);
    }

    public async Task CompleteAsync(
        string key,
        int responseStatus,
        string responseBody,
        CancellationToken cancellationToken)
    {
        await using var connection = _connections.Create();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedureNames.IdempotencyComplete, connection)
        {
            CommandType = CommandType.StoredProcedure
        };
        command.Parameters.AddWithValue("@IdempotencyKey", key);
        command.Parameters.AddWithValue("@ResponseStatus", responseStatus);
        command.Parameters.AddWithValue("@ResponseBody", responseBody);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task AbandonAsync(string key, CancellationToken cancellationToken)
    {
        await using var connection = _connections.Create();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedureNames.IdempotencyAbandon, connection)
        {
            CommandType = CommandType.StoredProcedure
        };
        command.Parameters.AddWithValue("@IdempotencyKey", key);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}
