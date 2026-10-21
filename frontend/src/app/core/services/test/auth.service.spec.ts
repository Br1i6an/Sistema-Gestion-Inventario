import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { AuthService } from '../auth.service';
import { crearRespuestaAuth, TOKEN_FALSO } from '../../../testing/factories';

describe('AuthService', () => {
  let servicio: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy: { navigate: jest.Mock; navigateByUrl: jest.Mock };

  beforeEach(() => {
    sessionStorage.clear();

    routerSpy = {
      navigate: jest.fn(),
      navigateByUrl: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy }
      ]
    });

    servicio = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('login', () => {
    it('guarda los tokens y el usuario cuando la autenticacion es exitosa', async () => {
      const respuesta = crearRespuestaAuth();
      const promesa = servicio.login('admin', 'Admin123!');

      const peticion = httpMock.expectOne('/api/auth/login');
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.body).toEqual({ username: 'admin', password: 'Admin123!' });
      peticion.flush(respuesta);

      const resultado = await promesa;

      expect(resultado.exitoso).toBe(true);
      expect(servicio.accessToken()).toBe(respuesta.accessToken);
      expect(servicio.usuario()?.username).toBe('admin');
      expect(servicio.autenticado()).toBe(true);
    });

    it('conserva el refresh token en sessionStorage', async () => {
      const promesa = servicio.login('admin', 'Admin123!');
      httpMock.expectOne('/api/auth/login').flush(crearRespuestaAuth({ refreshToken: 'refresh-123' }));
      await promesa;

      expect(sessionStorage.getItem('inventario.refreshToken')).toBe('refresh-123');
    });

    it('no guarda nada cuando la API responde con error de autenticacion', async () => {
      const promesa = servicio.login('admin', 'clave-mala');

      httpMock
        .expectOne('/api/auth/login')
        .flush({ exitoso: false, mensaje: 'Usuario o contrasena incorrectos.' });

      const resultado = await promesa;

      expect(resultado.exitoso).toBe(false);
      expect(resultado.mensaje).toBe('Usuario o contrasena incorrectos.');
      expect(servicio.accessToken()).toBeNull();
      expect(servicio.usuario()).toBeNull();
      expect(sessionStorage.getItem('inventario.refreshToken')).toBeNull();
    });
  });

  describe('refrescar', () => {
    it('devuelve false cuando no hay refresh token', async () => {
      const resultado = await servicio.refrescar();

      expect(resultado).toBe(false);
      httpMock.expectNone('/api/auth/refresh');
    });

    it('canjea el refresh token por un nuevo access token', async () => {
      const promesa = servicio.login('admin', 'Admin123!');
      httpMock.expectOne('/api/auth/login').flush(crearRespuestaAuth());
      await promesa;

      const promesaRefresh = servicio.refrescar();
      const peticion = httpMock.expectOne('/api/auth/refresh');
      expect(peticion.request.body).toEqual({ refreshToken: 'token-de-refresco' });

      peticion.flush(crearRespuestaAuth({ accessToken: 'token-nuevo', refreshToken: 'refresh-nuevo' }));

      expect(await promesaRefresh).toBe(true);
      expect(servicio.accessToken()).toBe('token-nuevo');
      expect(sessionStorage.getItem('inventario.refreshToken')).toBe('refresh-nuevo');
    });

    it('limpia la sesion cuando el refresh token es rechazado', async () => {
      const promesa = servicio.login('admin', 'Admin123!');
      httpMock.expectOne('/api/auth/login').flush(crearRespuestaAuth());
      await promesa;

      const promesaRefresh = servicio.refrescar();
      httpMock.expectOne('/api/auth/refresh').flush(
        { exitoso: false, mensaje: 'Refresh token invalido.' },
        { status: 401, statusText: 'Unauthorized' }
      );

      expect(await promesaRefresh).toBe(false);
      expect(servicio.accessToken()).toBeNull();
      expect(servicio.usuario()).toBeNull();
      expect(sessionStorage.getItem('inventario.refreshToken')).toBeNull();
    });
  });

  describe('restaurarSesion', () => {
    it('canjea el refresh token guardado al cargar la aplicacion', async () => {
      sessionStorage.setItem('inventario.refreshToken', 'refresh-guardado');

      const promesa = servicio.restaurarSesion();

      const peticion = httpMock.expectOne('/api/auth/refresh');
      expect(peticion.request.body).toEqual({ refreshToken: 'refresh-guardado' });
      peticion.flush(crearRespuestaAuth({ accessToken: TOKEN_FALSO }));

      await promesa;

      expect(servicio.accessToken()).toBe(TOKEN_FALSO);
      expect(servicio.autenticado()).toBe(true);
    });

    it('no realiza ninguna peticion si no hay refresh token guardado', async () => {
      await servicio.restaurarSesion();

      httpMock.expectNone('/api/auth/refresh');
      expect(servicio.autenticado()).toBe(false);
    });

    it('esperarInicializacion() dispara la restauracion y resuelve cuando termina', async () => {
      sessionStorage.setItem('inventario.refreshToken', 'refresh-guardado');

      const promesa = servicio.esperarInicializacion();

      httpMock
        .expectOne('/api/auth/refresh')
        .flush(crearRespuestaAuth({ accessToken: TOKEN_FALSO }));

      await promesa;

      expect(servicio.accessToken()).toBe(TOKEN_FALSO);
    });

    it('es idempotente: varias llamadas comparten la misma restauracion', async () => {
      sessionStorage.setItem('inventario.refreshToken', 'refresh-guardado');

      const primera = servicio.restaurarSesion();
      const segunda = servicio.restaurarSesion();

      const peticiones = httpMock.match('/api/auth/refresh');
      expect(peticiones.length).toBe(1);
      peticiones[0].flush(crearRespuestaAuth());

      await Promise.all([primera, segunda]);
    });
  });

  describe('logout', () => {
    it('revoca el refresh token en el backend y limpia la sesion local', async () => {
      const promesaLogin = servicio.login('admin', 'Admin123!');
      httpMock.expectOne('/api/auth/login').flush(crearRespuestaAuth());
      await promesaLogin;

      const promesaLogout = servicio.logout();

      const peticion = httpMock.expectOne('/api/auth/logout');
      expect(peticion.request.body).toEqual({ refreshToken: 'token-de-refresco' });
      peticion.flush({});

      await promesaLogout;

      expect(servicio.accessToken()).toBeNull();
      expect(servicio.usuario()).toBeNull();
      expect(sessionStorage.getItem('inventario.refreshToken')).toBeNull();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('limpia la sesion local aunque el backend responda con error', async () => {
      const promesaLogin = servicio.login('admin', 'Admin123!');
      httpMock.expectOne('/api/auth/login').flush(crearRespuestaAuth());
      await promesaLogin;

      const promesaLogout = servicio.logout();
      httpMock
        .expectOne('/api/auth/logout')
        .flush({ error: 'fallo' }, { status: 500, statusText: 'Error' });

      await promesaLogout;

      expect(servicio.accessToken()).toBeNull();
      expect(sessionStorage.getItem('inventario.refreshToken')).toBeNull();
    });
  });
});
