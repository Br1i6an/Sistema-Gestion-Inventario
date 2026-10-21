import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from '@jest/globals';

@Component({
  standalone: true,
  template: `<span class="saludo">{{ mensaje() }}</span>`
})
class ComponenteDePrueba {
  readonly mensaje = signal('Hola mundo');
}

describe('Configuracion de Jest + Angular', () => {
  it('compila un componente standalone con TestBed', () => {
    const fixture = TestBed.createComponent(ComponenteDePrueba);

    expect(fixture.componentInstance).toBeInstanceOf(ComponenteDePrueba);
    expect(fixture.componentInstance.mensaje()).toBe('Hola mundo');
  });

  it('renderiza la plantilla y refleja los cambios de signal', () => {
    const fixture = TestBed.createComponent(ComponenteDePrueba);
    fixture.detectChanges();

    const span = fixture.nativeElement.querySelector('.saludo') as HTMLElement;
    expect(span.textContent).toContain('Hola mundo');

    fixture.componentInstance.mensaje.set('Adios');
    fixture.detectChanges();

    expect(span.textContent).toContain('Adios');
  });
});
