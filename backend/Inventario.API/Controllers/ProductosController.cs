using Inventario.Application.DTOs;
using Inventario.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventario.API.Controllers;

[ApiController]
[Route("api/productos")]
[Authorize]
[Produces("application/json")]
public class ProductosController : ControllerBase
{
    private readonly InventarioService _service;

    public ProductosController(InventarioService service) => _service = service;


    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(ProductoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProductoDto>> GetById(long id, CancellationToken ct)
    {
        var producto = await _service.GetProductoAsync(id, ct);
        return Ok(producto);
    }


    [HttpPost]
    [Authorize(Roles = "ADMIN,OPERADOR")]
    [ProducesResponseType(typeof(ProductoDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ProductoDto>> Crear([FromBody] ProductoRequest request, CancellationToken ct)
    {
        var producto = await _service.CrearProductoAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = producto.Id }, producto);
    }


    [HttpPut("{id:long}")]
    [Authorize(Roles = "ADMIN,OPERADOR")]
    [ProducesResponseType(typeof(ProductoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProductoDto>> Actualizar(long id, [FromBody] ProductoRequest request, CancellationToken ct)
    {
        var producto = await _service.ActualizarProductoAsync(id, request, ct);
        return Ok(producto);
    }


    [HttpDelete("{id:long}")]
    [Authorize(Roles = "ADMIN")]
    [ProducesResponseType(typeof(OperationResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OperationResult>> DarDeBaja(long id, CancellationToken ct)
    {
        var resultado = await _service.DarDeBajaProductoAsync(id, ct);
        return Ok(resultado);
    }
}
