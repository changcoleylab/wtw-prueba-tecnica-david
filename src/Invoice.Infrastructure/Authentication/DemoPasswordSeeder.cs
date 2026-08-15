using Invoice.Application.Abstractions;
using Invoice.Application.Auth;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Invoice.Infrastructure.Authentication;

public sealed class DemoPasswordSeeder : IHostedService
{
    private static readonly string[] DemoEmails =
    [
        "analyst@invoicehub.local",
        "admin@invoicehub.local"
    ];

    private readonly IServiceScopeFactory _scopes;
    private readonly ILogger<DemoPasswordSeeder> _logger;

    public DemoPasswordSeeder(IServiceScopeFactory scopes, ILogger<DemoPasswordSeeder> logger)
    {
        _scopes = scopes;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        for (var attempt = 1; attempt <= 24; attempt++)
        {
            try
            {
                if (await SeedOnceAsync(cancellationToken))
                {
                    return;
                }
            }
            catch (Exception exception)
            {
                _logger.LogWarning(exception, "Demo password seed attempt {Attempt} failed", attempt);
            }

            await Task.Delay(TimeSpan.FromSeconds(5), cancellationToken);
        }

        _logger.LogWarning("Demo users were not ready; the first successful login will hash the password.");
    }

    private async Task<bool> SeedOnceAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopes.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<IAuthRepository>();
        var hasher = scope.ServiceProvider.GetRequiredService<IUserPasswordHasher>();
        var seeded = 0;
        var missing = 0;

        foreach (var email in DemoEmails)
        {
            var user = await users.GetByEmailAsync(email, cancellationToken);
            if (user is null)
            {
                missing++;
                continue;
            }

            if (user.PasswordHash != AuthService.PendingHashMarker)
            {
                continue;
            }

            var hash = hasher.Hash(user, AuthService.DemoPassword);
            await users.SetPasswordHashAsync(user.Id, hash, cancellationToken);
            _logger.LogInformation("Seeded password hash for {Email}", email);
            seeded++;
        }

        return missing == 0 || seeded > 0;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
