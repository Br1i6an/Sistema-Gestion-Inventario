import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from '@jest/globals';

import { InventarioComponent } from '../inventario.component';
import { NotificacionService } from '../../../core/services/notificacion.service';
import { iconos } from '../../../core/icons';
import { crearCategoria, crearPagina, crearProducto } from '../../../testing/factories';

describe('InventarioComponent', () => {
  let componente: InventarioComponent;
  let fixture: ComponentFixture<InventarioComponent>;
  let httpMock: HttpTestingController;
  let notificaciones: NotificacionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InventarioComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideIcons(iconos)]
    });

    fixture = TestBed.createComponent(InventarioComponent);
    componente = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    notificaciones = TestBed.inject(NotificacionService);
  });

  afterEach(() => httpMock.verify());

  const esperar = async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();
  };

  const responderCategorias = () => {
    httpMock.expectOne('/api/inventario/categorias').flush([crearCategoria()]);
  };

  const responderInventario = (pagina = crearPagina([crearProducto()], { totalRegistros: 1, totalPaginas: 1 })) => {
    httpMock.expectOne((req) => req.url === '/api/inventario').flush(pagina);
  };

  const inicializar = async () => {
    fixture.detectChanges();
    responderCategorias();
    await esperar();
    responderInventario();
    await esperar();
    fixture.detectChanges();
  };

  it('carga las categorias y el inventario al inicializarse', async () => {
    await inicializar();

    expect(componente.categorias().length).toBe(1);
    expect(componente.productos().length).toBe(1);
    expect(componente.totalRegistros()).toBe(1);
    expect(componente.cargando()).toBe(false);
  });

  it('consulta el inventario con los filtros por defecto', async () => {
    fixture.detectChanges();

    responderCategorias();
    await esperar();

    const peticion = httpMock.expectOne((req) => req.url === '/api/inventario');
    expect(peticion.request.params.get('pagina')).toBe('1');
    expect(peticion.request.params.get('tamano')).toBe('20');
    expect(peticion.request.params.get('ordenarPor')).toBe('nombre');
    peticion.flush(crearPagina([]));

    await esperar();
  });

  it('envia el texto de busqueda a la API', async () => {
    await inicializar();

    componente.busqueda.set('  guante  ');
    const promesa = componente.aplicarFiltros();

    const peticion = httpMock.expectOne((req) => req.url === '/api/inventario');
    expect(peticion.request.params.get('busqueda')).toBe('guante');
    peticion.flush(crearPagina([]));

    await promesa;
  });

  it('vuelve a la primera pagina al aplicar un filtro', async () => {
    await inicializar();

    componente.pagina.set(4);
    componente.busqueda.set('carton');

    const promesa = componente.aplicarFiltros();

    const peticion = httpMock.expectOne((req) => req.url === '/api/inventario');
    expect(peticion.request.params.get('pagina')).toBe('1');
    peticion.flush(crearPagina([]));

    await promesa;
  });

  it('envia el filtro de categoria', async () => {
    await inicializar();

    componente.categoriaId.set(3);
    const promesa = componente.aplicarFiltros();

    const peticion = httpMock.expectOne((req) => req.url === '/api/inventario');
    expect(peticion.request.params.get('categoriaId')).toBe('3');
    peticion.flush(crearPagina([]));

    await promesa;
  });

  it('limpia todos los filtros', async () => {
    await inicializar();

    componente.busqueda.set('guante');
    componente.categoriaId.set(3);
    componente.soloBajoStock.set(true);
    componente.soloActivos.set(false);
    componente.ordenarPor.set('stock');
    componente.dirOrden.set('desc');

    const promesa = componente.limpiarFiltros();

    const peticion = httpMock.expectOne((req) => req.url === '/api/inventario');
    expect(peticion.request.params.has('busqueda')).toBe(false);
    expect(peticion.request.params.has('categoriaId')).toBe(false);
    expect(peticion.request.params.has('soloBajoStock')).toBe(false);
    peticion.flush(crearPagina([]));

    await promesa;

    expect(componente.busqueda()).toBe('');
    expect(componente.categoriaId()).toBeNull();
    expect(componente.soloBajoStock()).toBe(false);
    expect(componente.soloActivos()).toBe(true);
    expect(componente.ordenarPor()).toBe('nombre');
    expect(componente.dirOrden()).toBe('asc');
  });

  it('alterna la direccion al ordenar por la misma columna dos veces', async () => {
    await inicializar();

    componente.ordenarPor.set('nombre');
    componente.dirOrden.set('asc');

    const primera = componente.ordenar('nombre');
    const peticion1 = httpMock.expectOne((req) => req.url === '/api/inventario');
    expect(peticion1.request.params.get('dirOrden')).toBe('desc');
    peticion1.flush(crearPagina([]));
    await primera;

    const segunda = componente.ordenar('nombre');
    const peticion2 = httpMock.expectOne((req) => req.url === '/api/inventario');
    expect(peticion2.request.params.get('dirOrden')).toBe('asc');
    peticion2.flush(crearPagina([]));
    await segunda;
  });

  it('usa orden descendente por defecto en las columnas numericas', async () => {
    await inicializar();

    const promesa = componente.ordenar('stock');

    const peticion = httpMock.expectOne((req) => req.url === '/api/inventario');
    expect(peticion.request.params.get('ordenarPor')).toBe('stock');
    expect(peticion.request.params.get('dirOrden')).toBe('desc');
    peticion.flush(crearPagina([]));

    await promesa;
  });

  it('usa orden ascendente por defecto en las columnas de texto', async () => {
    await inicializar();

    //Se parte de otra columna para que aplique el valor por defecto.
    componente.ordenarPor.set('precio');

    const promesa = componente.ordenar('nombre');

    const peticion = httpMock.expectOne((req) => req.url === '/api/inventario');
    expect(peticion.request.params.get('dirOrden')).toBe('asc');
    peticion.flush(crearPagina([]));

    await promesa;
  });

  it('cambia de pagina al solicitarlo', async () => {
    await inicializar();

    const promesa = componente.cambiarPagina(3);

    const peticion = httpMock.expectOne((req) => req.url === '/api/inventario');
    expect(peticion.request.params.get('pagina')).toBe('3');
    peticion.flush(crearPagina([crearProducto()], { pagina: 3, totalPaginas: 5 }));

    await promesa;

    expect(componente.pagina()).toBe(3);
    expect(componente.totalPaginas()).toBe(5);
  });

  it('notifica el error cuando la API falla', async () => {
    fixture.detectChanges();

    responderCategorias();
    await esperar();

    httpMock
      .expectOne((req) => req.url === '/api/inventario')
      .flush('fallo', { status: 500, statusText: 'Internal Server Error' });

    await esperar();

    expect(notificaciones.notificaciones().length).toBeGreaterThan(0);
    expect(componente.cargando()).toBe(false);
  });

  it('clasifica el estado de stock con la insignia correspondiente', () => {
    expect(componente.claseEstado('Agotado')).toBe('badge--agotado');
    expect(componente.claseEstado('Bajo')).toBe('badge--bajo');
    expect(componente.claseEstado('Normal')).toBe('badge--normal');
  });

  it('muestra la flecha de orden solo en la columna activa', () => {
    componente.ordenarPor.set('stock');
    componente.dirOrden.set('desc');

    expect(componente.flechaOrden('stock')).toBe('↓');
    expect(componente.flechaOrden('nombre')).toBe('');

    componente.dirOrden.set('asc');

    expect(componente.flechaOrden('stock')).toBe('↑');
  });

  it('formatea los precios con dos decimales', () => {
    expect(componente.formatearMoneda(850.5)).toContain('850,50');
  });

  it('renderiza una fila por producto en la tabla', async () => {
    await inicializar();

    const html = fixture.nativeElement as HTMLElement;
    const filas = html.querySelectorAll('tbody tr');

    expect(filas.length).toBe(1);
    expect(html.textContent).toContain('ALM-001');
  });

  it('muestra un mensaje cuando no hay resultados', async () => {
    fixture.detectChanges();

    responderCategorias();
    await esperar();

    httpMock.expectOne((req) => req.url === '/api/inventario').flush(crearPagina([]));

    await esperar();
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('No se encontraron productos');
  });
});
