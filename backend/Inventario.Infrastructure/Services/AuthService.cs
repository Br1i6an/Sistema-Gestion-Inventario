using Inventario.Application.Interfaces;
using Inventario.Infrastructure.Options;
using Inventario.Infrastructure.Repositories;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Inventario.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly IUsuarioRepository _usuarioRepository;
    private readonly ITokenService _tokenService;
    private readonly IPasswordHasher _passwordHasher;
    private readonly JwtOptions _jwtOptions;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IUsuarioRepository usuarioRepository,
        ITokenService tokenService,
        IPasswordHasher passwordHasher,
        IOptions<JwtOptions> jwtOptions,
        ILogger<AuthService> logger)
    {
        _usuarioRepository = usuarioRepository;
        _tokenService = tokenService;
        _passwordHasher = passwordHasher;
        _jwtOptions = jwtOptions.Value;
        _logger = logger;
    }

    public async Task<AuthResult> LoginAsync(string username, string password, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrEmpty(password))
        {
            return AuthResult.Fail("Usuario y contrasena son obligatorios.");
        }

        var usuario = await _usuarioRepository.GetPorUsernameAsync(username.Trim(), ct);


        const string credencialesInvalidas = "Usuario o contrasena incorrectos.";

        if (usuario is null)
        {
            _logger.LogWarning("Intento de login con usuario inexistente: {Username}", username);
            return AuthResult.Fail(credencialesInvalidas);
        }

        if (!usuario.Activo)
        {
            _logger.LogWarning("Intento de login de usuario inactivo: {Username}", username);
            return AuthResult.Fail("El usuario esta inactivo. Contacte al administrador.");
        }

        if (!_passwordHasher.Verify(password, usuario.PasswordHash))
        {
            _logger.LogWarning("Contrasena incorrecta para el usuario {Username}", username);
            return AuthResult.Fail(credencialesInvalidas);
        }

        await _usuarioRepository.RegistrarUltimoAccesoAsync(usuario.Id, ct);

        var (accessToken, expiracion) = _tokenService.GenerarAccessToken(usuario.Id, usuario.Username, usuario.Rol);
        var refreshToken = _tokenService.GenerarRefreshToken();

        await _usuarioRepository.GuardarRefreshTokenAsync(
            usuario.Id,
            _tokenService.HashearRefreshToken(refreshToken),
            DateTime.UtcNow.AddDays(_jwtOptions.RefreshTokenDays),
            ct);

        return AuthResult.Ok(accessToken, refreshToken, expiracion, AUsuarioDto(usuario));
    }

    public async Task<AuthResult> RefreshAsync(string refreshToken, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return AuthResult.Fail("El refresh token es obligatorio.");
        }

        var tokenHash = _tokenService.HashearRefreshToken(refreshToken);

        var usuarioId = await _usuarioRepository.ConsumirRefreshTokenAsync(tokenHash, ct);

        if (usuarioId is null)
        {
            _logger.LogWarning("Refresh token invalido, expirado o ya utilizado.");
            return AuthResult.Fail("El refresh token es invalido o ha expirado.");
        }

        var usuario = await _usuarioRepository.GetPorUsernameAsync(
            (await _usuarioRepository.GetPorIdAsync(usuarioId.Value, ct))?.Username ?? string.Empty, ct);

        if (usuario is null || !usuario.Activo)
        {
            return AuthResult.Fail("El usuario ya no esta activo.");
        }

        var (accessToken, expiracion) = _tokenService.GenerarAccessToken(usuario.Id, usuario.Username, usuario.Rol);
        var nuevoRefreshToken = _tokenService.GenerarRefreshToken();

        await _usuarioRepository.GuardarRefreshTokenAsync(
            usuario.Id,
            _tokenService.HashearRefreshToken(nuevoRefreshToken),
            DateTime.UtcNow.AddDays(_jwtOptions.RefreshTokenDays),
            ct);

        return AuthResult.Ok(accessToken, nuevoRefreshToken, expiracion, AUsuarioDto(usuario));
    }

    public async Task<bool> LogoutAsync(string refreshToken, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return true;
        }

        var tokenHash = _tokenService.HashearRefreshToken(refreshToken);
        var usuarioId = await _usuarioRepository.ConsumirRefreshTokenAsync(tokenHash, ct);

        if (usuarioId is null)
        {
            return true;
        }

        await _usuarioRepository.RevocarRefreshTokensAsync(usuarioId.Value, ct);
        return true;
    }

    public async Task<UsuarioDto?> GetUsuarioActualAsync(long usuarioId, CancellationToken ct = default)
    {
        var usuario = await _usuarioRepository.GetPorIdAsync(usuarioId, ct);
        return usuario is null ? null : AUsuarioDto(usuario);
    }

    private static UsuarioDto AUsuarioDto(UsuarioFila usuario) => new()
    {
        Id = usuario.Id,
        Username = usuario.Username,
        Email = usuario.Email,
        NombreCompleto = usuario.NombreCompleto,
        Rol = usuario.Rol,
        Activo = usuario.Activo,
        UltimoAcceso = usuario.UltimoAcceso
    };
}
