using System.Text.RegularExpressions;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Invoice.Infrastructure.Persistence;

/// <summary>
/// Aplica database/*.sql cuando SQL está vacío. No bloquea el arranque HTTP.
/// 01-tables.sql hace DROP: solo corre si InvoiceHub no tiene dbo.AppUser.
/// </summary>
public sealed class SchemaBootstrapper : IHostedService
{
    private static readonly string[] CreateOrder =
    [
        "01-tables.sql",
        "02-indexes.sql",
        "05-invoice-lines.sql",
        "03-stored-procedures.sql",
        "04-seed.sql"
    ];

    private readonly SqlConnectionFactory _factory;
    private readonly IHostEnvironment _environment;
    private readonly ILogger<SchemaBootstrapper> _logger;

    public SchemaBootstrapper(
        SqlConnectionFactory factory,
        IHostEnvironment environment,
        ILogger<SchemaBootstrapper> logger)
    {
        _factory = factory;
        _environment = environment;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        if (_environment.IsEnvironment("Testing"))
        {
            return Task.CompletedTask;
        }

        _ = Task.Run(() => RunAsync(cancellationToken), CancellationToken.None);
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private async Task RunAsync(CancellationToken stoppingToken)
    {
        for (var attempt = 1; attempt <= 36; attempt++)
        {
            try
            {
                await ApplyIfNeededAsync(stoppingToken);
                return;
            }
            catch (Exception exception) when (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogWarning(
                    exception,
                    "Schema bootstrap attempt {Attempt}/36: SQL not ready yet",
                    attempt);
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
        }

        _logger.LogError("Schema bootstrap gave up; InvoiceHub may be empty until SQL accepts connections.");
    }

    private async Task ApplyIfNeededAsync(CancellationToken cancellationToken)
    {
        await using var master = _factory.CreateMaster();
        await master.OpenAsync(cancellationToken);
        await GetAppLockAsync(master, cancellationToken);

        if (!await DatabaseExistsAsync(master, cancellationToken))
        {
            _logger.LogInformation("Creating database InvoiceHub.");
            await ApplyScriptAsync("00-create-database.sql", useMaster: true, cancellationToken);
            await WaitUntilInvoiceHubOnlineAsync(master, cancellationToken);
        }
        else
        {
            await WaitUntilInvoiceHubOnlineAsync(master, cancellationToken);
        }

        if (await AppUserExistsAsync(master, cancellationToken))
        {
            _logger.LogInformation("InvoiceHub schema already present; applying seed/SPs if missing.");
            await ApplyScriptAsync("05-invoice-lines.sql", useMaster: false, cancellationToken);
            await ApplyScriptAsync("03-stored-procedures.sql", useMaster: false, cancellationToken);
            await ApplyScriptAsync("04-seed.sql", useMaster: false, cancellationToken);
            return;
        }

        _logger.LogInformation("InvoiceHub is empty; applying schema and seed.");
        foreach (var name in CreateOrder)
        {
            if (name == "01-tables.sql" && await AppUserExistsAsync(master, cancellationToken))
            {
                _logger.LogInformation("AppUser appeared; skipping 01-tables.sql (avoids DROP).");
                continue;
            }

            await ApplyScriptAsync(name, useMaster: false, cancellationToken);
        }

        _logger.LogInformation("InvoiceHub schema and seed applied.");
    }

    private async Task ApplyScriptAsync(string name, bool useMaster, CancellationToken cancellationToken)
    {
        var sql = SchemaScripts.Read(name);
        _logger.LogInformation("Applying {Script}", name);

        await using var connection = useMaster ? _factory.CreateMaster() : _factory.Create();
        await connection.OpenAsync(cancellationToken);

        foreach (var batch in SchemaScripts.SplitBatches(sql))
        {
            await using var command = connection.CreateCommand();
            command.CommandText = batch;
            command.CommandTimeout = 120;
            await command.ExecuteNonQueryAsync(cancellationToken);
        }
    }

    private async Task WaitUntilInvoiceHubOnlineAsync(SqlConnection master, CancellationToken cancellationToken)
    {
        for (var attempt = 1; attempt <= 30; attempt++)
        {
            var state = await StringAsync(master, """
                SELECT ISNULL(state_desc, N'MISSING')
                FROM sys.databases
                WHERE name = N'InvoiceHub'
                """, cancellationToken);

            if (string.Equals(state, "ONLINE", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    await using var invoice = _factory.Create();
                    await invoice.OpenAsync(cancellationToken);
                    return;
                }
                catch (SqlException) when (attempt < 30)
                {
                    // still recovering
                }
            }

            _logger.LogInformation("Waiting for InvoiceHub ONLINE ({Attempt}/30), state={State}", attempt, state);
            await Task.Delay(TimeSpan.FromSeconds(2), cancellationToken);
        }

        throw new InvalidOperationException("InvoiceHub did not become ONLINE in time.");
    }

    private static async Task GetAppLockAsync(SqlConnection master, CancellationToken cancellationToken)
    {
        await using var command = master.CreateCommand();
        command.CommandText = """
            DECLARE @result INT;
            EXEC @result = sys.sp_getapplock
                @Resource = N'InvoiceHub.schema',
                @LockMode = N'Exclusive',
                @LockOwner = N'Session',
                @LockTimeout = 120000;
            IF @result < 0
                THROW 50000, 'Could not obtain InvoiceHub schema lock.', 1;
            """;
        command.CommandTimeout = 130;
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task<bool> DatabaseExistsAsync(SqlConnection master, CancellationToken cancellationToken) =>
        await ScalarAsync(master, "SELECT CASE WHEN DB_ID(N'InvoiceHub') IS NULL THEN 0 ELSE 1 END", cancellationToken) == 1;

    private static async Task<bool> AppUserExistsAsync(SqlConnection master, CancellationToken cancellationToken) =>
        await ScalarAsync(master, """
            SELECT CASE WHEN EXISTS (
                SELECT 1 FROM InvoiceHub.sys.tables WHERE name = N'AppUser'
            ) THEN 1 ELSE 0 END
            """, cancellationToken) == 1;

    private static async Task<int> ScalarAsync(SqlConnection connection, string sql, CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        var value = await command.ExecuteScalarAsync(cancellationToken);
        return Convert.ToInt32(value);
    }

    private static async Task<string> StringAsync(SqlConnection connection, string sql, CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        var value = await command.ExecuteScalarAsync(cancellationToken);
        return value?.ToString() ?? "MISSING";
    }
}

internal static class SchemaScripts
{
    private static readonly Regex GoSplitter = new(
        @"^\s*GO\s*$",
        RegexOptions.Multiline | RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex UseOnly = new(
        @"^USE\s+\[?\w+\]?\s*;?\s*$",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public static string Read(string fileName)
    {
        var resource = $"Invoice.Infrastructure.Schema.{fileName}";
        var assembly = typeof(SchemaScripts).Assembly;
        using var stream = assembly.GetManifestResourceStream(resource)
            ?? throw new InvalidOperationException($"Embedded schema script '{resource}' was not found.");
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }

    public static IEnumerable<string> SplitBatches(string script)
    {
        foreach (var batch in GoSplitter.Split(script))
        {
            var trimmed = batch.Trim();
            if (trimmed.Length == 0 || UseOnly.IsMatch(trimmed))
            {
                continue;
            }

            yield return trimmed;
        }
    }
}
