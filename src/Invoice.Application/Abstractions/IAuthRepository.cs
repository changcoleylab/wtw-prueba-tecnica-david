using Invoice.Domain.Entities;

namespace Invoice.Application.Abstractions;

public interface IAuthRepository
{
    Task<AppUser?> GetByEmailAsync(string email, CancellationToken cancellationToken);

    Task SetPasswordHashAsync(Guid userId, string passwordHash, CancellationToken cancellationToken);
}
