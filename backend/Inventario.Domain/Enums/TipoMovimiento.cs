namespace Inventario.Domain.Enums;

public enum TipoMovimiento
{
    Entrada = 0,
    Salida = 1,
    AjustePositivo = 2,
    AjusteNegativo = 3
}

public enum EstadoStock
{
    Agotado = 0,
    Bajo = 1,
    Normal = 2
}

public enum RolUsuario
{
    Admin = 0,

    Operador = 1,

    Lectura = 2
}
