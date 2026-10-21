import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { NotificacionService } from '../notificacion.service';

describe('NotificacionService', () => {
  let servicio: NotificacionService;

  beforeEach(() => {
    jest.useFakeTimers();
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(NotificacionService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('agrega una notificacion de exito con el titulo por defecto', () => {
    servicio.exito('La operacion se completo.');

    const notificaciones = servicio.notificaciones();
    expect(notificaciones.length).toBe(1);
    expect(notificaciones[0].tipo).toBe('exito');
    expect(notificaciones[0].titulo).toBe('Operacion exitosa');
    expect(notificaciones[0].mensaje).toBe('La operacion se completo.');
  });

  it('acepta un titulo personalizado', () => {
    servicio.error('No hay stock suficiente.', 'Stock insuficiente');

    expect(servicio.notificaciones()[0].titulo).toBe('Stock insuficiente');
    expect(servicio.notificaciones()[0].tipo).toBe('error');
  });

  it('acumula varias notificaciones con identificadores distintos', () => {
    servicio.exito('Primera');
    servicio.info('Segunda');
    servicio.aviso('Tercera');

    const notificaciones = servicio.notificaciones();
    expect(notificaciones.length).toBe(3);
    expect(new Set(notificaciones.map((n) => n.id)).size).toBe(3);
  });

  it('cierra automaticamente las notificaciones de exito', () => {
    servicio.exito('Temporal');
    expect(servicio.notificaciones().length).toBe(1);

    jest.advanceTimersByTime(5000);

    expect(servicio.notificaciones().length).toBe(0);
  });

  it('cierra automaticamente las notificaciones de error tras un plazo mayor', () => {
    servicio.error('Error persistente');
    expect(servicio.notificaciones().length).toBe(1);

    jest.advanceTimersByTime(5000);
    expect(servicio.notificaciones().length).toBe(1);

    jest.advanceTimersByTime(5000);
    expect(servicio.notificaciones().length).toBe(0);
  });

  it('cierra una notificacion concreta por su identificador', () => {
    servicio.exito('A');
    servicio.error('B');

    const idA = servicio.notificaciones()[0].id;
    servicio.cerrar(idA);

    expect(servicio.notificaciones().length).toBe(1);
    expect(servicio.notificaciones()[0].mensaje).toBe('B');
  });

  describe('extraerMensaje', () => {
    it('extrae el campo detail de un ProblemDetails', () => {
      const error = new HttpErrorResponse({
        status: 409,
        error: {
          title: 'Conflicto con el estado actual',
          status: 409,
          detail: 'El producto tiene 5 unidades en stock y se intentan retirar 10.',
          codigo: 'STOCK_INSUFICIENTE'
        }
      });

      expect(servicio.extraerMensaje(error)).toBe(
        'El producto tiene 5 unidades en stock y se intentan retirar 10.'
      );
    });

    it('concatena los errores de validacion por campo', () => {
      const error = new HttpErrorResponse({
        status: 400,
        error: {
          title: 'Uno o mas campos de la solicitud no son validos.',
          status: 400,
          errors: {
            Cantidad: ['La cantidad debe ser mayor a cero.'],
            ProductoId: ['El producto es obligatorio.']
          }
        }
      });

      expect(servicio.extraerMensaje(error)).toBe(
        'La cantidad debe ser mayor a cero. El producto es obligatorio.'
      );
    });

    it('usa el title cuando no hay detail', () => {
      const error = new HttpErrorResponse({
        status: 403,
        error: { title: 'Acceso denegado', status: 403 }
      });

      expect(servicio.extraerMensaje(error)).toBe('Acceso denegado');
    });

    it('informa de un fallo de conexion cuando el estado es 0', () => {
      const error = new HttpErrorResponse({ status: 0, error: null });

      expect(servicio.extraerMensaje(error)).toContain('No se pudo conectar con el servidor');
    });

    it('informa cuando la API no esta disponible (502/503/504)', () => {
      const error = new HttpErrorResponse({
        status: 502,
        error: '<html>Bad Gateway</html>'
      });

      expect(servicio.extraerMensaje(error)).toContain('La API no esta disponible');
      expect(servicio.extraerMensaje(error)).not.toContain('localhost');
    });

    it('informa de un fallo del servidor sin mostrar la traza tecnica', () => {
      const error = new HttpErrorResponse({ status: 500, error: 'boom' });

      const mensaje = servicio.extraerMensaje(error);

      expect(mensaje).toContain('El servidor no pudo completar la solicitud');
      expect(mensaje).not.toContain('localhost');
    });

    it('informa cuando la sesion expiro o las credenciales son invalidas', () => {
      const error = new HttpErrorResponse({ status: 401, error: null });

      expect(servicio.extraerMensaje(error)).toContain('credenciales');
    });

    it('informa cuando faltan permisos', () => {
      const error = new HttpErrorResponse({ status: 403, error: null });

      expect(servicio.extraerMensaje(error)).toContain('permisos');
    });

    it('devuelve el mensaje de una excepcion de Error normal', () => {
      expect(servicio.extraerMensaje(new Error('Fallo generico'))).toBe('Fallo generico');
    });

    it('devuelve un mensaje por defecto para valores desconocidos', () => {
      expect(servicio.extraerMensaje('texto')).toBe('Ocurrio un error inesperado.');
    });
  });

  it('errorHttp registra la notificacion de error con el mensaje extraido', () => {
    const error = new HttpErrorResponse({
      status: 404,
      error: { title: 'Recurso no encontrado', status: 404, detail: 'No existe el producto 99.' }
    });

    servicio.errorHttp(error);

    const notificaciones = servicio.notificaciones();
    expect(notificaciones.length).toBe(1);
    expect(notificaciones[0].tipo).toBe('error');
    expect(notificaciones[0].mensaje).toBe('No existe el producto 99.');
  });
});
