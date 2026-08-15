using Invoice.Application.Abstractions;
using Invoice.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace Invoice.Infrastructure.Authentication;

public sealed class AspNetPasswordHasher : IUserPasswordHasher
{
    private readonly PasswordHasher<AppUser> _hasher = new();

    public string Hash(AppUser user, string password) => _hasher.HashPassword(user, password);

    public PasswordCheckResult Verify(AppUser user, string password) =>
        _hasher.VerifyHashedPassword(user, user.PasswordHash, password) switch
        {
            PasswordVerificationResult.Success => PasswordCheckResult.Success,
            PasswordVerificationResult.SuccessRehashNeeded => PasswordCheckResult.SuccessRehashNeeded,
            _ => PasswordCheckResult.Failed
        };
}
