namespace Inventario.Domain.Entities;

public class MovimientoInventario
{
    public long Id { get; set; }
    public long ProductoId { get; set; }
    public string ProductoCodigo { get; set; } = string.Empty;
    public string ProductoNombre { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty;
    public int Cantidad { get; set; }
    public int StockAnterior { get; set; }
    public int StockResultante { get; set; }
    public decimal PrecioUnitario { get; set; }
    public decimal ValorTotal { get; set; }
    public string? Motivo { get; set; }
    public string? Referencia { get; set; }
    public long? UsuarioId { get; set; }
    public string? UsuarioNombre { get; set; }
    public DateTime CreadoEn { get; set; }
}
