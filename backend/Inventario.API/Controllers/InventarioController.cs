using Inventario.Application.DTOs;
using Inventario.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventario.API.Controllers;


[ApiController]
[Route("api/inventario")]
[Authorize]
[Produces("application/json")]
public class InventarioController : ControllerBase
{
    private readonly InventarioService _service;

    public InventarioController(InventarioService service) => _service = service;


    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<ProductoDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<ProductoDto>>> GetInventario(
        [FromQuery] string? busqueda,
        [FromQuery] long? categoriaId,
        [FromQuery] bool soloBajoStock = false,
        [FromQuery] bool soloActivos = true,
        [FromQuery] string? ordenarPor = "nombre",
        [FromQuery] string? dirOrden = "asc",
        [FromQuery] int pagina = 1,
        [FromQuery] int tamano = 20,
        CancellationToken ct = default)
    {
        var resultado = await _service.GetInventarioAsync(
            busqueda, categoriaId, soloBajoStock, soloActivos, ordenarPor, dirOrden, pagina, tamano, ct);

        return Ok(resultado);
    }

    [HttpGet("resumen")]
    [ProducesResponseType(typeof(ResumenInventarioDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<ResumenInventarioDto>> GetResumen(CancellationToken ct)
    {
        var resumen = await _service.GetResumenAsync(ct);
        return Ok(resumen);
    }


    [HttpGet("categorias")]
    [ProducesResponseType(typeof(IReadOnlyList<CategoriaDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<CategoriaDto>>> GetCategorias(CancellationToken ct)
    {
        var categorias = await _service.GetCategoriasAsync(ct);
        return Ok(categorias);
    }
}
