using Inventario.Application.DTOs;
using Inventario.Application.DTOs.Auth;
using Inventario.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventario.API.Controllers;


[ApiController]
[Route("api/auth")]
[Produces("application/json")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IAuthService authService, ILogger<AuthController> logger)
    {
        _authService = authService;
        _logger = logger;
    }


    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var result = await _authService.LoginAsync(request.Username, request.Password, ct);

        if (!result.Exitoso)
        {
            _logger.LogWarning("Login fallido para el usuario {Username}", request.Username);
            return Unauthorized(new AuthResponseDto
            {
                Exitoso = false,
                Mensaje = result.Error ?? "Error de autenticacion."
            });
        }

        _logger.LogInformation("Login exitoso del usuario {Username}", request.Username);
        return Ok(AuthResponseDto.FromResult(result));
    }


    [HttpPost("refresh")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request, CancellationToken ct)
    {
        var result = await _authService.RefreshAsync(request.RefreshToken, ct);

        if (!result.Exitoso)
        {
            return Unauthorized(AuthResponseDto.FromResult(result));
        }

        return Ok(AuthResponseDto.FromResult(result));
    }

 
    [HttpPost("logout")]
    [Authorize]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Logout([FromBody] RefreshTokenRequest request, CancellationToken ct)
    {
        await _authService.LogoutAsync(request.RefreshToken, ct);
        return Ok(new AuthResponseDto { Exitoso = true, Mensaje = "Sesion cerrada correctamente." });
    }


    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(UsuarioDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UsuarioDto>> Me(CancellationToken ct)
    {
        var idClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!long.TryParse(idClaim, out var id))
        {
            return Unauthorized(new { codigo = "TOKEN_INVALIDO" });
        }

        var usuario = await _authService.GetUsuarioActualAsync(id, ct);

        if (usuario is null)
        {
            return NotFound(new { codigo = "USUARIO_NO_ENCONTRADO" });
        }

        return Ok(usuario);
    }
}
