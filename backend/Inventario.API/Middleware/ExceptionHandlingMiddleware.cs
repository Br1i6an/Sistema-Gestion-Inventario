using System.Diagnostics;
using System.Net;
using System.Text.Json;
using Inventario.Application.Exceptions;
using Npgsql;
using Microsoft.AspNetCore.Mvc;

namespace Inventario.API.Middleware;


public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IHostEnvironment _environment;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger,
        IHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, titulo, codigo, detalle) = Mapear(exception);

        if (statusCode >= 500)
        {
            _logger.LogError(exception, "Error no controlado en {Method} {Path}",
                context.Request.Method, context.Request.Path);
        }
        else
        {
            _logger.LogWarning("Error de negocio en {Method} {Path}: {Detalle}",
                context.Request.Method, context.Request.Path, detalle);
        }

        if (context.Response.HasStarted)
        {
            _logger.LogWarning("La respuesta ya habia comenzado; no se puede escribir el cuerpo de error.");
            return;
        }

        context.Response.Clear();
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/problem+json";

        var problem = new ProblemDetails
        {
            Status = statusCode,
            Title = titulo,
            Detail = detalle,
            Instance = context.Request.Path
        };

        problem.Extensions["codigo"] = codigo;
        problem.Extensions["traceId"] = Activity.Current?.Id ?? context.TraceIdentifier;

        //Detalle tecnico completo solo fuera de produccion.
        if (_environment.IsDevelopment() && statusCode >= 500)
        {
            problem.Extensions["stackTrace"] = exception.ToString();
        }

        await context.Response.WriteAsync(JsonSerializer.Serialize(problem, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = _environment.IsDevelopment()
        }));
    }


    private static (int StatusCode, string Titulo, string Codigo, string Detalle) Mapear(Exception exception)
    {
        switch (exception)
        {
            case BusinessException business:
                var titulo = business.StatusCode switch
                {
                    404 => "Recurso no encontrado",
                    409 => "Conflicto con el estado actual",
                    _ => "Solicitud invalida"
                };
                return (business.StatusCode, titulo, business.Codigo, business.Message);

            case OperationCanceledException:
                return ((int)HttpStatusCode.RequestTimeout, "La solicitud fue cancelada",
                        "SOLICITUD_CANCELADA", "El cliente cancelo la operacion o agoto el tiempo de espera.");

            case PostgresException pg:
                _ = pg;
                return ((int)HttpStatusCode.InternalServerError, "Error interno del servidor",
                        "ERROR_BASE_DATOS", "No fue posible completar la operacion sobre la base de datos.");

            case ArgumentException arg:
                return ((int)HttpStatusCode.BadRequest, "Solicitud invalida",
                        "ARGUMENTO_INVALIDO", arg.Message);

            case UnauthorizedAccessException:
                return ((int)HttpStatusCode.Unauthorized, "No autorizado",
                        "NO_AUTORIZADO", "No cuenta con permisos para realizar esta operacion.");

            default:
                return ((int)HttpStatusCode.InternalServerError, "Error interno del servidor",
                        "ERROR_INTERNO", "Ocurrio un error inesperado al procesar la solicitud.");
        }
    }
}
