import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { AuthService } from '../core/services/auth.service';
import { LogoComponent } from '../shared/logo/logo.component';

interface MenuItem {
  ruta: string;
  etiqueta: string;
  icono: string;
  roles?: string[];
}

const CLAVE_PREFERENCIA = 'inventario.sidebarColapsado';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIcon, LogoComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly menuAbierto = signal(false);

  readonly colapsado = signal(this.leerPreferencia());

  readonly usuario = this.auth.usuario;

  readonly itemsMenu: MenuItem[] = [
    { ruta: '/dashboard', etiqueta: 'Dashboard', icono: 'lucideLayoutDashboard' },
    { ruta: '/inventario', etiqueta: 'Inventario', icono: 'lucideBoxes' },
    { ruta: '/productos', etiqueta: 'Productos', icono: 'lucidePackage' },
    { ruta: '/movimientos', etiqueta: 'Movimientos', icono: 'lucideArrowRightLeft' },
    {
      ruta: '/entradas',
      etiqueta: 'Entrada de mercaderia',
      icono: 'lucideArrowDownToLine',
      roles: ['ADMIN', 'OPERADOR']
    },
    {
      ruta: '/salidas',
      etiqueta: 'Salida de mercaderia',
      icono: 'lucideArrowUpFromLine',
      roles: ['ADMIN', 'OPERADOR']
    },
    {
      ruta: '/ajustes',
      etiqueta: 'Ajuste de inventario',
      icono: 'lucideSlidersHorizontal',
      roles: ['ADMIN', 'OPERADOR']
    }
  ];

  readonly menuVisible = computed(() => {
    const rol = this.usuario()?.rol;
    return this.itemsMenu.filter((item) => !item.roles || (rol && item.roles.includes(rol)));
  });

  constructor() {
    //Persiste la preferencia de plegado entre recargas.
    effect(() => {
      try {
        localStorage.setItem(CLAVE_PREFERENCIA, this.colapsado() ? '1' : '0');
      } catch {
        //Modo privado o almacenamiento deshabilitado: se ignora.
      }
    });
  }

  private leerPreferencia(): boolean {
    try {
      return localStorage.getItem(CLAVE_PREFERENCIA) === '1';
    } catch {
      return false;
    }
  }

  alternarMenu(): void {
    this.menuAbierto.update((v) => !v);
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  alternarColapso(): void {
    this.colapsado.update((v) => !v);
  }

  get textoColapso(): string {
    return this.colapsado() ? 'Expandir menu lateral' : 'Colapsar menu lateral';
  }

  puedeEditar(): boolean {
    const rol = this.usuario()?.rol;
    return rol === 'ADMIN' || rol === 'OPERADOR';
  }

  async cerrarSesion(): Promise<void> {
    await this.auth.logout();
  }
}
