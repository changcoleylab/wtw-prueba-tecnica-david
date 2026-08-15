namespace Invoice.Domain.Entities;

public sealed class Client
{
    public Guid Id { get; init; }
    public required string Name { get; init; }
    public required string DocumentNumber { get; init; }
    public string? Email { get; init; }
    public DateTime CreatedAt { get; init; }
}
