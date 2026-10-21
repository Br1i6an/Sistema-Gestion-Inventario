namespace Inventario.Domain.Entities;

public class Usuario
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
