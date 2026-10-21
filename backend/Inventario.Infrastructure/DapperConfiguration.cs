using Dapper;

namespace Inventario.Infrastructure;

internal static class DapperConfiguration
{
    private static readonly object _candado = new();
    private static bool _configurado;

    internal static void Configurar()
    {
        if (_configurado)
        {
            return;
        }

        lock (_candado)
        {
            if (_configurado)
            {
                return;
            }

            DefaultTypeMap.MatchNamesWithUnderscores = true;
            _configurado = true;
        }
    }
}
