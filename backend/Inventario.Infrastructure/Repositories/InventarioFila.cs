using Inventario.Application.DTOs;
using Inventario.Domain.Enums;

namespace Inventario.Infrastructure.Repositories;

internal class ProductoFila
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
    public string EstadoStock { get; set; } = "NORMAL";
    public decimal ValorTotal { get; set; }
    public bool Activo { get; set; }
    public DateTime? CreadoEn { get; set; }
    public DateTime ActualizadoEn { get; set; }
    public long TotalRegistros { get; set; }

    public ProductoDto AProducto() => new()
    {
        Id = Id,
        Codigo = Codigo,
        Nombre = Nombre,
        Descripcion = Descripcion,
        CategoriaId = CategoriaId,
        CategoriaNombre = CategoriaNombre,
        PrecioUnitario = PrecioUnitario,
        StockActual = StockActual,
        StockMinimo = StockMinimo,
        StockFaltante = StockFaltante,
        EstadoStock = EstadoStockMapper.Mapear(EstadoStock),
        ValorTotal = ValorTotal,
        Activo = Activo,
        CreadoEn = CreadoEn,
        ActualizadoEn = ActualizadoEn
    };
}

internal class MovimientoFila
{

    public long MovimientoId { get; set; }
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
    public long TotalRegistros { get; set; }

    public MovimientoDto AMovimiento()
    {
        var tipo = TipoMovimientoMapper.Mapear(Tipo);

        return new MovimientoDto
        {
            Id = MovimientoId,
            ProductoId = ProductoId,
            ProductoCodigo = ProductoCodigo,
            ProductoNombre = ProductoNombre,
            Tipo = tipo,
            TipoDescripcion = TipoMovimientoMapper.Descripcion(tipo),
            Cantidad = Cantidad,
            StockAnterior = StockAnterior,
            StockResultante = StockResultante,
            PrecioUnitario = PrecioUnitario,
            ValorTotal = ValorTotal,
            Motivo = Motivo,
            Referencia = Referencia,
            UsuarioId = UsuarioId,
            UsuarioNombre = UsuarioNombre,
            CreadoEn = CreadoEn
        };
    }
}
internal class CategoriaFila
{
    public long Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public long TotalProductos { get; set; }

    public CategoriaDto ACategoria() => new()
    {
        Id = Id,
        Nombre = Nombre,
        Descripcion = Descripcion,
        TotalProductos = TotalProductos
    };
}

internal class ResumenFila
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

internal static class EstadoStockMapper
{
    public static EstadoStock Mapear(string? valor) => valor?.ToUpperInvariant() switch
    {
        "AGOTADO" => EstadoStock.Agotado,
        "BAJO" => EstadoStock.Bajo,
        "NORMAL" => EstadoStock.Normal,
        _ => EstadoStock.Normal
    };
}

internal static class TipoMovimientoMapper
{
    public static TipoMovimiento Mapear(string? valor) => valor?.ToUpperInvariant() switch
    {
        "ENTRADA" => TipoMovimiento.Entrada,
        "SALIDA" => TipoMovimiento.Salida,
        "AJUSTE_POSITIVO" => TipoMovimiento.AjustePositivo,
        "AJUSTE_NEGATIVO" => TipoMovimiento.AjusteNegativo,
        _ => TipoMovimiento.Entrada
    };

    public static string Descripcion(TipoMovimiento tipo) => tipo switch
    {
        TipoMovimiento.Entrada => "Entrada",
        TipoMovimiento.Salida => "Salida",
        TipoMovimiento.AjustePositivo => "Ajuste positivo",
        TipoMovimiento.AjusteNegativo => "Ajuste negativo",
        _ => tipo.ToString()
    };
}
