using System.Data;
using Inventario.Infrastructure.Options;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Npgsql;

namespace Inventario.Infrastructure.Persistence;

public interface IDbConnectionFactory
{
    Task<IDbConnection> CreateAsync(CancellationToken ct = default);
}

public class NpgsqlConnectionFactory : IDbConnectionFactory, IDisposable
{
    private readonly NpgsqlDataSource _dataSource;

    public NpgsqlConnectionFactory(IOptions<DatabaseOptions> options, IConfiguration configuration)
    {
        var opts = options.Value;

        var connectionString = opts.ConnectionString;
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new InvalidOperationException(
                    "No se encontro la cadena de conexion. Configure 'ConnectionStrings:DefaultConnection' en appsettings.json.");
        }

        var builder = new NpgsqlConnectionStringBuilder(connectionString)
        {
            MaxPoolSize = opts.MaxPoolSize,
            Timeout = opts.ConnectionTimeoutSeconds,
            IncludeErrorDetail = true
        };

        _dataSource = new NpgsqlDataSourceBuilder(builder.ConnectionString).Build();
    }

    public async Task<IDbConnection> CreateAsync(CancellationToken ct = default)
    {
        var connection = await _dataSource.OpenConnectionAsync(ct);
        return connection;
    }

    public void Dispose() => _dataSource.Dispose();
}
