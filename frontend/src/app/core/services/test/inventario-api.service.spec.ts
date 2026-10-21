import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';

import { InventarioApiService } from '../inventario-api.service';
import {
  crearCategoria,
  crearMovimiento,
  crearPagina,
  crearProducto,
  crearResumen
} from '../../../testing/factories';

describe('InventarioApiService', () => {
  let servicio: InventarioApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    servicio = TestBed.inject(InventarioApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('getInventario', () => {
    it('consulta /api/inventario con la paginacion por defecto', async () => {
      const promesa = servicio.getInventario();

      const peticion = httpMock.expectOne(
        (req) => req.url === '/api/inventario'
      );
      expect(peticion.request.method).toBe('GET');
      expect(peticion.request.params.get('pagina')).toBe('1');
      expect(peticion.request.params.get('tamano')).toBe('20');

      peticion.flush(crearPagina([crearProducto()]));

      const resultado = await promesa;
      expect(resultado.items.length).toBe(1);
      expect(resultado.items[0].codigo).toBe('ALM-001');
    });

    it('traduce los filtros a query params', async () => {
      const promesa = servicio.getInventario({
        busqueda: 'guante',
        categoriaId: 2,
        soloBajoStock: true,
        soloActivos: false,
        ordenarPor: 'stock',
        dirOrden: 'desc',
        pagina: 3,
        tamano: 50
      });

      const peticion = httpMock.expectOne((req) => req.url === '/api/inventario');
      const params = peticion.request.params;

      expect(params.get('busqueda')).toBe('guante');
      expect(params.get('categoriaId')).toBe('2');
      expect(params.get('soloBajoStock')).toBe('true');
      expect(params.get('soloActivos')).toBe('false');
      expect(params.get('ordenarPor')).toBe('stock');
      expect(params.get('dirOrden')).toBe('desc');
      expect(params.get('pagina')).toBe('3');
      expect(params.get('tamano')).toBe('50');

      peticion.flush(crearPagina([], { pagina: 3, tamanoPagina: 50, totalRegistros: 0 }));
      await promesa;
    });

    it('omite los parametros opcionales cuando no se informan', async () => {
      const promesa = servicio.getInventario({ busqueda: '  ' });

      const peticion = httpMock.expectOne((req) => req.url === '/api/inventario');
      expect(peticion.request.params.has('busqueda')).toBe(false);
      expect(peticion.request.params.has('categoriaId')).toBe(false);
      expect(peticion.request.params.has('soloBajoStock')).toBe(false);

      peticion.flush(crearPagina([]));
      await promesa;
    });
  });

  it('getResumen consulta /api/inventario/resumen', async () => {
    const promesa = servicio.getResumen();

    const peticion = httpMock.expectOne('/api/inventario/resumen');
    expect(peticion.request.method).toBe('GET');
    peticion.flush(crearResumen());

    const resumen = await promesa;
    expect(resumen.totalProductos).toBe(18);
    expect(resumen.valorInventario).toBe(6864479);
  });

  it('getCategorias consulta /api/inventario/categorias', async () => {
    const promesa = servicio.getCategorias();

    const peticion = httpMock.expectOne('/api/inventario/categorias');
    expect(peticion.request.method).toBe('GET');
    peticion.flush([crearCategoria()]);

    const categorias = await promesa;
    expect(categorias.length).toBe(1);
    expect(categorias[0].nombre).toBe('Almacen');
  });

  describe('Productos', () => {
    it('getProducto consulta el recurso por id', async () => {
      const promesa = servicio.getProducto(7);

      const peticion = httpMock.expectOne('/api/productos/7');
      expect(peticion.request.method).toBe('GET');
      peticion.flush(crearProducto({ id: 7 }));

      const producto = await promesa;
      expect(producto.id).toBe(7);
    });

    it('crearProducto envia un POST con el cuerpo del producto', async () => {
      const cuerpo = {
        codigo: 'NUE-001',
        nombre: 'Producto nuevo',
        descripcion: 'Descripcion',
        categoriaId: 1,
        precioUnitario: 500,
        stockMinimo: 5,
        stockInicial: 10,
        activo: true
      };

      const promesa = servicio.crearProducto(cuerpo);

      const peticion = httpMock.expectOne('/api/productos');
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual(cuerpo);
      peticion.flush(crearProducto({ id: 19, codigo: 'NUE-001' }));

      const producto = await promesa;
      expect(producto.id).toBe(19);
    });

    it('actualizarProducto envia un PUT al recurso por id', async () => {
      const cuerpo = {
        codigo: 'ALM-001',
        nombre: 'Nombre editado',
        descripcion: null,
        categoriaId: 1,
        precioUnitario: 1000,
        stockMinimo: 8,
        activo: true
      };

      const promesa = servicio.actualizarProducto(3, cuerpo);

      const peticion = httpMock.expectOne('/api/productos/3');
      expect(peticion.request.method).toBe('PUT');
      expect(peticion.request.body).toEqual(cuerpo);
      peticion.flush(crearProducto({ id: 3, nombre: 'Nombre editado' }));

      await promesa;
    });

    it('darDeBajaProducto envia un DELETE al recurso por id', async () => {
      const promesa = servicio.darDeBajaProducto(3);

      const peticion = httpMock.expectOne('/api/productos/3');
      expect(peticion.request.method).toBe('DELETE');
      peticion.flush({ exitoso: true, mensaje: 'Producto dado de baja correctamente.' });

      const resultado = await promesa;
      expect(resultado.exitoso).toBe(true);
    });
  });

  describe('Movimientos', () => {
    it('registrarEntrada envia un POST a /api/movimientos/entradas', async () => {
      const cuerpo = {
        productoId: 1,
        cantidad: 25,
        precioUnitario: 1250,
        motivo: 'Compra',
        referencia: 'FAC-1'
      };

      const promesa = servicio.registrarEntrada(cuerpo);

      const peticion = httpMock.expectOne('/api/movimientos/entradas');
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual(cuerpo);
      peticion.flush(crearMovimiento({ tipo: 'Entrada', cantidad: 25 }));

      const movimiento = await promesa;
      expect(movimiento.tipo).toBe('Entrada');
    });

    it('registrarSalida envia un POST a /api/movimientos/salidas', async () => {
      const cuerpo = { productoId: 1, cantidad: 5, motivo: 'Despacho', referencia: 'GR-1' };

      const promesa = servicio.registrarSalida(cuerpo);

      const peticion = httpMock.expectOne('/api/movimientos/salidas');
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual(cuerpo);
      peticion.flush(crearMovimiento({ tipo: 'Salida', cantidad: 5 }));

      await promesa;
    });

    it('registrarAjuste envia un POST a /api/movimientos/ajustes', async () => {
      const cuerpo = { productoId: 1, stockFinal: 50, motivo: 'Conteo', referencia: 'AJ-1' };

      const promesa = servicio.registrarAjuste(cuerpo);

      const peticion = httpMock.expectOne('/api/movimientos/ajustes');
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual(cuerpo);
      peticion.flush(crearMovimiento({ tipo: 'AjustePositivo' }));

      await promesa;
    });

    it('getMovimientos aplica todos los filtros disponibles', async () => {
      const promesa = servicio.getMovimientos({
        productoId: 4,
        tipo: 'ENTRADA',
        busqueda: 'carton',
        desde: '2026-01-01',
        hasta: '2026-12-31',
        pagina: 2,
        tamano: 15
      });

      const peticion = httpMock.expectOne((req) => req.url === '/api/movimientos');
      const params = peticion.request.params;

      expect(params.get('productoId')).toBe('4');
      expect(params.get('tipo')).toBe('ENTRADA');
      expect(params.get('busqueda')).toBe('carton');
      expect(params.get('desde')).toBe('2026-01-01');
      expect(params.get('hasta')).toBe('2026-12-31');
      expect(params.get('pagina')).toBe('2');
      expect(params.get('tamano')).toBe('15');

      peticion.flush(crearPagina([crearMovimiento()], { pagina: 2 }));
      await promesa;
    });
  });
});
