using System.ComponentModel.DataAnnotations;

namespace Inventario.Application.DTOs;

public class EntradaRequest
{
    [Required(ErrorMessage = "El producto es obligatorio.")]
    [Range(1, long.MaxValue, ErrorMessage = "El producto es obligatorio.")]
    public long ProductoId { get; set; }

    [Required(ErrorMessage = "La cantidad es obligatoria.")]
    [Range(1, 1_000_000, ErrorMessage = "La cantidad debe ser mayor a cero.")]
    public int Cantidad { get; set; }

    [Range(0, 99_999_999.99, ErrorMessage = "El precio unitario no puede ser negativo.")]
    public decimal? PrecioUnitario { get; set; }

    [StringLength(255, ErrorMessage = "El motivo no puede exceder 255 caracteres.")]
    public string? Motivo { get; set; }

    [StringLength(100, ErrorMessage = "La referencia no puede exceder 100 caracteres.")]
    public string? Referencia { get; set; }
}

public class SalidaRequest
{
    [Required(ErrorMessage = "El producto es obligatorio.")]
    [Range(1, long.MaxValue, ErrorMessage = "El producto es obligatorio.")]
    public long ProductoId { get; set; }

    [Required(ErrorMessage = "La cantidad es obligatoria.")]
    [Range(1, 1_000_000, ErrorMessage = "La cantidad debe ser mayor a cero.")]
    public int Cantidad { get; set; }

    [StringLength(255, ErrorMessage = "El motivo no puede exceder 255 caracteres.")]
    public string? Motivo { get; set; }

    [StringLength(100, ErrorMessage = "La referencia no puede exceder 100 caracteres.")]
    public string? Referencia { get; set; }
}

public class AjusteRequest
{
    [Required(ErrorMessage = "El producto es obligatorio.")]
    [Range(1, long.MaxValue, ErrorMessage = "El producto es obligatorio.")]
    public long ProductoId { get; set; }

    [Required(ErrorMessage = "El stock final es obligatorio.")]
    [Range(0, 100_000_000, ErrorMessage = "El stock final no puede ser negativo.")]
    public int StockFinal { get; set; }

    [StringLength(255, ErrorMessage = "El motivo no puede exceder 255 caracteres.")]
    public string? Motivo { get; set; }

    [StringLength(100, ErrorMessage = "La referencia no puede exceder 100 caracteres.")]
    public string? Referencia { get; set; }
}

public class ProductoRequest
{
    [Required(ErrorMessage = "El codigo es obligatorio.")]
    [StringLength(30, MinimumLength = 2, ErrorMessage = "El codigo debe tener entre 2 y 30 caracteres.")]
    public string Codigo { get; set; } = string.Empty;

    [Required(ErrorMessage = "El nombre es obligatorio.")]
    [StringLength(150, MinimumLength = 2, ErrorMessage = "El nombre debe tener entre 2 y 150 caracteres.")]
    public string Nombre { get; set; } = string.Empty;

    [StringLength(500, ErrorMessage = "La descripcion no puede exceder 500 caracteres.")]
    public string? Descripcion { get; set; }

    [Required(ErrorMessage = "La categoria es obligatoria.")]
    [Range(1, long.MaxValue, ErrorMessage = "La categoria es obligatoria.")]
    public long CategoriaId { get; set; }

    [Range(0, 99_999_999.99, ErrorMessage = "El precio no puede ser negativo.")]
    public decimal PrecioUnitario { get; set; }

    [Range(0, 100_000_000, ErrorMessage = "El stock minimo no puede ser negativo.")]
    public int StockMinimo { get; set; }

    [Range(0, 1_000_000, ErrorMessage = "El stock inicial no puede ser negativo.")]
    public int StockInicial { get; set; }

    public bool Activo { get; set; } = true;
}
