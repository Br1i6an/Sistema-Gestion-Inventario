namespace Inventario.Application.Exceptions;

public class BusinessException : Exception
{
    public int StatusCode { get; }

    public string Codigo { get; }

    public BusinessException(string mensaje, int statusCode = 400, string codigo = "ERROR_NEGOCIO")
        : base(mensaje)
    {
        StatusCode = statusCode;
        Codigo = codigo;
    }
}

public class NotFoundException : BusinessException
{
    public NotFoundException(string mensaje, string codigo = "NO_ENCONTRADO")
        : base(mensaje, 404, codigo)
    {
    }
}
