using Dapper;
using Inventario.Infrastructure.Persistence;

namespace Inventario.Infrastructure.Repositories;

public class UsuarioFila
{
    public long Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string NombreCompleto { get; set; } = string.Empty;
    public string Rol { get; set; } = string.Empty;
    public bool Activo { get; set; }
    public DateTime? UltimoAcceso { get; set; }
    public DateTime CreadoEn { get; set; }
}

public interface IUsuarioRepository
{
    Task<UsuarioFila?> GetPorUsernameAsync(string username, CancellationToken ct = default);

    Task<UsuarioFila?> GetPorIdAsync(long id, CancellationToken ct = default);

    Task<bool> ExisteAsync(string username, CancellationToken ct = default);

    Task GuardarRefreshTokenAsync(long usuarioId, string tokenHash, DateTime expiraEn, CancellationToken ct = default);

    Task<long?> ConsumirRefreshTokenAsync(string tokenHash, CancellationToken ct = default);

    Task RevocarRefreshTokensAsync(long usuarioId, CancellationToken ct = default);

    Task RegistrarUltimoAccesoAsync(long usuarioId, CancellationToken ct = default);
}

public class UsuarioRepository : IUsuarioRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public UsuarioRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
        DapperConfiguration.Configurar();
    }

    public async Task<UsuarioFila?> GetPorUsernameAsync(string username, CancellationToken ct = default)
    {
        return await PostgresErrorTranslator.TranslateAsync(async () =>
        {
            using var connection = await _connectionFactory.CreateAsync(ct);

            return await connection.QuerySingleOrDefaultAsync<UsuarioFila>(new CommandDefinition(
                "SELECT * FROM inventario.sp_obtener_usuario_por_username(@p_username);",
                new { p_username = username },
                cancellationToken: ct));
        });
    }

    public async Task<UsuarioFila?> GetPorIdAsync(long id, CancellationToken ct = default)
    {
        using var connection = await _connectionFactory.CreateAsync(ct);

        return await connection.QuerySingleOrDefaultAsync<UsuarioFila>(new CommandDefinition(
            "SELECT u.id, u.username, u.email, u.password_hash, u.nombre_completo, " +
            "       u.rol::text AS rol, u.activo, u.ultimo_acceso, u.creado_en " +
            "FROM inventario.usuarios u WHERE u.id = @p_id;",
            new { p_id = id },
            cancellationToken: ct));
    }

    public async Task<bool> ExisteAsync(string username, CancellationToken ct = default)
    {
        using var connection = await _connectionFactory.CreateAsync(ct);

        var existe = await connection.ExecuteScalarAsync<bool>(new CommandDefinition(
            "SELECT EXISTS (SELECT 1 FROM inventario.usuarios WHERE username = LOWER(@p_username));",
            new { p_username = username },
            cancellationToken: ct));

        return existe;
    }

    public async Task GuardarRefreshTokenAsync(long usuarioId, string tokenHash, DateTime expiraEn, CancellationToken ct = default)
    {
        using var connection = await _connectionFactory.CreateAsync(ct);

        await connection.ExecuteAsync(new CommandDefinition(
            "SELECT inventario.sp_guardar_refresh_token(@p_usuario_id, @p_token_hash, @p_expira_en);",
            new { p_usuario_id = usuarioId, p_token_hash = tokenHash, p_expira_en = expiraEn },
            cancellationToken: ct));
    }

    public async Task<long?> ConsumirRefreshTokenAsync(string tokenHash, CancellationToken ct = default)
    {
        using var connection = await _connectionFactory.CreateAsync(ct);

        var token = await connection.QuerySingleOrDefaultAsync<RefreshTokenFila>(new CommandDefinition(
            "SELECT * FROM inventario.sp_consumir_refresh_token(@p_token_hash);",
            new { p_token_hash = tokenHash },
            cancellationToken: ct));

        return token?.UsuarioId;
    }

    public async Task RevocarRefreshTokensAsync(long usuarioId, CancellationToken ct = default)
    {
        using var connection = await _connectionFactory.CreateAsync(ct);

        await connection.ExecuteAsync(new CommandDefinition(
            "SELECT inventario.sp_revocar_refresh_tokens(@p_usuario_id);",
            new { p_usuario_id = usuarioId },
            cancellationToken: ct));
    }

    public async Task RegistrarUltimoAccesoAsync(long usuarioId, CancellationToken ct = default)
    {
        using var connection = await _connectionFactory.CreateAsync(ct);

        await connection.ExecuteAsync(new CommandDefinition(
            "SELECT inventario.sp_registrar_ultimo_acceso(@p_usuario_id);",
            new { p_usuario_id = usuarioId },
            cancellationToken: ct));
    }

    private class RefreshTokenFila
    {
        public long Id { get; set; }
        public long UsuarioId { get; set; }
        public DateTime ExpiraEn { get; set; }
        public bool Revocado { get; set; }
    }
}
