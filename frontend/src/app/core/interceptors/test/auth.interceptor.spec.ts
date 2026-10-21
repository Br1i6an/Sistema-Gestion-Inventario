import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeEach, describe, expect, it } from '@jest/globals';

import { authInterceptor } from '../auth.interceptor';
import { AuthService } from '../../services/auth.service';
import { crearRespuestaAuth } from '../../../testing/factories';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: AuthService;

  const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

  const autenticar = async (accessToken = 'abc.def.ghi') => {
    const promesa = auth.login('admin', 'Admin123!');
    httpMock.expectOne('/api/auth/login').flush(crearRespuestaAuth({ accessToken }));
    await promesa;
  };

  beforeEach(() => {
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting()
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => httpMock.verify());

  it('agrega el encabezado Authorization con el token vigente', async () => {
    await autenticar('abc.def.ghi');

    http.get('/api/inventario').subscribe();

    const peticion = httpMock.expectOne('/api/inventario');
    expect(peticion.request.headers.get('Authorization')).toBe('Bearer abc.def.ghi');
    peticion.flush({});
  });

  it('no agrega el encabezado Authorization si no hay token', () => {
    http.get('/api/inventario').subscribe();

    const peticion = httpMock.expectOne('/api/inventario');
    expect(peticion.request.headers.has('Authorization')).toBe(false);
    peticion.flush({});
  });

  it('renueva el token y reintenta la peticion cuando la API responde 401', async () => {
    await autenticar('token-vencido');

    let resultado: unknown = null;
    http.get('/api/inventario').subscribe((r) => (resultado = r));

    const primera = httpMock.expectOne('/api/inventario');
    expect(primera.request.headers.get('Authorization')).toBe('Bearer token-vencido');
    primera.flush({ error: 'expirado' }, { status: 401, statusText: 'Unauthorized' });

    const refresh = httpMock.expectOne('/api/auth/refresh');
    refresh.flush(crearRespuestaAuth({ accessToken: 'token-nuevo', refreshToken: 'refresh-nuevo' }));

    await tick();

    const reintento = httpMock.expectOne('/api/inventario');
    expect(reintento.request.headers.get('Authorization')).toBe('Bearer token-nuevo');
    reintento.flush({ ok: true });

    await tick();

    expect(resultado).toEqual({ ok: true });
  });

  it('propaga el error si la renovacion del token no es posible', async () => {
    await autenticar('token-vencido');

    let errorRecibido: unknown = null;
    http.get('/api/inventario').subscribe({ error: (e) => (errorRecibido = e) });

    const primera = httpMock.expectOne('/api/inventario');
    primera.flush({ error: 'expirado' }, { status: 401, statusText: 'Unauthorized' });

    const refresh = httpMock.expectOne('/api/auth/refresh');
    refresh.flush({ error: 'invalido' }, { status: 401, statusText: 'Unauthorized' });

    await tick();

    expect(errorRecibido).toBeTruthy();
  });

  it('no intenta renovar el token en el propio endpoint de login', async () => {
    let errorRecibido: unknown = null;
    http.post('/api/auth/login', {}).subscribe({ error: (e) => (errorRecibido = e) });

    const peticion = httpMock.expectOne('/api/auth/login');
    peticion.flush({ error: 'credenciales' }, { status: 401, statusText: 'Unauthorized' });

    httpMock.expectNone('/api/auth/refresh');
    expect(errorRecibido).toBeTruthy();
  });

  it('deja pasar los errores distintos de 401 sin reintentar', async () => {
    await autenticar('token-valido');

    let errorRecibido: unknown = null;
    http.get('/api/inventario').subscribe({ error: (e) => (errorRecibido = e) });

    const peticion = httpMock.expectOne('/api/inventario');
    peticion.flush({ error: 'conflicto' }, { status: 409, statusText: 'Conflict' });

    httpMock.expectNone('/api/auth/refresh');
    expect(errorRecibido).toBeTruthy();
  });
});
