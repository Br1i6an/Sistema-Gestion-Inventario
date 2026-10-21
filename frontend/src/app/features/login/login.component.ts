import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { AuthService } from '../../core/services/auth.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import { LogoComponent } from '../../shared/logo/logo.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, NgIcon, LogoComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notificaciones = inject(NotificacionService);

  readonly usuario = signal('');
  readonly contrasena = signal('');
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly mostrarContrasena = signal(false);

  private readonly returnUrl = signal<string>('/dashboard');

  readonly cuentasDemo = [
    { usuario: 'admin', contrasena: 'Admin123!', rol: 'Administrador' },
    { usuario: 'operador', contrasena: 'Operador123!', rol: 'Operador' },
    { usuario: 'lector', contrasena: 'Lector123!', rol: 'Solo lectura' }
  ];

  async ngOnInit(): Promise<void> {
    //Si ya hay una sesion activa, no tiene sentido mostrar el login.
    await this.auth.esperarInicializacion();
    if (this.auth.autenticado()) {
      await this.router.navigate([this.returnUrl()]);
      return;
    }

    const destino = this.route.snapshot.queryParamMap.get('returnUrl');
    if (destino && destino.startsWith('/') && !destino.startsWith('//')) {
      this.returnUrl.set(destino);
    }
  }

  usarCuenta(usuario: string, contrasena: string): void {
    this.usuario.set(usuario);
    this.contrasena.set(contrasena);
    this.error.set(null);
  }

  async entrar(): Promise<void> {
    if (!this.usuario().trim() || !this.contrasena()) {
      this.error.set('Ingrese su usuario y contrasena.');
      return;
    }

    this.cargando.set(true);
    this.error.set(null);

    try {
      const respuesta = await this.auth.login(this.usuario().trim(), this.contrasena());

      if (!respuesta.exitoso) {
        this.error.set(respuesta.mensaje || 'No fue posible iniciar sesion.');
        return;
      }

      this.notificaciones.exito(`Bienvenido, ${respuesta.usuario?.nombreCompleto}.`);
      await this.router.navigateByUrl(this.returnUrl());
    } catch (e) {
      this.error.set(this.notificaciones.extraerMensaje(e));
    } finally {
      this.cargando.set(false);
    }
  }
}
