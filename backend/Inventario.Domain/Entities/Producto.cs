namespace Inventario.Domain.Entities;

public class Producto
{
    public long Id { get; set; }
    public string Codigo { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public long CategoriaId { get; set; }
    public string CategoriaNombre { get; set; } = string.Empty;
    public decimal PrecioUnitario { get; set; }
    public int StockActual { get; set; }
    public int StockMinimo { get; set; }
    public bool Activo { get; set; }
    public DateTime CreadoEn { get; set; }
    public DateTime ActualizadoEn { get; set; }
}
