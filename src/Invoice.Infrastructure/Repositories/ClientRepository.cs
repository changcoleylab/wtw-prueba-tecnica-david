using System.Data;
using Invoice.Application.Abstractions;
using Invoice.Domain.Entities;
using Invoice.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace Invoice.Infrastructure.Repositories;

public sealed class ClientRepository : IClientRepository
{
    private readonly SqlConnectionFactory _connections;

    public ClientRepository(SqlConnectionFactory connections)
    {
        _connections = connections;
    }

    public async Task<Client> GetOrCreateAsync(
        string name,
        string documentNumber,
        string? email,
        CancellationToken cancellationToken)
    {
        await using var connection = _connections.Create();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedureNames.ClientGetOrCreate, connection)
        {
            CommandType = CommandType.StoredProcedure
        };
        command.Parameters.AddWithValue("@Name", name);
        command.Parameters.AddWithValue("@DocumentNumber", documentNumber);
        command.Parameters.AddWithValue("@Email", string.IsNullOrWhiteSpace(email) ? DBNull.Value : email);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new InvalidOperationException("Client get-or-create did not return a row.");
        }

        var emailOrdinal = reader.GetOrdinal("Email");
        return new Client
        {
            Id = reader.GetGuid(reader.GetOrdinal("Id")),
            Name = reader.GetString(reader.GetOrdinal("Name")),
            DocumentNumber = reader.GetString(reader.GetOrdinal("DocumentNumber")),
            Email = reader.IsDBNull(emailOrdinal) ? null : reader.GetString(emailOrdinal),
            CreatedAt = reader.GetDateTime(reader.GetOrdinal("CreatedAt"))
        };
    }
}
