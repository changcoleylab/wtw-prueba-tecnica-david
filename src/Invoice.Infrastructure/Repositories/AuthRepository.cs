using System.Data;
using Invoice.Application.Abstractions;
using Invoice.Domain.Entities;
using Invoice.Domain.Enums;
using Invoice.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace Invoice.Infrastructure.Repositories;

public sealed class AuthRepository : IAuthRepository
{
    private readonly SqlConnectionFactory _connections;

    public AuthRepository(SqlConnectionFactory connections)
    {
        _connections = connections;
    }

    public async Task<AppUser?> GetByEmailAsync(string email, CancellationToken cancellationToken)
    {
        await using var connection = _connections.Create();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedureNames.AuthGetUserByEmail, connection)
        {
            CommandType = CommandType.StoredProcedure
        };
        command.Parameters.AddWithValue("@Email", email);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return new AppUser
        {
            Id = reader.GetGuid(reader.GetOrdinal("Id")),
            Email = reader.GetString(reader.GetOrdinal("Email")),
            PasswordHash = reader.GetString(reader.GetOrdinal("PasswordHash")),
            DisplayName = reader.GetString(reader.GetOrdinal("DisplayName")),
            Role = Enum.Parse<UserRole>(reader.GetString(reader.GetOrdinal("Role")), ignoreCase: true),
            CreatedAt = reader.GetDateTime(reader.GetOrdinal("CreatedAt"))
        };
    }

    public async Task SetPasswordHashAsync(Guid userId, string passwordHash, CancellationToken cancellationToken)
    {
        await using var connection = _connections.Create();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(StoredProcedureNames.AuthSetPasswordHash, connection)
        {
            CommandType = CommandType.StoredProcedure
        };
        command.Parameters.AddWithValue("@Id", userId);
        command.Parameters.AddWithValue("@PasswordHash", passwordHash);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}
