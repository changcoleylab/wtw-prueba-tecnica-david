using Invoice.Domain.Enums;

namespace Invoice.Domain.Entities;

public sealed class AppUser
{
    public Guid Id { get; init; }
    public required string Email { get; init; }
    public required string PasswordHash { get; init; }
    public required string DisplayName { get; init; }
    public UserRole Role { get; init; }
    public DateTime CreatedAt { get; init; }
}
