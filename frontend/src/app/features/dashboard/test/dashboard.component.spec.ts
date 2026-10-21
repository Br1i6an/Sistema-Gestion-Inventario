import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from '@jest/globals';

import { DashboardComponent } from '../dashboard.component';
import { NotificacionService } from '../../../core/services/notificacion.service';
import { iconos } from '../../../core/icons';
import {
  crearMovimiento,
  crearPagina,
  crearProducto,
  crearResumen
} from '../../../testing/factories';

describe('DashboardComponent', () => {
  let componente: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let httpMock: HttpTestingController;
  let notificaciones: NotificacionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideIcons(iconos)]
    });

    fixture = TestBed.createComponent(DashboardComponent);
    componente = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    notificaciones = TestBed.inject(NotificacionService);
  });

  afterEach(() => httpMock.verify());

  const esperar = async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();
  };

  const responderCarga = (productos = [crearProducto()]) => {
    httpMock.expectOne((req) => req.url === '/api/inventario/resumen').flush(crearResumen());

    httpMock.expectOne((req) => req.url === '/api/movimientos').flush(
      crearPagina([
        crearMovimiento(),
        crearMovimiento({ id: 2, tipo: 'Salida', tipoDescripcion: 'Salida' })
      ])
    );

    httpMock.expectOne((req) => req.url === '/api/inventario').flush(crearPagina(productos));
  };

  const renderizar = async (productos?: Parameters<typeof responderCarga>[0]) => {
    fixture.detectChanges();
    responderCarga(productos);
    await esperar();
    fixture.detectChanges();
  };

  it('carga el resumen, los movimientos recientes y los productos criticos', async () => {
    await renderizar();

    expect(componente.resumen()?.totalProductos).toBe(18);
    expect(componente.ultimosMovimientos().length).toBe(2);
    expect(componente.productosCriticos().length).toBe(1);
    expect(componente.cargando()).toBe(false);
  });

  it('muestra el indicador de carga mientras obtiene los datos', () => {
    fixture.detectChanges();

    expect(componente.cargando()).toBe(true);

    responderCarga();
  });

  it('notifica el error si alguna de las peticiones falla', async () => {
    fixture.detectChanges();

    httpMock
      .expectOne((req) => req.url === '/api/inventario/resumen')
      .flush('fallo', { status: 500, statusText: 'Internal Server Error' });

    //Se cancelan las peticiones que quedaron en vuelo.
    httpMock.match(() => true);

    await esperar();

    expect(notificaciones.notificaciones().length).toBeGreaterThan(0);
    expect(componente.cargando()).toBe(false);
  });

  it('vuelve a cargar los datos al invocar cargar()', async () => {
    await renderizar();

    const promesa = componente.cargar();
    responderCarga();
    await promesa;

    expect(componente.resumen()?.totalProductos).toBe(18);
  });

  it('formatea los valores monetarios en pesos colombianos', () => {
    const resultado = componente.formatearMoneda(6864479);

    expect(resultado).toContain('6.864.479');
  });

  it('formatea los numeros con separador de miles', () => {
    expect(componente.formatearNumero(2636)).toBe('2.636');
  });

  it('clasifica el estado de stock con la clase de insignia correcta', () => {
    expect(componente.claseEstado('Agotado')).toBe('badge--agotado');
    expect(componente.claseEstado('Bajo')).toBe('badge--bajo');
    expect(componente.claseEstado('Normal')).toBe('badge--normal');
  });

  it('renderiza las tarjetas de indicadores con los valores del resumen', async () => {
    await renderizar();

    const html = fixture.nativeElement as HTMLElement;
    const texto = html.textContent ?? '';

    expect(texto).toContain('Productos activos');
    expect(texto).toContain('Valor del inventario');
    expect(texto).toContain('Requieren atencion');
    expect(texto).toContain('Movimientos del mes');
  });

  it('lista los productos que requieren atencion', async () => {
    await renderizar([
      crearProducto({ id: 1, nombre: 'Desinfectante', estadoStock: 'Bajo', stockActual: 4 }),
      crearProducto({ id: 2, nombre: 'Hub USB', estadoStock: 'Agotado', stockActual: 0 })
    ]);

    const html = fixture.nativeElement as HTMLElement;

    expect(html.textContent).toContain('Desinfectante');
    expect(html.textContent).toContain('Hub USB');
    expect(html.textContent).toContain('Agotado');
  });

  it('muestra un mensaje amigable cuando no hay productos que requieran atencion', async () => {
    await renderizar([]);

    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Todo en orden');
  });

  it('muestra la actividad reciente con el detalle de cada movimiento', async () => {
    await renderizar();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Actividad reciente');
  });
});
