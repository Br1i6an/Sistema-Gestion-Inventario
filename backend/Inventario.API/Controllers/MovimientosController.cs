using Inventario.Application.DTOs;
using Inventario.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventario.API.Controllers;


[ApiController]
[Route("api/movimientos")]
[Authorize]
[Produces("application/json")]
public class MovimientosController : ControllerBase
{
    private readonly InventarioService _service;

    public MovimientosController(InventarioService service) => _service = service;


    [HttpPost("entradas")]
    [Authorize(Roles = "ADMIN,OPERADOR")]
    [ProducesResponseType(typeof(MovimientoDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<MovimientoDto>> RegistrarEntrada([FromBody] EntradaRequest request, CancellationToken ct)
    {
        var usuarioId = ObtenerUsuarioId();
        var movimiento = await _service.RegistrarEntradaAsync(request, usuarioId, ct);

        return CreatedAtAction(nameof(GetHistorial), new { productoId = request.ProductoId }, movimiento);
    }


    [HttpPost("salidas")]
    [Authorize(Roles = "ADMIN,OPERADOR")]
    [ProducesResponseType(typeof(MovimientoDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<MovimientoDto>> RegistrarSalida([FromBody] SalidaRequest request, CancellationToken ct)
    {
        var usuarioId = ObtenerUsuarioId();
        var movimiento = await _service.RegistrarSalidaAsync(request, usuarioId, ct);

        return CreatedAtAction(nameof(GetHistorial), new { productoId = request.ProductoId }, movimiento);
    }


    [HttpPost("ajustes")]
    [Authorize(Roles = "ADMIN,OPERADOR")]
    [ProducesResponseType(typeof(MovimientoDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<MovimientoDto>> RegistrarAjuste([FromBody] AjusteRequest request, CancellationToken ct)
    {
        var usuarioId = ObtenerUsuarioId();
        var movimiento = await _service.RegistrarAjusteAsync(request, usuarioId, ct);

        return CreatedAtAction(nameof(GetHistorial), new { productoId = request.ProductoId }, movimiento);
    }


    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<MovimientoDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<MovimientoDto>>> GetHistorial(
        [FromQuery] long? productoId,
        [FromQuery] string? tipo,
        [FromQuery] string? busqueda,
        [FromQuery] DateTime? desde,
        [FromQuery] DateTime? hasta,
        [FromQuery] int pagina = 1,
        [FromQuery] int tamano = 20,
        CancellationToken ct = default)
    {
        var resultado = await _service.GetMovimientosAsync(
            productoId, tipo, busqueda, desde, hasta, null, pagina, tamano, ct);

        return Ok(resultado);
    }

    private long? ObtenerUsuarioId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return long.TryParse(claim, out var id) ? id : null;
    }
}
