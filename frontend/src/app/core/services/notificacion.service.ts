import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';

export type TipoNotificacion = 'exito' | 'error' | 'info' | 'aviso';

export interface Notificacion {
  id: number;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
}

@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private readonly _notificaciones = signal<Notificacion[]>([]);
  private contador = 0;

  readonly notificaciones = this._notificaciones.asReadonly();

  exito(mensaje: string, titulo = 'Operacion exitosa'): void {
    this.agregar('exito', titulo, mensaje);
  }

  error(mensaje: string, titulo = 'Ocurrio un error'): void {
    this.agregar('error', titulo, mensaje);
  }

  info(mensaje: string, titulo = 'Informacion'): void {
    this.agregar('info', titulo, mensaje);
  }

  aviso(mensaje: string, titulo = 'Atencion'): void {
    this.agregar('aviso', titulo, mensaje);
  }

  errorHttp(error: unknown): void {
    this.error(this.extraerMensaje(error));
  }

  extraerMensaje(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error;

      if (body && typeof body === 'object') {
        const detalles = body as Record<string, unknown>;

        //Errores de validacion por campo.
        const errores = detalles['errors'] as Record<string, string[]> | undefined;
        if (errores) {
          const mensajes = Object.values(errores).flat();
          if (mensajes.length) {
            return mensajes.join(' ');
          }
        }

        if (typeof detalles['detail'] === 'string') {
          return detalles['detail'];
        }
        if (typeof detalles['title'] === 'string') {
          return detalles['title'];
        }
      }

      //Si el servidor no devuelve un ProblemDetails, se muestra un mensaje
      //util en lugar de la URL tecnica.
      if (error.status === 0) {
        return 'No se pudo conectar con el servidor. Verifique que la API este ejecutandose.';
      }

      if (error.status === 502 || error.status === 503 || error.status === 504) {
        return 'La API no esta disponible en este momento. Verifique que este ejecutandose e intentelo de nuevo.';
      }

      if (error.status >= 500) {
        return 'El servidor no pudo completar la solicitud. Intentelo de nuevo en unos momentos.';
      }

      if (error.status === 401) {
        return 'Sus credenciales no son validas o la sesion expiro.';
      }

      if (error.status === 403) {
        return 'No tiene permisos para realizar esta operacion.';
      }

      return `Error ${error.status}: ${error.message}`;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Ocurrio un error inesperado.';
  }

  cerrar(id: number): void {
    this._notificaciones.update((lista) => lista.filter((n) => n.id !== id));
  }

  private agregar(tipo: TipoNotificacion, titulo: string, mensaje: string): void {
    const id = ++this.contador;
    this._notificaciones.update((lista) => [...lista, { id, tipo, titulo, mensaje }]);

    //Las de exito e info se cierran rapido; las de error, con mas margen.
    const milisegundos = tipo === 'error' || tipo === 'aviso' ? 8000 : 4500;
    setTimeout(() => this.cerrar(id), milisegundos);
  }
}
