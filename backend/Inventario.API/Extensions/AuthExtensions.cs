using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace Inventario.API.Extensions;

public static class AuthExtensions
{

    public static IServiceCollection AddJwtAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        var jwtSection = configuration.GetSection("Jwt");
        var issuer = jwtSection["Issuer"] ?? "InventarioAPI";
        var audience = jwtSection["Audience"] ?? "InventarioCliente";
        var signingKey = jwtSection["SigningKey"] ?? string.Empty;
        var allowHttp = jwtSection.GetValue("AllowHttp", false);

        if (string.IsNullOrWhiteSpace(signingKey) || signingKey.Length < 32)
        {
            throw new InvalidOperationException(
                "La clave de firma JWT no esta configurada correctamente. " +
                "Defina 'Jwt:SigningKey' en appsettings.json con al menos 32 caracteres.");
        }

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.RequireHttpsMetadata = !allowHttp;
            options.SaveToken = true;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = issuer,
                ValidateAudience = true,
                ValidAudience = audience,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey)),
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromSeconds(30),
                NameClaimType = System.Security.Claims.ClaimTypes.Name,
                RoleClaimType = System.Security.Claims.ClaimTypes.Role
            };

            options.Events = new JwtBearerEvents
            {
                OnAuthenticationFailed = context =>
                {
                    //Se registra el motivo real para verlo en la salida de Visual Studio.
                    var logger = context.HttpContext.RequestServices
                        .GetRequiredService<ILoggerFactory>()
                        .CreateLogger("Inventario.Auth");

                    logger.LogWarning(context.Exception,
                        "Fallo la validacion del token JWT para {Path}. Motivo: {Message}",
                        context.Request.Path,
                        context.Exception?.Message);

                    return Task.CompletedTask;
                },
                OnChallenge = context =>
                {
                    //Devuelve ProblemDetails en lugar del 401 vacio por defecto.
                    context.HandleResponse();

                    if (context.Response.HasStarted)
                    {
                        return Task.CompletedTask;
                    }

                    var tokenAusente = context.AuthenticateFailure is null;
                    var detalle = tokenAusente
                        ? "Se requiere un token JWT valido para acceder a este recurso."
                        : $"El token JWT enviado no es valido: {context.AuthenticateFailure!.Message}";

                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    context.Response.ContentType = "application/problem+json";

                    var problem = new
                    {
                        type = "https://tools.ietf.org/html/rfc7235#section-3.1",
                        title = "No autenticado",
                        status = StatusCodes.Status401Unauthorized,
                        detail = detalle,

                        instance = context.Request.Path.Value,
                        codigo = tokenAusente ? "TOKEN_AUSENTE" : "TOKEN_INVALIDO"
                    };

                    return context.Response.WriteAsync(System.Text.Json.JsonSerializer.Serialize(problem,
                        new System.Text.Json.JsonSerializerOptions
                        {
                            PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase
                        }));
                },
                OnForbidden = context =>
                {
                    if (context.Response.HasStarted)
                    {
                        return Task.CompletedTask;
                    }

                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    context.Response.ContentType = "application/problem+json";

                    var problem = new
                    {
                        type = "https://tools.ietf.org/html/rfc7231#section-6.5.3",
                        title = "Acceso denegado",
                        status = StatusCodes.Status403Forbidden,
                        detail = "Su rol no tiene permisos para realizar esta operacion.",
                        instance = context.Request.Path.Value,
                        codigo = "PERMISOS_INSUFICIENTES"
                    };

                    return context.Response.WriteAsync(System.Text.Json.JsonSerializer.Serialize(problem,
                        new System.Text.Json.JsonSerializerOptions
                        {
                            PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase
                        }));
                }
            };
        });

        services.AddAuthorization();

        return services;
    }
}
