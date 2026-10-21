import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import { beforeEach, describe, expect, it } from '@jest/globals';

import { ToastContainerComponent } from '../toast-container.component';
import { NotificacionService } from '../../../core/services/notificacion.service';
import { iconos } from '../../../core/icons';

describe('ToastContainerComponent', () => {
  let componente: ToastContainerComponent;
  let fixture: ComponentFixture<ToastContainerComponent>;
  let servicio: NotificacionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ToastContainerComponent],
      providers: [NotificacionService, provideIcons(iconos)]
    });

    fixture = TestBed.createComponent(ToastContainerComponent);
    componente = fixture.componentInstance;
    servicio = TestBed.inject(NotificacionService);
  });

  it('no muestra notificaciones cuando la lista esta vacia', () => {
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.querySelectorAll('[role=alert]').length).toBe(0);
  });

  it('muestra una notificacion por cada aviso del servicio', () => {
    servicio.exito('Operacion correcta');
    servicio.error('Algo fallo');
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    const alertas = html.querySelectorAll('[role=alert]');

    expect(alertas.length).toBe(2);
    expect(html.textContent).toContain('Operacion correcta');
    expect(html.textContent).toContain('Algo fallo');
  });

  it('muestra el titulo de la notificacion', () => {
    servicio.error('Mensaje', 'Titulo personalizado');
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Titulo personalizado');
  });

  it('cierra la notificacion al pulsar la X', () => {
    servicio.error('Mensaje');
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    const botonCerrar = html.querySelector('button[aria-label="Cerrar notificacion"]');
    botonCerrar?.click();

    expect(servicio.notificaciones().length).toBe(0);
  });

  it('expone el servicio para que la plantilla lo consuma', () => {
    expect(componente.servicio).toBe(servicio);
  });
});
