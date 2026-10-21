using Inventario.Application.Exceptions;
using Inventario.Infrastructure.Persistence;

namespace Inventario.Tests.Persistence;

//Traduccion de los errores de PostgreSQL a excepciones de negocio.
public class PostgresErrorTranslatorTests
{
    [Theory]
    [InlineData("STOCK_INSUFICIENTE", 409)]
    [InlineData("PRODUCTO_INACTIVO", 409)]
    [InlineData("CATEGORIA_NO_ENCONTRADA", 400)]
    [InlineData("USUARIO_DUPLICADO", 409)]
    [InlineData("AJUSTE_SIN_CAMBIO", 400)]
    [InlineData("CANTIDAD_INVALIDA", 400)]
    [InlineData("STOCK_INVALIDO", 400)]
    [InlineData("CODIGO_REQUERIDO", 400)]
    [InlineData("NOMBRE_REQUERIDO", 400)]
    [InlineData("STOCK_NEGATIVO", 400)]
    public void TraduceCodigosDeNegocioAlCodigoHttpCorrespondiente(string codigo, int statusEsperado)
    {
        var ex = PostgresErrorTranslator.Traducir("P0001", $"[{codigo}] Detalle del error.");

        Assert.Equal(statusEsperado, ex.StatusCode);
        Assert.Equal(codigo, ex.Codigo);
        Assert.Equal("Detalle del error.", ex.Message);
    }

    [Fact]
    public void TraduceProductoNoEncontradoA404()
    {
        var ex = PostgresErrorTranslator.Traducir("P0001", "[PRODUCTO_NO_ENCONTRADO] El producto con id 99 no existe.");

        Assert.IsType<NotFoundException>(ex);
        Assert.Equal(404, ex.StatusCode);
    }

    [Theory]
    [InlineData("uq_productos_codigo", "Ya existe un producto registrado con ese codigo.")]
    [InlineData("uq_categorias_nombre", "Ya existe una categoria registrada con ese nombre.")]
    [InlineData("uq_usuarios_username", "Ya existe un usuario registrado con ese nombre de usuario.")]
    [InlineData("uq_usuarios_email", "Ya existe un usuario registrado con ese correo electronico.")]
    [InlineData("otra_restriccion", "Ya existe un registro con ese valor.")]
    public void TraduceViolacionesDeUnicidadAMensajesComprensibles(string restriccion, string mensajeEsperado)
    {
        var ex = PostgresErrorTranslator.Traducir(
            "23505",
            $"llave duplicada viola restriccion de unicidad <<{restriccion}>>");

        Assert.Equal(409, ex.StatusCode);
        Assert.Equal("CONFLICTO_UNICIDAD", ex.Codigo);
        Assert.Equal(mensajeEsperado, ex.Message);
    }

    [Fact]
    public void TraduceViolacionDeClaveForaneaA409()
    {
        var ex = PostgresErrorTranslator.Traducir("23503", "violacion de la restriccion de clave foranea");

        Assert.Equal(409, ex.StatusCode);
        Assert.Equal("CONFLICTO_REFERENCIA", ex.Codigo);
    }

    [Fact]
    public void ConservaElMensajeCuandoNoHayCodigoDeNegocio()
    {
        var ex = PostgresErrorTranslator.Traducir("42601", "syntax error at or near FORM");

        Assert.Equal(400, ex.StatusCode);
        Assert.Equal("ERROR_BASE_DATOS", ex.Codigo);
    }
}
