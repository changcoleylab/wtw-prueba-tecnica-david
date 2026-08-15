using FluentValidation;
using Invoice.Application.Abstractions;
using Invoice.Application.Auth.Dtos;
using Invoice.Domain.Exceptions;

namespace Invoice.Application.Auth;

public sealed class AuthService : IAuthService
{
    public const string DemoPassword = "InvoiceHub!2026";
    public const string PendingHashMarker = "SEED_PENDING_PHASE_04";

    private readonly IAuthRepository _users;
    private readonly IUserPasswordHasher _passwords;
    private readonly IJwtTokenGenerator _tokens;
    private readonly IValidator<LoginRequest> _validator;

    public AuthService(
        IAuthRepository users,
        IUserPasswordHasher passwords,
        IJwtTokenGenerator tokens,
        IValidator<LoginRequest> validator)
    {
        _users = users;
        _passwords = passwords;
        _tokens = tokens;
        _validator = validator;
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        await _validator.ValidateAndThrowAsync(request, cancellationToken);

        var user = await _users.GetByEmailAsync(request.Email, cancellationToken);
        if (user is null)
        {
            throw new UnauthorizedException("Invalid email or password.");
        }

        if (user.PasswordHash == PendingHashMarker)
        {
            if (!string.Equals(request.Password, DemoPassword, StringComparison.Ordinal))
            {
                throw new UnauthorizedException("Invalid email or password.");
            }

            await _users.SetPasswordHashAsync(user.Id, _passwords.Hash(user, DemoPassword), cancellationToken);
        }
        else
        {
            var check = _passwords.Verify(user, request.Password);
            if (check == PasswordCheckResult.Failed)
            {
                throw new UnauthorizedException("Invalid email or password.");
            }

            if (check == PasswordCheckResult.SuccessRehashNeeded)
            {
                await _users.SetPasswordHashAsync(user.Id, _passwords.Hash(user, request.Password), cancellationToken);
            }
        }

        var token = _tokens.Create(user);
        return new LoginResponse
        {
            AccessToken = token.Value,
            DisplayName = user.DisplayName,
            Role = user.Role.ToString(),
            ExpiresAt = token.ExpiresAtUtc
        };
    }
}
