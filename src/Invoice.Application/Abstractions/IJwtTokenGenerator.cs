using Invoice.Domain.Entities;

namespace Invoice.Application.Abstractions;

public sealed record JwtToken(string Value, DateTime ExpiresAtUtc);

public interface IJwtTokenGenerator
{
    JwtToken Create(AppUser user);
}
