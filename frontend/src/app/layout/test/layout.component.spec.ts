import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { LayoutComponent } from '../layout.component';
import { AuthService } from '../../core/services/auth.service';
import { iconos } from '../../core/icons';
import { crearRespuestaAuth } from '../../testing/factories';

describe('LayoutComponent', () => {
  let componente: LayoutComponent;
  let fixture: ComponentFixture<LayoutComponent>;
  let httpMock: HttpTestingController;
  let auth: AuthService;
  let navigate: jest.Mock;

  beforeEach(() => {
    //La preferencia de plegado persiste en localStorage.
    localStorage.clear();
    sessionStorage.clear();

    TestBed.configureTestingModule({
      imports: [LayoutComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideIcons(iconos)]
    });

    //Se espia la navegacion: el logout resolveria una ruta inexistente.
    navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(LayoutComponent);
    componente = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => httpMock.verify());

  const autenticar = async (rol: string = 'ADMIN') => {
    const promesa = auth.login('admin', 'Admin123!');
    httpMock.expectOne('/api/auth/login').flush(
      crearRespuestaAuth({ usuario: { ...crearRespuestaAuth().usuario!, rol } as any })
    );
    await promesa;
  };

  it('muestra todos los elementos del menu a un administrador', async () => {
    await autenticar('ADMIN');
    fixture.detectChanges();

    expect(componente.menuVisible().length).toBe(componente.itemsMenu.length);
  });

  it('oculta las opciones de operacion a un usuario de solo lectura', async () => {
    await autenticar('LECTURA');
    fixture.detectChanges();

    const rutas = componente.menuVisible().map((i) => i.ruta);

    expect(rutas).not.toContain('/entradas');
    expect(rutas).not.toContain('/salidas');
    expect(rutas).not.toContain('/ajustes');
    expect(rutas).toContain('/inventario');
    expect(rutas).toContain('/movimientos');
  });

  it('permite registrar movimientos a un operador', async () => {
    await autenticar('OPERADOR');
    fixture.detectChanges();

    const rutas = componente.menuVisible().map((i) => i.ruta);

    expect(rutas).toContain('/entradas');
    expect(rutas).toContain('/salidas');
  });

  it('renderiza los enlaces de navegacion', async () => {
    await autenticar('ADMIN');
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    const enlaces = Array.from(html.querySelectorAll('aside a'));

    expect(enlaces.length).toBeGreaterThan(5);
    expect(html.textContent).toContain('Dashboard');
    expect(html.textContent).toContain('Inventario');
  });

  it('el menu movil empieza cerrado', () => {
    expect(componente.menuAbierto()).toBe(false);
  });

  it('alterna el menu movil', () => {
    componente.alternarMenu();
    expect(componente.menuAbierto()).toBe(true);

    componente.alternarMenu();
    expect(componente.menuAbierto()).toBe(false);
  });

  it('cierra el menu movil al navegar', () => {
    componente.menuAbierto.set(true);
    componente.cerrarMenu();

    expect(componente.menuAbierto()).toBe(false);
  });

  describe('Colapso de la barra lateral', () => {
    it('empieza desplegada', () => {
      expect(componente.colapsado()).toBe(false);
    });

    it('alterna el estado de plegado', () => {
      componente.alternarColapso();
      expect(componente.colapsado()).toBe(true);

      componente.alternarColapso();
      expect(componente.colapsado()).toBe(false);
    });

    it('aplica la clase de plegado en la barra lateral y en el contenido', () => {
      componente.alternarColapso();
      fixture.detectChanges();

      const html = fixture.nativeElement as HTMLElement;

      expect(html.querySelector('.shell__lateral--colapsado')).toBeTruthy();
      expect(html.querySelector('.shell__contenido--colapsado')).toBeTruthy();
    });

    it('el texto alternativo del boton refleja el estado', () => {
      expect(componente.textoColapso).toBe('Colapsar menu lateral');

      componente.alternarColapso();
      expect(componente.textoColapso).toBe('Expandir menu lateral');
    });

    it('guarda la preferencia en el navegador', () => {
      componente.alternarColapso();
      fixture.detectChanges();

      expect(localStorage.getItem('inventario.sidebarColapsado')).toBe('1');

      componente.alternarColapso();
      fixture.detectChanges();

      expect(localStorage.getItem('inventario.sidebarColapsado')).toBe('0');
    });

    it('restaura la preferencia guardada al crear el componente', () => {
      localStorage.setItem('inventario.sidebarColapsado', '1');

      const otro = TestBed.createComponent(LayoutComponent);

      expect(otro.componentInstance.colapsado()).toBe(true);
    });

    it('el menu movil y el colapso son independientes', () => {
      componente.alternarMenu();
      componente.alternarColapso();

      expect(componente.menuAbierto()).toBe(true);
      expect(componente.colapsado()).toBe(true);
    });
  });

  it('permite editar a los roles ADMIN y OPERADOR', async () => {
    await autenticar('ADMIN');
    expect(componente.puedeEditar()).toBe(true);

    await autenticar('OPERADOR');
    expect(componente.puedeEditar()).toBe(true);

    await autenticar('LECTURA');
    expect(componente.puedeEditar()).toBe(false);
  });

  it('muestra los datos del usuario autenticado', async () => {
    await autenticar('ADMIN');
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Administrador del Sistema');
    expect(html.textContent).toContain('admin');
  });

  it('cierra la sesion al pulsar el boton de salir', async () => {
    await autenticar('ADMIN');
    fixture.detectChanges();

    const promesa = componente.cerrarSesion();

    const peticion = httpMock.expectOne('/api/auth/logout');
    peticion.flush({});

    await promesa;

    expect(auth.autenticado()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
