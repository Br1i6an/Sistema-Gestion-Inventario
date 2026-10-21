import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from '@jest/globals';

import { AjustesComponent } from '../ajustes.component';
import { Movimiento } from '../../../core/models';
import { crearMovimiento } from '../../../testing/factories';
import { iconos } from '../../../core/icons';

describe('AjustesComponent', () => {
  let componente: AjustesComponent;
  let fixture: ComponentFixture<AjustesComponent>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AjustesComponent],
      providers: [provideIcons(iconos), provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });

    fixture = TestBed.createComponent(AjustesComponent);
    componente = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  const esperar = async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();
  };

  it('renderiza el formulario de ajuste de inventario', () => {
    fixture.detectChanges();
    httpMock.match(() => true);

    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Ajuste de inventario');
    expect(html.querySelector('#stockFinal')).toBeTruthy();
    expect(html.querySelector('#cantidad')).toBeNull();
  });

  it('carga los productos al inicializarse', async () => {
    fixture.detectChanges();

    httpMock
      .expectOne((req) => req.url === '/api/inventario')
      .flush({ items: [], pagina: 1, tamanoPagina: 100, totalRegistros: 0, totalPaginas: 1 });

    await esperar();
  });

  it('muestra la diferencia del ultimo ajuste registrado', () => {
    const movimiento: Movimiento = crearMovimiento({
      productoNombre: 'Toner negro',
      tipo: 'AjustePositivo',
      tipoDescripcion: 'Ajuste positivo',
      cantidad: 12,
      stockAnterior: 2,
      stockResultante: 14
    });

    componente.ultimoMovimiento.set(movimiento);
    fixture.detectChanges();
    httpMock.match(() => true);

    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Ultimo ajuste registrado');
    expect(html.textContent).toContain('Toner negro');
    expect(html.textContent).toContain('Ajuste positivo');
  });
});
