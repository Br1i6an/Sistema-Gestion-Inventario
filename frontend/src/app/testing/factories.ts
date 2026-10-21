/* =============================================================================
 *  Fabricas de datos de prueba.
 *
 *  Permiten construir los objetos que devuelve la API (productos, movimientos,
 *  categorias, etc.) sin depender de una base de datos real, de modo que los
 *  tests sean rapidos y deterministas.
 * ============================================================================= */

import {
  Categoria,
  Movimiento,
  Pagina,
  Producto,
  RespuestaAuth,
  ResumenInventario,
  Usuario
} from '../core/models';

export function crearProducto(overrides: Partial<Producto> = {}): Producto {
  return {
    id: 1,
    codigo: 'ALM-001',
    nombre: 'Caja de carton 30x40',
    descripcion: 'Caja de empaque carton corrugado',
    categoriaId: 1,
    categoriaNombre: 'Almacen',
    precioUnitario: 1250,
    stockActual: 100,
    stockMinimo: 10,
    stockFaltante: 0,
    estadoStock: 'Normal',
    valorTotal: 125000,
    activo: true,
    creadoEn: '2026-01-01T10:00:00Z',
    actualizadoEn: '2026-01-01T10:00:00Z',
    ...overrides
  };
}

export function crearMovimiento(overrides: Partial<Movimiento> = {}): Movimiento {
  return {
    id: 1,
    productoId: 1,
    productoCodigo: 'ALM-001',
    productoNombre: 'Caja de carton 30x40',
    tipo: 'Entrada',
    tipoDescripcion: 'Entrada',
    cantidad: 10,
    stockAnterior: 90,
    stockResultante: 100,
    precioUnitario: 1250,
    valorTotal: 12500,
    motivo: 'Compra a proveedor',
    referencia: 'FAC-001',
    usuarioId: 1,
    usuarioNombre: 'Administrador del Sistema',
    creadoEn: '2026-01-01T10:00:00Z',
    ...overrides
  };
}

export function crearCategoria(overrides: Partial<Categoria> = {}): Categoria {
  return {
    id: 1,
    nombre: 'Almacen',
    descripcion: 'Insumos y mercaderia general de almacen',
    totalProductos: 3,
    ...overrides
  };
}

export function crearUsuario(overrides: Partial<Usuario> = {}): Usuario {
  return {
    id: 1,
    username: 'admin',
    email: 'admin@inventario.local',
    nombreCompleto: 'Administrador del Sistema',
    rol: 'ADMIN',
    activo: true,
    ultimoAcceso: '2026-01-01T10:00:00Z',
    ...overrides
  };
}

export function crearResumen(overrides: Partial<ResumenInventario> = {}): ResumenInventario {
  return {
    totalProductos: 18,
    productosActivos: 18,
    productosAgotados: 1,
    productosStockBajo: 1,
    totalUnidades: 2636,
    valorInventario: 6864479,
    entradasUltimoMes: 13,
    salidasUltimoMes: 6,
    movimientosTotal: 50,
    ...overrides
  };
}

export function crearPagina<T>(items: T[], overrides: Partial<Pagina<T>> = {}): Pagina<T> {
  const totalRegistros = overrides.totalRegistros ?? items.length;

  return {
    items,
    pagina: 1,
    tamanoPagina: 20,
    totalRegistros,
    totalPaginas: Math.ceil(totalRegistros / (overrides.tamanoPagina ?? 20)),
    tienePaginaAnterior: false,
    tienePaginaSiguiente: false,
    ...overrides
  };
}

export function crearRespuestaAuth(overrides: Partial<RespuestaAuth> = {}): RespuestaAuth {
  return {
    exitoso: true,
    mensaje: 'Autenticacion exitosa.',
    accessToken: 'token-de-acceso',
    refreshToken: 'token-de-refresco',
    tokenType: 'Bearer',
    expiracion: '2026-01-01T11:00:00Z',
    usuario: crearUsuario(),
    ...overrides
  };
}

export const TOKEN_FALSO = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.firma';
