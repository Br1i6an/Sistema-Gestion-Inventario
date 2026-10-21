namespace Inventario.Domain.Entities;

public class Categoria
{
    public long Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public long TotalProductos { get; set; }
}
