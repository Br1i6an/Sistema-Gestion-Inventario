namespace Inventario.Application.Interfaces;
public interface ITokenService
{
    (string Token, DateTime Expiracion) GenerarAccessToken(long usuarioId, string username, string rol);

    string GenerarRefreshToken();

    string HashearRefreshToken(string refreshToken);
}
