using System.ComponentModel.DataAnnotations;
using Inventario.Application.DTOs;
using Inventario.Application.Interfaces;

namespace Inventario.Application.DTOs.Auth;

public class LoginRequest
{
    [Required(ErrorMessage = "El usuario es obligatorio.")]
    [StringLength(50, MinimumLength = 3, ErrorMessage = "El usuario debe tener entre 3 y 50 caracteres.")]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "La contrasena es obligatoria.")]
    [StringLength(128, MinimumLength = 6, ErrorMessage = "La contrasena debe tener al menos 6 caracteres.")]
    public string Password { get; set; } = string.Empty;
}

public class RefreshTokenRequest
{
    [Required(ErrorMessage = "El refresh token es obligatorio.")]
    public string RefreshToken { get; set; } = string.Empty;
}

public class AuthResponseDto
{
    public bool Exitoso { get; set; }
    public string Mensaje { get; set; } = string.Empty;
    public string? AccessToken { get; set; }
    public string? RefreshToken { get; set; }
    public string? TokenType { get; set; } = "Bearer";
    public DateTime? Expiracion { get; set; }
    public UsuarioDto? Usuario { get; set; }

    public static AuthResponseDto FromResult(AuthResult result) => new()
    {
        Exitoso = result.Exitoso,
        Mensaje = result.Exitoso ? "Autenticacion exitosa." : result.Error ?? "Error de autenticacion.",
        AccessToken = result.AccessToken,
        RefreshToken = result.RefreshToken,
        Expiracion = result.Expiracion,
        Usuario = result.Usuario
    };
}
