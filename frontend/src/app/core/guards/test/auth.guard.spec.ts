import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { authGuard, roleGuard } from '../auth.guard';
import { AuthService } from '../../services/auth.service';
import { crearRespuestaAuth } from '../../../testing/factories';

describe('Guards de autenticacion', () => {
  let auth: AuthService;
  let httpMock: HttpTestingController;
  let navigate: jest.Mock;
  let router: { navigate: jest.Mock; createUrlTree: jest.Mock };

  const ejecutarGuard = (guard: any, url = '/inventario'): Promise<any> =>
    TestBed.runInInjectionContext(() =>
      guard(
        { url: '/inventario' } as ActivatedRouteSnapshot,
        { url } as RouterStateSnapshot
      )
    );

  beforeEach(() => {
    sessionStorage.clear();

    navigate = jest.fn();
    router = {
      navigate,
      createUrlTree: jest.fn((comando: string, extra?: any) => ({ comando, extra }) as unknown as UrlTree)
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: router }
      ]
    });

    auth = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('authGuard', () => {
    it('permite el acceso cuando el usuario ya esta autenticado', async () => {
      const promesa = auth.login('admin', 'Admin123!');
      httpMock.expectOne('/api/auth/login').flush(crearRespuestaAuth());
      await promesa;

      const resultado = await ejecutarGuard(authGuard);

      expect(resultado).toBe(true);
      expect(router.createUrlTree).not.toHaveBeenCalled();
    });

    it('redirige al login cuando no hay sesion', async () => {
      const resultado = await ejecutarGuard(authGuard);

      expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
        queryParams: { returnUrl: '/inventario' }
      });
      expect(resultado).toBeTruthy();
    });

    it('intenta renovar la sesion antes de expulsar al usuario', async () => {
      sessionStorage.setItem('inventario.refreshToken', 'refresh-guardado');

      const promesa = ejecutarGuard(authGuard);

      const peticion = httpMock.expectOne('/api/auth/refresh');
      peticion.flush(crearRespuestaAuth({ accessToken: 'token-renovado' }));

      const resultado = await promesa;

      expect(resultado).toBe(true);
      expect(router.createUrlTree).not.toHaveBeenCalled();
      expect(auth.accessToken()).toBe('token-renovado');
    });

    it('redirige cuando la renovacion de la sesion falla', async () => {
      sessionStorage.setItem('inventario.refreshToken', 'refresh-invalido');

      const promesa = ejecutarGuard(authGuard);

      httpMock
        .expectOne('/api/auth/refresh')
        .flush({ error: 'invalido' }, { status: 401, statusText: 'Unauthorized' });

      await promesa;

      expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
        queryParams: { returnUrl: '/inventario' }
      });
    });
  });

  describe('roleGuard', () => {
    const autenticar = async (rol: string) => {
      const promesa = auth.login('usuario', 'clave');
      httpMock
        .expectOne('/api/auth/login')
        .flush(crearRespuestaAuth({ usuario: { ...crearRespuestaAuth().usuario!, rol } as any }));
      await promesa;
    };

    it('permite el acceso a un usuario con el rol requerido', async () => {
      await autenticar('ADMIN');

      const resultado = await ejecutarGuard(roleGuard(['ADMIN', 'OPERADOR']));

      expect(resultado).toBe(true);
      expect(router.createUrlTree).not.toHaveBeenCalled();
    });

    it('redirige al dashboard cuando el rol no tiene permisos', async () => {
      await autenticar('LECTURA');

      const resultado = await ejecutarGuard(roleGuard(['ADMIN', 'OPERADOR']));

      expect(router.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
      expect(resultado).toBeTruthy();
    });

    it('redirige al dashboard cuando no hay usuario autenticado', async () => {
      const resultado = await ejecutarGuard(roleGuard(['ADMIN']));

      expect(router.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
    });
  });
});
