using Inventario.Application.DTOs;

namespace Inventario.Application.Interfaces;

public interface IInventarioRepository
{
    //Productos
    Task<PagedResult<ProductoDto>> GetInventarioActualAsync(
        string? busqueda, long? categoriaId, bool soloBajoStock, bool soloActivos,
        string ordenarPor, string dirOrden, int pagina, int tamano, CancellationToken ct = default);

    Task<ProductoDto?> GetProductoByIdAsync(long id, CancellationToken ct = default);

    Task<ProductoDto> CrearProductoAsync(ProductoRequest request, CancellationToken ct = default);

    Task<ProductoDto?> ActualizarProductoAsync(long id, ProductoRequest request, CancellationToken ct = default);

    Task<bool> DarDeBajaProductoAsync(long id, CancellationToken ct = default);

    Task<IReadOnlyList<CategoriaDto>> GetCategoriasAsync(CancellationToken ct = default);

    //Movimientos
    Task<MovimientoDto> RegistrarEntradaAsync(EntradaRequest request, long? usuarioId, CancellationToken ct = default);

    Task<MovimientoDto> RegistrarSalidaAsync(SalidaRequest request, long? usuarioId, CancellationToken ct = default);

    Task<MovimientoDto> RegistrarAjusteAsync(AjusteRequest request, long? usuarioId, CancellationToken ct = default);

    Task<PagedResult<MovimientoDto>> GetMovimientosAsync(
        long? productoId, string? tipo, string? busqueda, DateTime? desde, DateTime? hasta,
        long? usuarioId, int pagina, int tamano, CancellationToken ct = default);

    //Dashboard
    Task<ResumenInventarioDto> GetResumenAsync(CancellationToken ct = default);
}
