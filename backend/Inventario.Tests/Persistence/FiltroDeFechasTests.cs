using System.Reflection;

namespace Inventario.Tests.Persistence;

//El filtro de fechas del historial se resuelve por nombre de funcion en
//PostgreSQL. Si el tipo del parametro en C# no coincide con el declarado en
//el stored procedure, la llamada falla con "no existe la funcion" y el filtro
//deja de funcionar. Estos tests fijan el contrato entre las dos partes.
public class FiltroDeFechasTests
{
    private static string RutaSql()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);

        while (dir != null)
        {
            var candidato = Path.Combine(dir.FullName, "database", "02_stored_procedures.sql");
            if (File.Exists(candidato))
            {
                return candidato;
            }

            dir = dir.Parent;
        }

        throw new FileNotFoundException("No se encontro database/02_stored_procedures.sql");
    }

    private static string Sql() => File.ReadAllText(RutaSql());

    [Fact]
    public void ElStoredProcedureDeclaraLasFechasComoTimestamp()
    {
        // Npgsql envia un DateTime como "timestamp without time zone". Si el
        // procedimiento declara DATE, la firma no coincide y la consulta falla.
        var sql = Sql();

        Assert.Contains("p_desde            TIMESTAMP", sql, StringComparison.Ordinal);
        Assert.Contains("p_hasta            TIMESTAMP", sql, StringComparison.Ordinal);
    }

    [Fact]
    public void ElStoredProcedureComparaLasFechasComoDate()
    {
        var sql = Sql();

        Assert.Contains("m.creado_en::DATE >= p_desde::DATE", sql, StringComparison.Ordinal);
        Assert.Contains("m.creado_en::DATE <= p_hasta::DATE", sql, StringComparison.Ordinal);
    }

    [Fact]
    public void ElRepositorioEnviaLasFechasComoDateTime()
    {
        var tipo = typeof(Inventario.Infrastructure.Repositories.InventarioRepository);
        var metodo = tipo.GetMethod("GetMovimientosAsync");

        Assert.NotNull(metodo);

        var parametros = metodo!.GetParameters();
        var desde = parametros.Single(p => p.Name == "desde");
        var hasta = parametros.Single(p => p.Name == "hasta");

        Assert.Equal(typeof(DateTime?), desde.ParameterType);
        Assert.Equal(typeof(DateTime?), hasta.ParameterType);
    }
}
