import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  AjusteRequest,
  Categoria,
  EntradaRequest,
  Movimiento,
  Pagina,
  Producto,
  ProductoRequest,
  ResumenInventario,
  SalidaRequest
} from '../models';

export interface FiltrosInventario {
  busqueda?: string;
  categoriaId?: number | null;
  soloBajoStock?: boolean;
  soloActivos?: boolean;
  ordenarPor?: string;
  dirOrden?: 'asc' | 'desc';
  pagina?: number;
  tamano?: number;
}

export interface FiltrosMovimientos {
  productoId?: number | null;
  tipo?: string | null;
  busqueda?: string;
  desde?: string | null;
  hasta?: string | null;
  pagina?: number;
  tamano?: number;
}

@Injectable({ providedIn: 'root' })
export class InventarioApiService {
  private readonly http = inject(HttpClient);


  async getInventario(filtros: FiltrosInventario = {}): Promise<Pagina<Producto>> {
    let params = new HttpParams();

    //Los filtros de texto se normalizan y se descartan si quedan vacios.
    const busqueda = filtros.busqueda?.trim();
    if (busqueda) {
      params = params.set('busqueda', busqueda);
    }
    if (filtros.categoriaId) {
      params = params.set('categoriaId', filtros.categoriaId);
    }
    if (filtros.soloBajoStock) {
      params = params.set('soloBajoStock', 'true');
    }
    if (filtros.soloActivos === false) {
      params = params.set('soloActivos', 'false');
    }
    if (filtros.ordenarPor) {
      params = params.set('ordenarPor', filtros.ordenarPor);
    }
    if (filtros.dirOrden) {
      params = params.set('dirOrden', filtros.dirOrden);
    }

    params = params.set('pagina', filtros.pagina ?? 1);
    params = params.set('tamano', filtros.tamano ?? 20);

    return firstValueFrom(
      this.http.get<Pagina<Producto>>('/api/inventario', { params })
    );
  }

  async getResumen(): Promise<ResumenInventario> {
    return firstValueFrom(
      this.http.get<ResumenInventario>('/api/inventario/resumen')
    );
  }

  async getCategorias(): Promise<Categoria[]> {
    return firstValueFrom(
      this.http.get<Categoria[]>('/api/inventario/categorias')
    );
  }


  async getProducto(id: number): Promise<Producto> {
    return firstValueFrom(this.http.get<Producto>(`/api/productos/${id}`));
  }

  async crearProducto(request: ProductoRequest): Promise<Producto> {
    return firstValueFrom(this.http.post<Producto>('/api/productos', request));
  }

  async actualizarProducto(id: number, request: ProductoRequest): Promise<Producto> {
    return firstValueFrom(this.http.put<Producto>(`/api/productos/${id}`, request));
  }

  async darDeBajaProducto(id: number): Promise<{ exitoso: boolean; mensaje: string }> {
    return firstValueFrom(
      this.http.delete<{ exitoso: boolean; mensaje: string }>(`/api/productos/${id}`)
    );
  }


  async registrarEntrada(request: EntradaRequest): Promise<Movimiento> {
    return firstValueFrom(
      this.http.post<Movimiento>('/api/movimientos/entradas', request)
    );
  }

  async registrarSalida(request: SalidaRequest): Promise<Movimiento> {
    return firstValueFrom(
      this.http.post<Movimiento>('/api/movimientos/salidas', request)
    );
  }

  async registrarAjuste(request: AjusteRequest): Promise<Movimiento> {
    return firstValueFrom(
      this.http.post<Movimiento>('/api/movimientos/ajustes', request)
    );
  }

  async getMovimientos(filtros: FiltrosMovimientos = {}): Promise<Pagina<Movimiento>> {
    let params = new HttpParams();

    if (filtros.productoId) {
      params = params.set('productoId', filtros.productoId);
    }
    if (filtros.tipo) {
      params = params.set('tipo', filtros.tipo);
    }
    const busqueda = filtros.busqueda?.trim();
    if (busqueda) {
      params = params.set('busqueda', busqueda);
    }
    if (filtros.desde) {
      params = params.set('desde', filtros.desde);
    }
    if (filtros.hasta) {
      params = params.set('hasta', filtros.hasta);
    }

    params = params.set('pagina', filtros.pagina ?? 1);
    params = params.set('tamano', filtros.tamano ?? 20);

    return firstValueFrom(
      this.http.get<Pagina<Movimiento>>('/api/movimientos', { params })
    );
  }
}
