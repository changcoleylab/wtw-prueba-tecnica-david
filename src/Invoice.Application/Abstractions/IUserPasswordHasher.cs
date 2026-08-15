using Invoice.Domain.Entities;

namespace Invoice.Application.Abstractions;

public enum PasswordCheckResult
{
    Failed = 0,
    Success = 1,
    SuccessRehashNeeded = 2
}

public interface IUserPasswordHasher
{
    string Hash(AppUser user, string password);

    PasswordCheckResult Verify(AppUser user, string password);
}
