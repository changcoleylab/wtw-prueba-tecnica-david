namespace Invoice.Application.Abstractions;

public sealed record IdempotencyRecord(
    string Key,
    string RequestHash,
    int ResponseStatus,
    string ResponseBody);

public sealed record IdempotencyReservation(bool Inserted, IdempotencyRecord Record);

public interface IIdempotencyStore
{
    Task<IdempotencyReservation> ReserveAsync(
        string key,
        string requestHash,
        CancellationToken cancellationToken);

    Task CompleteAsync(string key, int responseStatus, string responseBody, CancellationToken cancellationToken);

    Task AbandonAsync(string key, CancellationToken cancellationToken);
}
