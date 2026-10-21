
export type EstadoStock = 'Agotado' | 'Bajo' | 'Normal';
export type TipoMovimiento = 'Entrada' | 'Salida' | 'AjustePositivo' | 'AjusteNegativo';
export type RolUsuario = 'ADMIN' | 'OPERADOR' | 'LECTURA';

export interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  categoriaId: number;
  categoriaNombre: string;
  precioUnitario: number;
  stockActual: number;
  stockMinimo: number;
  stockFaltante: number;
  estadoStock: EstadoStock;
  valorTotal: number;
  activo: boolean;
  creadoEn?: string | null;
  actualizadoEn: string;
}

export interface Movimiento {
  id: number;
  productoId: number;
  productoCodigo: string;
  productoNombre: string;
  tipo: TipoMovimiento;
  tipoDescripcion: string;
  cantidad: number;
  stockAnterior: number;
  stockResultante: number;
  precioUnitario: number;
  valorTotal: number;
  motivo: string | null;
  referencia: string | null;
  usuarioId: number | null;
  usuarioNombre: string | null;
  creadoEn: string;
}

export interface Categoria {
  id: number;
  nombre: string;
  descripcion: string | null;
  totalProductos: number;
}

export interface ResumenInventario {
  totalProductos: number;
  productosActivos: number;
  productosAgotados: number;
  productosStockBajo: number;
  totalUnidades: number;
  valorInventario: number;
  entradasUltimoMes: number;
  salidasUltimoMes: number;
  movimientosTotal: number;
}

export interface Usuario {
  id: number;
  username: string;
  email: string;
  nombreCompleto: string;
  rol: RolUsuario;
  activo: boolean;
  ultimoAcceso: string | null;
}

export interface Pagina<T> {
  items: T[];
  pagina: number;
  tamanoPagina: number;
  totalRegistros: number;
  totalPaginas: number;
  tienePaginaAnterior: boolean;
  tienePaginaSiguiente: boolean;
}

export interface RespuestaAuth {
  exitoso: boolean;
  mensaje: string;
  accessToken: string | null;
  refreshToken: string | null;
  tokenType: string;
  expiracion: string | null;
  usuario: Usuario | null;
}

export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  codigo?: string;
  traceId?: string;
}


export interface EntradaRequest {
  productoId: number;
  cantidad: number;
  precioUnitario?: number | null;
  motivo?: string | null;
  referencia?: string | null;
}

export interface SalidaRequest {
  productoId: number;
  cantidad: number;
  motivo?: string | null;
  referencia?: string | null;
}

export interface AjusteRequest {
  productoId: number;
  stockFinal: number;
  motivo?: string | null;
  referencia?: string | null;
}

export interface ProductoRequest {
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  categoriaId: number;
  precioUnitario: number;
  stockMinimo: number;
  stockInicial?: number;
  activo?: boolean;
}
