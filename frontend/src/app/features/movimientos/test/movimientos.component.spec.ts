import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from '@jest/globals';

import { MovimientosComponent } from '../movimientos.component';
import { NotificacionService } from '../../../core/services/notificacion.service';
import { iconos } from '../../../core/icons';
import { crearMovimiento, crearPagina } from '../../../testing/factories';

describe('MovimientosComponent', () => {
  let componente: MovimientosComponent;
  let fixture: ComponentFixture<MovimientosComponent>;
  let httpMock: HttpTestingController;
  let notificaciones: NotificacionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MovimientosComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideIcons(iconos)]
    });

    fixture = TestBed.createComponent(MovimientosComponent);
    componente = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    notificaciones = TestBed.inject(NotificacionService);
  });

  afterEach(() => httpMock.verify());

  const esperar = async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();
  };

  const inicializar = async () => {
    fixture.detectChanges();
    httpMock.expectOne((req) => req.url === '/api/movimientos').flush(crearPagina([crearMovimiento()]));
    await esperar();
    fixture.detectChanges();
  };

  it('carga el historial de movimientos', async () => {
    await inicializar();

    expect(componente.movimientos().length).toBe(1);
    expect(componente.totalRegistros()).toBe(1);
    expect(componente.cargando()).toBe(false);
  });

    //Si el stored procedure renombra la columna, Dapper deja el id en 0.
    it('conserva el identificador de cada movimiento', async () => {
    await inicializar();

    expect(componente.movimientos()[0].id).toBe(1);
  });

  it('consulta la primera pagina por defecto', async () => {
    fixture.detectChanges();

    const peticion = httpMock.expectOne((req) => req.url === '/api/movimientos');
    expect(peticion.request.params.get('pagina')).toBe('1');
    expect(peticion.request.params.get('tamano')).toBe('20');
    peticion.flush(crearPagina([]));

    await esperar();
  });

  it('filtra por tipo de movimiento', async () => {
    await inicializar();

    componente.tipo.set('SALIDA');
    const promesa = componente.aplicarFiltros();

    const peticion = httpMock.expectOne((req) => req.url === '/api/movimientos');
    expect(peticion.request.params.get('tipo')).toBe('SALIDA');
    peticion.flush(crearPagina([]));

    await promesa;
  });

  it('filtra por texto libre', async () => {
    await inicializar();

    componente.busqueda.set('carton');
    const promesa = componente.aplicarFiltros();

    const peticion = httpMock.expectOne((req) => req.url === '/api/movimientos');
    expect(peticion.request.params.get('busqueda')).toBe('carton');
    peticion.flush(crearPagina([]));

    await promesa;
  });

  it('filtra por rango de fechas', async () => {
    await inicializar();

    componente.desde.set('2026-01-01');
    componente.hasta.set('2026-12-31');
    const promesa = componente.aplicarFiltros();

    const peticion = httpMock.expectOne((req) => req.url === '/api/movimientos');
    expect(peticion.request.params.get('desde')).toBe('2026-01-01');
    expect(peticion.request.params.get('hasta')).toBe('2026-12-31');
    peticion.flush(crearPagina([]));

    await promesa;
  });

  it('vuelve a la primera pagina al filtrar', async () => {
    await inicializar();

    componente.pagina.set(3);
    componente.tipo.set('ENTRADA');

    const promesa = componente.aplicarFiltros();

    const peticion = httpMock.expectOne((req) => req.url === '/api/movimientos');
    expect(peticion.request.params.get('pagina')).toBe('1');
    peticion.flush(crearPagina([]));

    await promesa;
  });

  it('limpia todos los filtros', async () => {
    await inicializar();

    componente.tipo.set('SALIDA');
    componente.busqueda.set('carton');
    componente.desde.set('2026-01-01');
    componente.hasta.set('2026-12-31');

    const promesa = componente.limpiarFiltros();

    const peticion = httpMock.expectOne((req) => req.url === '/api/movimientos');
    expect(peticion.request.params.has('tipo')).toBe(false);
    expect(peticion.request.params.has('busqueda')).toBe(false);
    expect(peticion.request.params.has('desde')).toBe(false);
    expect(peticion.request.params.has('hasta')).toBe(false);
    peticion.flush(crearPagina([]));

    await promesa;

    expect(componente.tipo()).toBeNull();
    expect(componente.busqueda()).toBe('');
    expect(componente.desde()).toBe('');
    expect(componente.hasta()).toBe('');
  });

  it('cambia de pagina', async () => {
    await inicializar();

    const promesa = componente.cambiarPagina(2);

    const peticion = httpMock.expectOne((req) => req.url === '/api/movimientos');
    expect(peticion.request.params.get('pagina')).toBe('2');
    peticion.flush(crearPagina([crearMovimiento()], { pagina: 2, totalPaginas: 4 }));

    await promesa;

    expect(componente.pagina()).toBe(2);
    expect(componente.totalPaginas()).toBe(4);
  });

  it('notifica el error cuando la API falla', async () => {
    fixture.detectChanges();

    httpMock
      .expectOne((req) => req.url === '/api/movimientos')
      .flush('fallo', { status: 500, statusText: 'Internal Server Error' });

    await esperar();

    expect(notificaciones.notificaciones().length).toBeGreaterThan(0);
    expect(componente.cargando()).toBe(false);
  });

  it('clasifica el tipo de movimiento con la insignia correspondiente', () => {
    expect(componente.claseTipo('Entrada')).toBe('badge--entrada');
    expect(componente.claseTipo('Salida')).toBe('badge--salida');
    expect(componente.claseTipo('AjustePositivo')).toBe('badge--ajuste');
  });

  it('antepone el signo correcto segun el tipo de movimiento', () => {
    expect(componente.signo('Entrada')).toBe('+');
    expect(componente.signo('Salida')).toBe('-');
    expect(componente.signo('AjustePositivo')).toBe('');
  });

  it('formatea el valor de los movimientos', () => {
    expect(componente.formatearMoneda(12500)).toContain('12.500');
  });

  it('renderiza una fila por movimiento', async () => {
    await inicializar();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.querySelectorAll('tbody tr').length).toBe(1);
    expect(html.textContent).toContain('ALM-001');
  });

  it('muestra un mensaje cuando no hay movimientos', async () => {
    fixture.detectChanges();

    httpMock.expectOne((req) => req.url === '/api/movimientos').flush(crearPagina([]));

    await esperar();
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('No hay movimientos registrados');
  });
});
