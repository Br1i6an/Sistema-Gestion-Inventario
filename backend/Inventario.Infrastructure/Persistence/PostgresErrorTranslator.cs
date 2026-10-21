using Inventario.Application.Exceptions;
using Npgsql;

namespace Inventario.Infrastructure.Persistence;

public static class PostgresErrorTranslator
{

    public static async Task<T> TranslateAsync<T>(Func<Task<T>> operacion)
    {
        try
        {
            return await operacion();
        }
        catch (PostgresException ex)
        {
            throw FromPostgresException(ex);
        }
    }

    public static async Task TranslateAsync(Func<Task> operacion)
    {
        try
        {
            await operacion();
        }
        catch (PostgresException ex)
        {
            throw FromPostgresException(ex);
        }
    }

    private static BusinessException FromPostgresException(PostgresException ex)
        => Traducir(ex.SqlState, ex.MessageText);

    //Traduce un error de PostgreSQL a una excepcion de negocio con el codigo
    //HTTP y el mensaje que corresponde. Se separa de la excepcion de Npgsql
    //para poder verificarla sin base de datos.
    public static BusinessException Traducir(string sqlState, string messageText)
    {
        var (codigo, mensaje) = ExtraerCodigoNegocio(messageText);

        return codigo switch
        {
            "STOCK_INSUFICIENTE" => new BusinessException(mensaje, 409, codigo),
            "PRODUCTO_NO_ENCONTRADO" => new NotFoundException(mensaje, codigo),
            "CATEGORIA_NO_ENCONTRADA" => new BusinessException(mensaje, 400, codigo),
            "USUARIO_DUPLICADO" => new BusinessException(mensaje, 409, codigo),
            "PRODUCTO_INACTIVO" => new BusinessException(mensaje, 409, codigo),
            "AJUSTE_SIN_CAMBIO" => new BusinessException(mensaje, 400, codigo),
            "CANTIDAD_INVALIDA" or "STOCK_INVALIDO" or "CODIGO_REQUERIDO" or "NOMBRE_REQUERIDO" or "STOCK_NEGATIVO"
                => new BusinessException(mensaje, 400, codigo),
            _ when sqlState == "23505"
                => new BusinessException(MensajeUnicidad(messageText), 409, "CONFLICTO_UNICIDAD"),
            _ when sqlState == "23503"
                => new BusinessException("No se puede eliminar el registro porque hay datos que lo referencian.", 409, "CONFLICTO_REFERENCIA"),
            _ => new BusinessException(mensaje, 400, codigo)
        };
    }

    //Traduce el error de unicidad de PostgreSQL a un mensaje que entienda
    //el usuario, en lugar de mostrar el texto tecnico de la base de datos.
    private static string MensajeUnicidad(string messageText)
    {
        var texto = messageText ?? string.Empty;

        if (texto.Contains("uq_productos_codigo", StringComparison.OrdinalIgnoreCase))
        {
            return "Ya existe un producto registrado con ese codigo.";
        }

        if (texto.Contains("uq_categorias_nombre", StringComparison.OrdinalIgnoreCase))
        {
            return "Ya existe una categoria registrada con ese nombre.";
        }

        if (texto.Contains("uq_usuarios_username", StringComparison.OrdinalIgnoreCase))
        {
            return "Ya existe un usuario registrado con ese nombre de usuario.";
        }

        if (texto.Contains("uq_usuarios_email", StringComparison.OrdinalIgnoreCase))
        {
            return "Ya existe un usuario registrado con ese correo electronico.";
        }

        return "Ya existe un registro con ese valor.";
    }

    private static (string Codigo, string Mensaje) ExtraerCodigoNegocio(string messageText)
    {
        if (string.IsNullOrWhiteSpace(messageText))
        {
            return ("ERROR_BASE_DATOS", "Ocurrio un error inesperado en la base de datos.");
        }

        var inicio = messageText.IndexOf('[');
        var fin = messageText.IndexOf(']');

        if (inicio >= 0 && fin > inicio)
        {
            var codigo = messageText[(inicio + 1)..fin].Trim();
            var mensaje = messageText[(fin + 1)..].Trim();
            return (codigo, string.IsNullOrEmpty(mensaje) ? messageText : mensaje);
        }

        return ("ERROR_BASE_DATOS", messageText);
    }
}
