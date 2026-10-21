using Microsoft.Extensions.Configuration;

namespace Inventario.Infrastructure.Options;

public class DatabaseOptions
{
    public const string SectionName = "ConnectionStrings";

    public string ConnectionString { get; set; } = string.Empty;

    public int MaxPoolSize { get; set; } = 100;

    public int ConnectionTimeoutSeconds { get; set; } = 15;
}


public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "InventarioAPI";

    public string Audience { get; set; } = "InventarioCliente";

    public string SigningKey { get; set; } = string.Empty;

    public int AccessTokenMinutes { get; set; } = 30;

    public int RefreshTokenDays { get; set; } = 7;
}
