using System.Data;
using Dapper;
using Inventario.Application.DTOs;
using Inventario.Application.Interfaces;
using Inventario.Infrastructure.Persistence;

namespace Inventario.Infrastructure.Repositories;

public class InventarioRepository : IInventarioRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public InventarioRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
        DapperConfiguration.Configurar();
    }

    //PRODUCTOS
    public async Task<PagedResult<ProductoDto>> GetInventarioActualAsync(
        string? busqueda, long? categoriaId, bool soloBajoStock, bool soloActivos,
        string ordenarPor, string dirOrden, int pagina, int tamano, CancellationToken ct = default)
    {
        return await PostgresErrorTranslator.TranslateAsync(async () =>
        {
            using var connection = await _connectionFactory.CreateAsync(ct);

            var filas = await connection.QueryAsync<ProductoFila>(new CommandDefinition(
                "SELECT * FROM inventario.sp_consultar_inventario_actual(" +
                "    @p_busqueda, @p_categoria_id, @p_solo_bajo_stock, @p_solo_activos, " +
                "    @p_orden_por, @p_dir_orden, @p_pagina, @p_tamano);",
                new
                {
                    p_busqueda = busqueda,
                    p_categoria_id = categoriaId,
                    p_solo_bajo_stock = soloBajoStock,
                    p_solo_activos = soloActivos,
                    p_orden_por = ordenarPor,
                    p_dir_orden = dirOrden,
                    p_pagina = pagina,
                    p_tamano = tamano
                },
                cancellationToken: ct));

            var total = filas.FirstOrDefault()?.TotalRegistros ?? 0;

            var items = filas.Select(f => f.AProducto()).ToList();

            return new PagedResult<ProductoDto>
            {
                Items = items,
                Pagina = pagina,
                TamanoPagina = tamano,
                TotalRegistros = total
            };
        });
    }

    public async Task<ProductoDto?> GetProductoByIdAsync(long id, CancellationToken ct = default)
    {
        return await PostgresErrorTranslator.TranslateAsync(async () =>
        {
            using var connection = await _connectionFactory.CreateAsync(ct);

            var fila = await connection.QuerySingleOrDefaultAsync<ProductoFila>(new CommandDefinition(
                "SELECT * FROM inventario.sp_obtener_producto(@p_producto_id);",
                new { p_producto_id = id },
                cancellationToken: ct));

            return fila?.AProducto();
        });
    }

    public async Task<ProductoDto> CrearProductoAsync(ProductoRequest request, CancellationToken ct = default)
    {
        return await PostgresErrorTranslator.TranslateAsync(async () =>
        {
            using var connection = await _connectionFactory.CreateAsync(ct);

            var fila = await connection.QuerySingleAsync<ProductoFila>(new CommandDefinition(
                "SELECT * FROM inventario.sp_crear_producto(" +
                "    @p_codigo, @p_nombre, @p_categoria_id, @p_descripcion, " +
                "    @p_precio_unitario, @p_stock_inicial, @p_stock_minimo);",
                new
                {
                    p_codigo = request.Codigo,
                    p_nombre = request.Nombre,
                    p_descripcion = request.Descripcion,
                    p_categoria_id = request.CategoriaId,
                    p_precio_unitario = request.PrecioUnitario,
                    p_stock_inicial = request.StockInicial,
                    p_stock_minimo = request.StockMinimo
                },
                cancellationToken: ct));

            return fila.AProducto();
        });
    }

    public async Task<ProductoDto?> ActualizarProductoAsync(long id, ProductoRequest request, CancellationToken ct = default)
    {
        return await PostgresErrorTranslator.TranslateAsync(async () =>
        {
            using var connection = await _connectionFactory.CreateAsync(ct);

            var filas = await connection.QueryAsync<ProductoFila>(new CommandDefinition(
                "SELECT * FROM inventario.sp_actualizar_producto(" +
                "    @p_producto_id, @p_codigo, @p_nombre, @p_descripcion, @p_categoria_id, " +
                "    @p_precio_unitario, @p_stock_minimo, @p_activo);",
                new
                {
                    p_producto_id = id,
                    p_codigo = request.Codigo,
                    p_nombre = request.Nombre,
                    p_descripcion = request.Descripcion,
                    p_categoria_id = request.CategoriaId,
                    p_precio_unitario = request.PrecioUnitario,
                    p_stock_minimo = request.StockMinimo,
                    p_activo = request.Activo
                },
                cancellationToken: ct));

            var fila = filas.FirstOrDefault();
            return fila?.AProducto();
        });
    }

    public async Task<bool> DarDeBajaProductoAsync(long id, CancellationToken ct = default)
    {
        return await PostgresErrorTranslator.TranslateAsync(async () =>
        {
            using var connection = await _connectionFactory.CreateAsync(ct);

            var resultado = await connection.ExecuteScalarAsync<bool>(new CommandDefinition(
                "SELECT inventario.sp_dar_de_baja_producto(@p_producto_id);",
                new { p_producto_id = id },
                cancellationToken: ct));

            return resultado;
        });
    }

    public async Task<IReadOnlyList<CategoriaDto>> GetCategoriasAsync(CancellationToken ct = default)
    {
        return await PostgresErrorTranslator.TranslateAsync(async () =>
        {
            using var connection = await _connectionFactory.CreateAsync(ct);

            var filas = await connection.QueryAsync<CategoriaFila>(new CommandDefinition(
                "SELECT * FROM inventario.sp_listar_categorias();",
                cancellationToken: ct));

            return filas.Select(f => f.ACategoria()).ToList();
        });
    }

    //MOVIMIENTOS    
    public async Task<MovimientoDto> RegistrarEntradaAsync(EntradaRequest request, long? usuarioId, CancellationToken ct = default)
    {
        return await PostgresErrorTranslator.TranslateAsync(async () =>
        {
            using var connection = await _connectionFactory.CreateAsync(ct);

            var fila = await connection.QuerySingleAsync<MovimientoFila>(new CommandDefinition(
                "SELECT * FROM inventario.sp_registrar_entrada(" +
                "    @p_producto_id, @p_cantidad, @p_precio_unitario, @p_motivo, @p_referencia, @p_usuario_id);",
                new
                {
                    p_producto_id = request.ProductoId,
                    p_cantidad = request.Cantidad,
                    p_precio_unitario = request.PrecioUnitario,
                    p_motivo = request.Motivo,
                    p_referencia = request.Referencia,
                    p_usuario_id = usuarioId
                },
                cancellationToken: ct));

            return fila.AMovimiento();
        });
    }

    public async Task<MovimientoDto> RegistrarSalidaAsync(SalidaRequest request, long? usuarioId, CancellationToken ct = default)
    {
        return await PostgresErrorTranslator.TranslateAsync(async () =>
        {
            using var connection = await _connectionFactory.CreateAsync(ct);

            var fila = await connection.QuerySingleAsync<MovimientoFila>(new CommandDefinition(
                "SELECT * FROM inventario.sp_registrar_salida(" +
                "    @p_producto_id, @p_cantidad, @p_motivo, @p_referencia, @p_usuario_id);",
                new
                {
                    p_producto_id = request.ProductoId,
                    p_cantidad = request.Cantidad,
                    p_motivo = request.Motivo,
                    p_referencia = request.Referencia,
                    p_usuario_id = usuarioId
                },
                cancellationToken: ct));

            return fila.AMovimiento();
        });
    }

    public async Task<MovimientoDto> RegistrarAjusteAsync(AjusteRequest request, long? usuarioId, CancellationToken ct = default)
    {
        return await PostgresErrorTranslator.TranslateAsync(async () =>
        {
            using var connection = await _connectionFactory.CreateAsync(ct);

            var fila = await connection.QuerySingleAsync<MovimientoFila>(new CommandDefinition(
                "SELECT * FROM inventario.sp_registrar_ajuste(" +
                "    @p_producto_id, @p_stock_final, @p_motivo, @p_referencia, @p_usuario_id);",
                new
                {
                    p_producto_id = request.ProductoId,
                    p_stock_final = request.StockFinal,
                    p_motivo = request.Motivo,
                    p_referencia = request.Referencia,
                    p_usuario_id = usuarioId
                },
                cancellationToken: ct));

            return fila.AMovimiento();
        });
    }

    public async Task<PagedResult<MovimientoDto>> GetMovimientosAsync(
        long? productoId, string? tipo, string? busqueda, DateTime? desde, DateTime? hasta,
        long? usuarioId, int pagina, int tamano, CancellationToken ct = default)
    {
        return await PostgresErrorTranslator.TranslateAsync(async () =>
        {
            using var connection = await _connectionFactory.CreateAsync(ct);

            var filas = await connection.QueryAsync<MovimientoFila>(new CommandDefinition(
                "SELECT * FROM inventario.sp_consultar_movimientos(" +
                "    @p_producto_id, @p_tipo, @p_busqueda, @p_desde, @p_hasta, " +
                "    @p_usuario_id, @p_pagina, @p_tamano);",
                new
                {
                    p_producto_id = productoId,
                    p_tipo = tipo,
                    p_busqueda = busqueda,
                    p_desde = desde,
                    p_hasta = hasta,
                    p_usuario_id = usuarioId,
                    p_pagina = pagina,
                    p_tamano = tamano
                },
                cancellationToken: ct));

            var total = filas.FirstOrDefault()?.TotalRegistros ?? 0;

            var items = filas.Select(f => f.AMovimiento()).ToList();

            return new PagedResult<MovimientoDto>
            {
                Items = items,
                Pagina = pagina,
                TamanoPagina = tamano,
                TotalRegistros = total
            };
        });
    }

    //DASHBOARD
    public async Task<ResumenInventarioDto> GetResumenAsync(CancellationToken ct = default)
    {
        return await PostgresErrorTranslator.TranslateAsync(async () =>
        {
            using var connection = await _connectionFactory.CreateAsync(ct);

            var fila = await connection.QuerySingleAsync<ResumenFila>(new CommandDefinition(
                "SELECT * FROM inventario.sp_resumen_inventario();",
                cancellationToken: ct));

            return new ResumenInventarioDto
            {
                TotalProductos = fila.TotalProductos,
                ProductosActivos = fila.ProductosActivos,
                ProductosAgotados = fila.ProductosAgotados,
                ProductosStockBajo = fila.ProductosStockBajo,
                TotalUnidades = fila.TotalUnidades,
                ValorInventario = fila.ValorInventario,
                EntradasUltimoMes = fila.EntradasUltimoMes,
                SalidasUltimoMes = fila.SalidasUltimoMes,
                MovimientosTotal = fila.MovimientosTotal
            };
        });
    }
}
