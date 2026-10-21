import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from '@jest/globals';

import { SalidasComponent } from '../salidas.component';
import { Movimiento } from '../../../core/models';
import { crearMovimiento } from '../../../testing/factories';
import { iconos } from '../../../core/icons';

describe('SalidasComponent', () => {
  let componente: SalidasComponent;
  let fixture: ComponentFixture<SalidasComponent>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SalidasComponent],
      providers: [provideIcons(iconos), provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });

    fixture = TestBed.createComponent(SalidasComponent);
    componente = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  const esperar = async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();
  };

  it('renderiza el formulario de salida de mercaderia', () => {
    fixture.detectChanges();
    httpMock.match(() => true);

    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Salida de mercaderia');
    expect(html.querySelector('#cantidad')).toBeTruthy();
  });

  it('carga los productos al inicializarse', async () => {
    fixture.detectChanges();

    httpMock
      .expectOne((req) => req.url === '/api/inventario')
      .flush({ items: [], pagina: 1, tamanoPagina: 100, totalRegistros: 0, totalPaginas: 1 });

    await esperar();
  });

  it('muestra el detalle del ultimo movimiento registrado', () => {
    const movimiento: Movimiento = crearMovimiento({
      productoNombre: 'Guantes de nitrilo',
      tipo: 'Salida',
      tipoDescripcion: 'Salida',
      cantidad: 5,
      stockAnterior: 100,
      stockResultante: 95
    });

    componente.ultimoMovimiento.set(movimiento);
    fixture.detectChanges();
    httpMock.match(() => true);

    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Ultimo movimiento registrado');
    expect(html.textContent).toContain('Guantes de nitrilo');
    expect(html.textContent).toContain('95');
  });
});
