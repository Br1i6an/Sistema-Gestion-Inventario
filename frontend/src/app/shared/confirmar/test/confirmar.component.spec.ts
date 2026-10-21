import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import { beforeEach, describe, expect, it } from '@jest/globals';

import { ConfirmarComponent } from '../confirmar.component';
import { iconos } from '../../../core/icons';

describe('ConfirmarComponent', () => {
  let componente: ConfirmarComponent;
  let fixture: ComponentFixture<ConfirmarComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ConfirmarComponent] });

    fixture = TestBed.createComponent(ConfirmarComponent);
    componente = fixture.componentInstance;
  });

  it('no se muestra por defecto', () => {
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.querySelector('[role=dialog]')).toBeNull();
  });

  it('se muestra cuando visible es true', () => {
    componente.visible = true;
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.querySelector('[role=dialog]')).toBeTruthy();
  });

  it('muestra el titulo y el mensaje', () => {
    componente.visible = true;
    componente.titulo = 'Titulo de prueba';
    componente.mensaje = 'Mensaje de prueba';
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Titulo de prueba');
    expect(html.textContent).toContain('Mensaje de prueba');
  });

  it('muestra el texto de los botones', () => {
    componente.visible = true;
    componente.textoConfirmar = 'Aceptar';
    componente.textoCancelar = 'Rechazar';
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Aceptar');
    expect(html.textContent).toContain('Rechazar');
  });

  it('emite aceptado y se cierra al confirmar', () => {
    let emitido = false;
    componente.aceptado.subscribe(() => (emitido = true));

    componente.visible = true;
    componente.confirmar();

    expect(emitido).toBe(true);
    expect(componente.visible).toBe(false);
  });

  it('emite cancelado y se cierra al cancelar', () => {
    let emitido = false;
    componente.cancelado.subscribe(() => (emitido = true));

    componente.visible = true;
    componente.cancelar();

    expect(emitido).toBe(true);
    expect(componente.visible).toBe(false);
  });

  it('permite pulsar el boton de confirmar en la plantilla', () => {
    let emitido = false;
    componente.aceptado.subscribe(() => (emitido = true));
    componente.visible = true;
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    const botones = Array.from(html.querySelectorAll('button'));
    const aceptar = botones.find((b) => b.textContent?.includes('Confirmar'));
    aceptar?.click();

    expect(emitido).toBe(true);
  });

  it('permite pulsar el boton de cancelar en la plantilla', () => {
    let emitido = false;
    componente.cancelado.subscribe(() => (emitido = true));
    componente.visible = true;
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    const botones = Array.from(html.querySelectorAll('button'));
    const cancelar = botones.find((b) => b.textContent?.includes('Cancelar'));
    cancelar?.click();

    expect(emitido).toBe(true);
  });
});
