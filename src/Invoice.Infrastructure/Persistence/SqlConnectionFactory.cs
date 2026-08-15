using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;

namespace Invoice.Infrastructure.Persistence;

public sealed class SqlConnectionFactory
{
    private readonly string _connectionString;

    public SqlConnectionFactory(IConfiguration configuration)
    {
        var builder = new SqlConnectionStringBuilder(
            configuration.GetConnectionString("InvoiceDb")
            ?? throw new InvalidOperationException("Connection string 'InvoiceDb' is not configured."))
        {
            ConnectTimeout = 10
        };
        _connectionString = builder.ConnectionString;
    }

    public SqlConnection Create() => new(_connectionString);

    public SqlConnection CreateMaster()
    {
        var builder = new SqlConnectionStringBuilder(_connectionString)
        {
            InitialCatalog = "master",
            ConnectTimeout = 10
        };
        return new SqlConnection(builder.ConnectionString);
    }
}
