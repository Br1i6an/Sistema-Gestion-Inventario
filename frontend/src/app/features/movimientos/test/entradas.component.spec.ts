import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from '@jest/globals';

import { EntradasComponent } from '../entradas.component';
import { Movimiento } from '../../../core/models';
import { crearMovimiento } from '../../../testing/factories';
import { iconos } from '../../../core/icons';

describe('EntradasComponent', () => {
  let componente: EntradasComponent;
  let fixture: ComponentFixture<EntradasComponent>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EntradasComponent],
      providers: [provideIcons(iconos), provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });

    fixture = TestBed.createComponent(EntradasComponent);
    componente = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  const esperar = async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();
  };

  it('renderiza el formulario de entrada de mercaderia', () => {
    fixture.detectChanges();
    httpMock.match(() => true);

    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Entrada de mercaderia');
    expect(html.querySelector('#cantidad')).toBeTruthy();
    expect(html.querySelector('#stockFinal')).toBeNull();
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
      productoNombre: 'Caja de carton',
      cantidad: 25,
      stockAnterior: 100,
      stockResultante: 125
    });

    componente.ultimoMovimiento.set(movimiento);
    fixture.detectChanges();
    httpMock.match(() => true);

    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Ultimo movimiento registrado');
    expect(html.textContent).toContain('Caja de carton');
    expect(html.textContent).toContain('100');
    expect(html.textContent).toContain('125');
  });

  it('no muestra el panel hasta que se registra un movimiento', () => {
    fixture.detectChanges();
    httpMock.match(() => true);

    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).not.toContain('Ultimo movimiento registrado');
  });
});
