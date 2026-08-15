namespace Invoice.Application.Auth.Dtos;

public sealed class LoginResponse
{
    public required string AccessToken { get; init; }
    public required string DisplayName { get; init; }
    public required string Role { get; init; }
    public required DateTime ExpiresAt { get; init; }
}
