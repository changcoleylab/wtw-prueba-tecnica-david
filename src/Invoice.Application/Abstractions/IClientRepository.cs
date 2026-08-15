using Invoice.Domain.Entities;

namespace Invoice.Application.Abstractions;

public interface IClientRepository
{
    Task<Client> GetOrCreateAsync(
        string name,
        string documentNumber,
        string? email,
        CancellationToken cancellationToken);
}
