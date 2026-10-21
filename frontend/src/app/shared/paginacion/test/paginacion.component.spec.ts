import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { PaginacionComponent } from '../paginacion.component';
import { iconos } from '../../../core/icons';

describe('PaginacionComponent', () => {
  let componente: PaginacionComponent;
  let fixture: ComponentFixture<PaginacionComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [PaginacionComponent] });

    fixture = TestBed.createComponent(PaginacionComponent);
    componente = fixture.componentInstance;
  });

  it('calcula el rango de registros mostrados', () => {
    componente.pagina = 2;
    componente.tamanoPagina = 20;
    componente.totalRegistros = 45;

    expect(componente.desde).toBe(21);
    expect(componente.hasta).toBe(40);
  });

  it('muestra el ultimo registro cuando la pagina es la final', () => {
    componente.pagina = 3;
    componente.tamanoPagina = 20;
    componente.totalRegistros = 45;

    expect(componente.hasta).toBe(45);
  });

  it('devuelve un rango vacio cuando no hay registros', () => {
    componente.totalRegistros = 0;

    expect(componente.desde).toBe(0);
    expect(componente.hasta).toBe(0);
  });

  it('habilita el boton anterior solo si hay pagina anterior', () => {
    componente.pagina = 1;
    expect(componente.tieneAnterior).toBe(false);

    componente.pagina = 2;
    expect(componente.tieneAnterior).toBe(true);
  });

  it('habilita el boton siguiente solo si hay pagina siguiente', () => {
    componente.pagina = 1;
    componente.totalPaginas = 3;
    expect(componente.tieneSiguiente).toBe(true);

    componente.pagina = 3;
    expect(componente.tieneSiguiente).toBe(false);
  });

  it('emite el cambio de pagina', () => {
    const emissions: number[] = [];
    componente.cambioPagina.subscribe((p) => emissions.push(p));

    componente.totalPaginas = 5;
    componente.pagina = 1;
    componente.irA(3);

    expect(emissions).toEqual([3]);
  });

  it('no emite si la pagina es la actual', () => {
    const emissions: number[] = [];
    componente.cambioPagina.subscribe((p) => emissions.push(p));

    componente.pagina = 2;
    componente.irA(2);

    expect(emissions).toEqual([]);
  });

  it('no emite si la pagina esta fuera de rango', () => {
    const emissions: number[] = [];
    componente.cambioPagina.subscribe((p) => emissions.push(p));

    componente.totalPaginas = 3;
    componente.irA(0);
    componente.irA(4);

    expect(emissions).toEqual([]);
  });

  it('muestra todas las paginas si son pocas', () => {
    componente.totalPaginas = 5;

    expect(componente.paginas).toEqual([1, 2, 3, 4, 5]);
  });

  it('muestra una ventana alrededor de la pagina actual', () => {
    componente.totalPaginas = 20;
    componente.pagina = 10;

    expect(componente.paginas).toEqual([8, 9, 10, 11, 12]);
  });

  it('muestra las primeras paginas cuando esta al inicio', () => {
    componente.totalPaginas = 20;
    componente.pagina = 1;

    expect(componente.paginas).toEqual([1, 2, 3, 4, 5]);
  });

  it('muestra las ultimas paginas cuando esta al final', () => {
    componente.totalPaginas = 20;
    componente.pagina = 20;

    expect(componente.paginas).toEqual([16, 17, 18, 19, 20]);
  });

  it('no renderiza nada cuando no hay paginas', () => {
    componente.totalPaginas = 0;
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.querySelector('button')).toBeNull();
  });

  it('renderiza los controles de paginacion', () => {
    componente.totalPaginas = 3;
    componente.pagina = 2;
    componente.totalRegistros = 50;
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Mostrando');
    expect(html.querySelectorAll('button').length).toBeGreaterThan(2);
  });

  it('deshabilita el boton anterior en la primera pagina', () => {
    componente.totalPaginas = 3;
    componente.pagina = 1;
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    const botones = html.querySelectorAll('button');
    const anterior = Array.from(botones).find((b) => b.textContent?.includes('Anterior'));

    expect((anterior as HTMLButtonElement).disabled).toBe(true);
  });
});
