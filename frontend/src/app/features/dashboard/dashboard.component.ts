import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { InventarioApiService } from '../../core/services/inventario-api.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import { Movimiento, Producto, ResumenInventario } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, NgIcon],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(InventarioApiService);
  private readonly notificaciones = inject(NotificacionService);

  readonly cargando = signal(true);
  readonly resumen = signal<ResumenInventario | null>(null);
  readonly productosCriticos = signal<Producto[]>([]);
  readonly ultimosMovimientos = signal<Movimiento[]>([]);

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);

    try {
      const [resumen, movimientos, criticos] = await Promise.all([
        this.api.getResumen(),
        this.api.getMovimientos({ pagina: 1, tamano: 8 }),
        this.api.getInventario({ soloBajoStock: true, pagina: 1, tamano: 6 })
      ]);

      this.resumen.set(resumen);
      this.ultimosMovimientos.set(movimientos.items);
      this.productosCriticos.set(criticos.items);
    } catch (e) {
      this.notificaciones.errorHttp(e);
    } finally {
      this.cargando.set(false);
    }
  }

  formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(valor);
  }

  formatearNumero(valor: number): string {
    return new Intl.NumberFormat('es-CO').format(valor);
  }

  formatearFecha(fecha: string): string {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(fecha));
  }

  claseEstado(estado: string): string {
    switch (estado) {
      case 'Agotado':
        return 'badge--agotado';
      case 'Bajo':
        return 'badge--bajo';
      default:
        return 'badge--normal';
    }
  }
}
