using Inventario.Domain.Enums;

namespace Inventario.Application.DTOs;

public class ProductoDto
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
    public int StockFaltante { get; set; }
    public EstadoStock EstadoStock { get; set; }
    public decimal ValorTotal { get; set; }
    public bool Activo { get; set; }
    public DateTime ActualizadoEn { get; set; }
    public DateTime? CreadoEn { get; set; }
}


public class MovimientoDto
{
    public long Id { get; set; }
    public long ProductoId { get; set; }
    public string ProductoCodigo { get; set; } = string.Empty;
    public string ProductoNombre { get; set; } = string.Empty;
    public TipoMovimiento Tipo { get; set; }
    public string TipoDescripcion { get; set; } = string.Empty;
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


public class CategoriaDto
{
    public long Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public long TotalProductos { get; set; }
}


public class ResumenInventarioDto
{
    public long TotalProductos { get; set; }
    public long ProductosActivos { get; set; }
    public long ProductosAgotados { get; set; }
    public long ProductosStockBajo { get; set; }
    public decimal TotalUnidades { get; set; }
    public decimal ValorInventario { get; set; }
    public long EntradasUltimoMes { get; set; }
    public long SalidasUltimoMes { get; set; }
    public long MovimientosTotal { get; set; }
}
