import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { LoginComponent } from '../login.component';
import { AuthService } from '../../../core/services/auth.service';
import { NotificacionService } from '../../../core/services/notificacion.service';
import { iconos } from '../../../core/icons';
import { crearRespuestaAuth } from '../../../testing/factories';

describe('LoginComponent', () => {
  let componente: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let httpMock: HttpTestingController;
  let navigate: jest.Mock;
  let navigateByUrl: jest.Mock;
  let notificaciones: NotificacionService;

  beforeEach(() => {
    sessionStorage.clear();

    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideIcons(iconos), 
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });

    //Se espia el Router real: ActivatedRoute no funciona con un mock plano.
    navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    navigateByUrl = jest.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    fixture = TestBed.createComponent(LoginComponent);
    componente = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    notificaciones = TestBed.inject(NotificacionService);

    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('comienza con los campos vacios y sin error', () => {
    expect(componente.usuario()).toBe('');
    expect(componente.contrasena()).toBe('');
    expect(componente.error()).toBeNull();
    expect(componente.cargando()).toBe(false);
  });

  it('expone las tres cuentas de prueba', () => {
    expect(componente.cuentasDemo.length).toBe(3);
    expect(componente.cuentasDemo.map((c) => c.usuario)).toEqual(['admin', 'operador', 'lector']);
  });

  it('muestra un error si faltan el usuario o la contrasena', async () => {
    await componente.entrar();

    expect(componente.error()).toBe('Ingrese su usuario y contrasena.');
    httpMock.expectNone('/api/auth/login');
  });

  it('muestra un error si solo se informa el usuario', async () => {
    componente.usuario.set('admin');

    await componente.entrar();

    expect(componente.error()).toBe('Ingrese su usuario y contrasena.');
  });

  it('envia las credenciales a la API y navega al dashboard', async () => {
    componente.usuario.set('admin');
    componente.contrasena.set('Admin123!');

    const promesa = componente.entrar();

    const peticion = httpMock.expectOne('/api/auth/login');
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({ username: 'admin', password: 'Admin123!' });

    peticion.flush(crearRespuestaAuth());

    await promesa;

    expect(componente.error()).toBeNull();
    expect(navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('muestra el mensaje de error devuelto por la API', async () => {
    componente.usuario.set('admin');
    componente.contrasena.set('clave-mala');

    const promesa = componente.entrar();

    httpMock.expectOne('/api/auth/login').flush(
      crearRespuestaAuth({ exitoso: false, mensaje: 'Usuario o contrasena incorrectos.' })
    );

    await promesa;

    expect(componente.error()).toBe('Usuario o contrasena incorrectos.');
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('muestra el error cuando la API no responde', async () => {
    componente.usuario.set('admin');
    componente.contrasena.set('Admin123!');

    const promesa = componente.entrar();

    httpMock
      .expectOne('/api/auth/login')
      .flush('error de red', { status: 500, statusText: 'Internal Server Error' });

    await promesa;

    expect(componente.error()).toBeTruthy();
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('desactiva el boton mientras la peticion esta en curso', async () => {
    componente.usuario.set('admin');
    componente.contrasena.set('Admin123!');

    const promesa = componente.entrar();
    expect(componente.cargando()).toBe(true);

    httpMock.expectOne('/api/auth/login').flush(crearRespuestaAuth());
    await promesa;

    expect(componente.cargando()).toBe(false);
  });

  it('notifica el mensaje de bienvenida al iniciar sesion', async () => {
    componente.usuario.set('admin');
    componente.contrasena.set('Admin123!');

    const promesa = componente.entrar();
    httpMock.expectOne('/api/auth/login').flush(crearRespuestaAuth());
    await promesa;

    const mensajes = notificaciones.notificaciones();
    expect(mensajes.length).toBe(1);
    expect(mensajes[0].tipo).toBe('exito');
    expect(mensajes[0].mensaje).toContain('Administrador del Sistema');
  });

  it('usarCuenta rellena los campos y limpia el error', () => {
    componente.error.set('error previo');

    componente.usarCuenta('operador', 'Operador123!');

    expect(componente.usuario()).toBe('operador');
    expect(componente.contrasena()).toBe('Operador123!');
    expect(componente.error()).toBeNull();
  });

  it('renderiza el formulario de acceso', () => {
    const html = fixture.nativeElement as HTMLElement;

    expect(html.querySelector('#usuario')).toBeTruthy();
    expect(html.querySelector('#contrasena')).toBeTruthy();
    expect(html.querySelector('button[type=submit]')).toBeTruthy();
  });

  it('oculta la contrasena por defecto y permite mostrarla', () => {
    const html = fixture.nativeElement as HTMLElement;
    const input = html.querySelector('#contrasena') as HTMLInputElement;

    expect(input.type).toBe('password');
    expect(componente.mostrarContrasena()).toBe(false);

    componente.mostrarContrasena.set(true);
    fixture.detectChanges();

    expect((html.querySelector('#contrasena') as HTMLInputElement).type).toBe('text');
  });
});
