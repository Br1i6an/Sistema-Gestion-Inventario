namespace Inventario.Application.DTOs;

public class PagedResult<T>
{
    public IReadOnlyList<T> Items { get; set; } = Array.Empty<T>();
    public int Pagina { get; set; }
    public int TamanoPagina { get; set; }
    public long TotalRegistros { get; set; }
    public int TotalPaginas => TamanoPagina <= 0 ? 0 : (int)Math.Ceiling(TotalRegistros / (double)TamanoPagina);
    public bool TienePaginaAnterior => Pagina > 1;
    public bool TienePaginaSiguiente => Pagina < TotalPaginas;
}

public class OperationResult
{
    public bool Exitoso { get; set; }
    public string Mensaje { get; set; } = string.Empty;

    public static OperationResult Ok(string mensaje) => new() { Exitoso = true, Mensaje = mensaje };
    public static OperationResult Fail(string mensaje) => new() { Exitoso = false, Mensaje = mensaje };
}
