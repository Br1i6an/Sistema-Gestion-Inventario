using Inventario.Application.DTOs;
using Inventario.Application.Exceptions;
using Inventario.Application.Interfaces;

namespace Inventario.Application.Services;

public class InventarioService
{
    private readonly IInventarioRepository _repository;

    public InventarioService(IInventarioRepository repository) => _repository = repository;

    private const int TamanoPaginaMaximo = 100;

    public async Task<PagedResult<ProductoDto>> GetInventarioAsync(
        string? busqueda, long? categoriaId, bool soloBajoStock, bool soloActivos,
        string? ordenarPor, string? dirOrden, int pagina, int tamano, CancellationToken ct = default)
    {
        var (paginaNorm, tamanoNorm) = NormalizarPaginacion(pagina, tamano);
        var orden = NormalizarOrden(ordenarPor, dirOrden);

        return await _repository.GetInventarioActualAsync(
            busqueda?.Trim(), categoriaId, soloBajoStock, soloActivos,
            orden.Valor, orden.Direccion, paginaNorm, tamanoNorm, ct);
    }

    public async Task<ProductoDto> GetProductoAsync(long id, CancellationToken ct = default)
    {
        var producto = await _repository.GetProductoByIdAsync(id, ct);
        return producto ?? throw new NotFoundException($"No existe un producto con id {id}.", "PRODUCTO_NO_ENCONTRADO");
    }

    public async Task<ProductoDto> CrearProductoAsync(ProductoRequest request, CancellationToken ct = default)
    {
        ValidarProducto(request);
        return await _repository.CrearProductoAsync(request, ct);
    }

    public async Task<ProductoDto> ActualizarProductoAsync(long id, ProductoRequest request, CancellationToken ct = default)
    {
        ValidarProducto(request);
        var producto = await _repository.ActualizarProductoAsync(id, request, ct);
        return producto ?? throw new NotFoundException($"No existe un producto con id {id}.", "PRODUCTO_NO_ENCONTRADO");
    }

    public async Task<OperationResult> DarDeBajaProductoAsync(long id, CancellationToken ct = default)
    {
        var ok = await _repository.DarDeBajaProductoAsync(id, ct);
        if (!ok)
        {
            throw new NotFoundException($"No existe un producto con id {id}.", "PRODUCTO_NO_ENCONTRADO");
        }

        return OperationResult.Ok("Producto dado de baja correctamente.");
    }

    public Task<IReadOnlyList<CategoriaDto>> GetCategoriasAsync(CancellationToken ct = default)
        => _repository.GetCategoriasAsync(ct);

    public async Task<MovimientoDto> RegistrarEntradaAsync(EntradaRequest request, long? usuarioId, CancellationToken ct = default)
    {
        if (request.Cantidad <= 0)
        {
            throw new BusinessException("La cantidad debe ser mayor a cero.", 400, "CANTIDAD_INVALIDA");
        }

        return await _repository.RegistrarEntradaAsync(request, usuarioId, ct);
    }

    public async Task<MovimientoDto> RegistrarSalidaAsync(SalidaRequest request, long? usuarioId, CancellationToken ct = default)
    {
        if (request.Cantidad <= 0)
        {
            throw new BusinessException("La cantidad debe ser mayor a cero.", 400, "CANTIDAD_INVALIDA");
        }

        return await _repository.RegistrarSalidaAsync(request, usuarioId, ct);
    }

    public async Task<MovimientoDto> RegistrarAjusteAsync(AjusteRequest request, long? usuarioId, CancellationToken ct = default)
    {
        if (request.StockFinal < 0)
        {
            throw new BusinessException("El stock final no puede ser negativo.", 400, "STOCK_INVALIDO");
        }

        return await _repository.RegistrarAjusteAsync(request, usuarioId, ct);
    }

    public async Task<PagedResult<MovimientoDto>> GetMovimientosAsync(
        long? productoId, string? tipo, string? busqueda, DateTime? desde, DateTime? hasta,
        long? usuarioId, int pagina, int tamano, CancellationToken ct = default)
    {
        var (paginaNorm, tamanoNorm) = NormalizarPaginacion(pagina, tamano);

        if (!string.IsNullOrWhiteSpace(tipo) && !EsTipoMovimientoValido(tipo))
        {
            throw new BusinessException(
                $"El tipo de movimiento '{tipo}' no es valido. Valores permitidos: ENTRADA, SALIDA, AJUSTE_POSITIVO, AJUSTE_NEGATIVO.",
                400, "TIPO_MOVIMIENTO_INVALIDO");
        }

        return await _repository.GetMovimientosAsync(
            productoId, tipo?.Trim().ToUpperInvariant(), busqueda?.Trim(), desde, hasta,
            usuarioId, paginaNorm, tamanoNorm, ct);
    }

    public Task<ResumenInventarioDto> GetResumenAsync(CancellationToken ct = default)
        => _repository.GetResumenAsync(ct);

    private static void ValidarProducto(ProductoRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Codigo))
        {
            throw new BusinessException("El codigo del producto es obligatorio.", 400, "CODIGO_REQUERIDO");
        }

        if (string.IsNullOrWhiteSpace(request.Nombre))
        {
            throw new BusinessException("El nombre del producto es obligatorio.", 400, "NOMBRE_REQUERIDO");
        }

        if (request.PrecioUnitario < 0)
        {
            throw new BusinessException("El precio unitario no puede ser negativo.", 400, "PRECIO_INVALIDO");
        }

        if (request.StockMinimo < 0)
        {
            throw new BusinessException("El stock minimo no puede ser negativo.", 400, "STOCK_NEGATIVO");
        }
    }

    private static (int Pagina, int Tamano) NormalizarPaginacion(int pagina, int tamano)
    {
        var pag = pagina < 1 ? 1 : pagina;
        var tam = tamano switch
        {
            < 1 => 20,
            > TamanoPaginaMaximo => TamanoPaginaMaximo,
            _ => tamano
        };
        return (pag, tam);
    }

    private static (string Valor, string Direccion) NormalizarOrden(string? ordenarPor, string? dirOrden)
    {
        var permitidos = new[] { "nombre", "codigo", "stock", "precio", "valor", "categoria" };
        var columna = permitidos.Contains(ordenarPor?.ToLowerInvariant()) ? ordenarPor!.ToLowerInvariant() : "nombre";
        var direccion = string.Equals(dirOrden, "desc", StringComparison.OrdinalIgnoreCase) ? "DESC" : "ASC";
        return (columna, direccion);
    }

    private static bool EsTipoMovimientoValido(string tipo) =>
        tipo.ToUpperInvariant() is "ENTRADA" or "SALIDA" or "AJUSTE_POSITIVO" or "AJUSTE_NEGATIVO";
}
