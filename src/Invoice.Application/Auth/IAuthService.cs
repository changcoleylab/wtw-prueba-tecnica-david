using Invoice.Application.Auth.Dtos;

namespace Invoice.Application.Auth;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken);
}
