namespace Inventario.Application.Interfaces;

public class AuthResult
{
    public bool Exitoso { get; set; }
    public string? AccessToken { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? Expiracion { get; set; }
    public UsuarioDto? Usuario { get; set; }
    public string? Error { get; set; }

    public static AuthResult Fail(string error) => new() { Exitoso = false, Error = error };
    public static AuthResult Ok(string accessToken, string refreshToken, DateTime expiracion, UsuarioDto usuario) =>
        new() { Exitoso = true, AccessToken = accessToken, RefreshToken = refreshToken, Expiracion = expiracion, Usuario = usuario };
}


public class UsuarioDto
{
    public long Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string NombreCompleto { get; set; } = string.Empty;
    public string Rol { get; set; } = string.Empty;
    public bool Activo { get; set; }
    public DateTime? UltimoAcceso { get; set; }
}

public interface IAuthService
{
    Task<AuthResult> LoginAsync(string username, string password, CancellationToken ct = default);
    Task<AuthResult> RefreshAsync(string refreshToken, CancellationToken ct = default);
    Task<bool> LogoutAsync(string refreshToken, CancellationToken ct = default);
    Task<UsuarioDto?> GetUsuarioActualAsync(long usuarioId, CancellationToken ct = default);
}
