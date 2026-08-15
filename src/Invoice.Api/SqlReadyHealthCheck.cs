using Invoice.Infrastructure.Persistence;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Invoice.Api;

public sealed class SqlReadyHealthCheck : IHealthCheck
{
    private readonly SqlConnectionFactory _factory;

    public SqlReadyHealthCheck(SqlConnectionFactory factory)
    {
        _factory = factory;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await using var connection = _factory.Create();
            await connection.OpenAsync(cancellationToken);
            return HealthCheckResult.Healthy("SQL Server reachable");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("SQL Server unreachable", ex);
        }
    }
}
