using Inventario.API.Extensions;
using Inventario.API.Middleware;
using Inventario.Application.Interfaces;
using Inventario.Application.Services;
using Inventario.Infrastructure.Options;
using Inventario.Infrastructure.Persistence;
using Inventario.Infrastructure.Repositories;
using Inventario.Infrastructure.Services;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.OpenApi.Models;
using System.Text.Json;
using System.Text.Json.Serialization;


var builder = WebApplication.CreateBuilder(args);

//Configuracion
builder.Services.Configure<DatabaseOptions>(builder.Configuration.GetSection(DatabaseOptions.SectionName));
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));

//Servicios de aplicacion
builder.Services.AddScoped<IInventarioRepository, InventarioRepository>();
builder.Services.AddScoped<IUsuarioRepository, UsuarioRepository>();
builder.Services.AddScoped<InventarioService>();
builder.Services.AddScoped<IAuthService, AuthService>();

//Servicios de infraestructura
builder.Services.AddSingleton<IDbConnectionFactory, NpgsqlConnectionFactory>();
builder.Services.AddSingleton<ITokenService, TokenService>();
builder.Services.AddSingleton<IPasswordHasher, BCryptPasswordHasher>();


//Autenticacion y autorizacion
builder.Services.AddJwtAuthentication(builder.Configuration);

//Controladores y validacion 
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    })
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var errores = context.ModelState
                .Where(kv => kv.Value?.Errors.Count > 0)
                .ToDictionary(
                    kv => kv.Key,
                    kv => kv.Value!.Errors.Select(e => e.ErrorMessage).ToArray());

            return new BadRequestObjectResult(new ValidationProblemDetails(context.ModelState)
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Uno o mas campos de la solicitud no son validos.",
                Detail = "Revise los campos indicados y vuelva a intentar.",
                Instance = context.HttpContext.Request.Path
            })
            {
                ContentTypes = { "application/problem+json" }
            };
        };
    });

//Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "API Sistema de Gestion de Inventario",
        Version = "v1",
        Description = "",
        Contact = new OpenApiContact
        {
            Name = "",
            Email = ""
        }
    });

    var xmlPath = Path.Combine(AppContext.BaseDirectory, "Inventario.API.xml");
    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Inserta el valor del campo accessToken devuelto por POST /api/auth/login " +
                      "(sin la palabra \"Bearer\")."
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

//CORS
const string CorsPolicy = "PoliticaInventario";
var origenesPermitidos = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:4200", "http://localhost:5173" };

builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicy, policy => policy
        .WithOrigins(origenesPermitidos)
        .AllowAnyHeader()
        .AllowAnyMethod()
        .WithExposedHeaders("Content-Disposition"));
});

//Health check de la base de datos
builder.Services.AddHealthChecks()
    .AddNpgSql(builder.Configuration.GetConnectionString("DefaultConnection") ?? string.Empty,
        name: "postgres", tags: new[] { "ready" });

var app = builder.Build();


//Pipeline
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "API Inventario v1");
        options.DocumentTitle = "API MiniSistema de Gestion de Inventario";
        options.DisplayRequestDuration();
    });
}
else
{
    app.UseHsts();
}

app.UseCors(CorsPolicy);

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapHealthChecks("/health").AllowAnonymous();

app.Run();
