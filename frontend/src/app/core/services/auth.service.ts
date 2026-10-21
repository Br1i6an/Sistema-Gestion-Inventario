import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { RespuestaAuth, Usuario } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _accessToken = signal<string | null>(null);
  private readonly _refreshToken = signal<string | null>(null);
  private readonly _usuario = signal<Usuario | null>(null);
  private renovando = false;

  private readonly _inicializacion: Promise<void>;
  private resolverInicializacion!: () => void;
  private restauracionIniciada = false;

  readonly accessToken = this._accessToken.asReadonly();
  readonly usuario = this._usuario.asReadonly();
  readonly autenticado = computed(() => this._usuario() !== null);

  constructor() {
    this._inicializacion = new Promise<void>((resolve) => {
      this.resolverInicializacion = resolve;
    });

    //La restauracion no se inicia aqui: durante la construccion del servicio
    //no se puede emitir una peticion HTTP porque el interceptor inyecta este
    //mismo servicio (dependencia circular). Se dispara bajo demanda.
  }

  async esperarInicializacion(): Promise<void> {
    if (!this.restauracionIniciada) {
      await this.restaurarSesion();
      return;
    }

    await this._inicializacion;
  }

  async restaurarSesion(): Promise<void> {
    if (this.restauracionIniciada) {
      await this._inicializacion;
      return;
    }

    this.restauracionIniciada = true;

    try {
      const refreshToken = this.leerRefreshToken();
      if (refreshToken) {
        this._refreshToken.set(refreshToken);
        await this.refrescar();
      }
    } finally {
      //Se libera siempre la espera, incluso si la restauracion falla.
      this.resolverInicializacion();
    }
  }

  async login(username: string, password: string): Promise<RespuestaAuth> {
    const respuesta = await firstValueFrom(
      this.http.post<RespuestaAuth>('/api/auth/login', { username, password })
    );

    if (respuesta.exitoso && respuesta.accessToken) {
      this.guardarSesion(respuesta);
    }

    return respuesta;
  }

  async refrescar(): Promise<boolean> {
    const refreshToken = this._refreshToken();
    if (!refreshToken || this.renovando) {
      return false;
    }

    this.renovando = true;
    try {
      const respuesta = await firstValueFrom(
        this.http.post<RespuestaAuth>('/api/auth/refresh', { refreshToken })
      );

      if (respuesta.exitoso && respuesta.accessToken) {
        this.guardarSesion(respuesta);
        return true;
      }

      this.limpiarSesion();
      return false;
    } catch {
      this.limpiarSesion();
      return false;
    } finally {
      this.renovando = false;
    }
  }

  async logout(): Promise<void> {
    const refreshToken = this._refreshToken();

    if (refreshToken) {
      try {
        await firstValueFrom(
          this.http.post('/api/auth/logout', { refreshToken })
        );
      } catch {
        //Si el logout del backend falla, la sesion local se limpia igual.
      }
    }

    this.limpiarSesion();
    this.router.navigate(['/login']);
  }

  private guardarSesion(respuesta: RespuestaAuth): void {
    this._accessToken.set(respuesta.accessToken);
    this._refreshToken.set(respuesta.refreshToken);
    this._usuario.set(respuesta.usuario);
    this.guardarRefreshToken(respuesta.refreshToken);

    //La sesion ya esta establecida: no hace falta restaurarla ni canjear el
    //refresh token otra vez.
    if (!this.restauracionIniciada) {
      this.restauracionIniciada = true;
      this.resolverInicializacion();
    }
  }

  private limpiarSesion(): void {
    this._accessToken.set(null);
    this._refreshToken.set(null);
    this._usuario.set(null);
    this.borrarRefreshToken();
  }

  private guardarRefreshToken(token: string | null): void {
    try {
      if (token) {
        sessionStorage.setItem('inventario.refreshToken', token);
      } else {
        sessionStorage.removeItem('inventario.refreshToken');
      }
    } catch {
      //Modo privado o almacenamiento deshabilitado: se ignora.
    }
  }

  private leerRefreshToken(): string | null {
    try {
      return sessionStorage.getItem('inventario.refreshToken');
    } catch {
      return null;
    }
  }

  private borrarRefreshToken(): void {
    try {
      sessionStorage.removeItem('inventario.refreshToken');
    } catch {
      //Nada que hacer.
    }
  }
}
