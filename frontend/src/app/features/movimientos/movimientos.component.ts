import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { Movimiento } from '../../core/models';
import { InventarioApiService } from '../../core/services/inventario-api.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import { PaginacionComponent } from '../../shared/paginacion/paginacion.component';

@Component({
  selector: 'app-movimientos',
  standalone: true,
  imports: [FormsModule, NgIcon, PaginacionComponent],
  templateUrl: './movimientos.component.html',
  styleUrl: './movimientos.component.css'
})
export class MovimientosComponent implements OnInit {
  private readonly api = inject(InventarioApiService);
  private readonly notificaciones = inject(NotificacionService);

  readonly cargando = signal(true);
  readonly movimientos = signal<Movimiento[]>([]);
  readonly totalRegistros = signal(0);
  readonly totalPaginas = signal(0);

  //Filtros
  readonly tipo = signal<string | null>(null);
  readonly busqueda = signal('');
  readonly desde = signal('');
  readonly hasta = signal('');
  readonly pagina = signal(1);
  readonly tamanoPagina = 20;

  readonly tiposDisponibles = [
    { valor: 'ENTRADA', etiqueta: 'Entradas' },
    { valor: 'SALIDA', etiqueta: 'Salidas' },
    { valor: 'AJUSTE_POSITIVO', etiqueta: 'Ajustes positivos' },
    { valor: 'AJUSTE_NEGATIVO', etiqueta: 'Ajustes negativos' }
  ];

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);

    try {
      const resultado = await this.api.getMovimientos({
        tipo: this.tipo(),
        busqueda: this.busqueda().trim() || undefined,
        desde: this.desde() || null,
        hasta: this.hasta() || null,
        pagina: this.pagina(),
        tamano: this.tamanoPagina
      });

      this.movimientos.set(resultado.items);
      this.totalRegistros.set(resultado.totalRegistros);
      this.totalPaginas.set(resultado.totalPaginas);
    } catch (e) {
      this.notificaciones.errorHttp(e);
    } finally {
      this.cargando.set(false);
    }
  }

  async aplicarFiltros(): Promise<void> {
    this.pagina.set(1);
    await this.cargar();
  }

  async limpiarFiltros(): Promise<void> {
    this.tipo.set(null);
    this.busqueda.set('');
    this.desde.set('');
    this.hasta.set('');
    await this.aplicarFiltros();
  }

  async cambiarPagina(pagina: number): Promise<void> {
    this.pagina.set(pagina);
    await this.cargar();
  }

  claseTipo(tipo: string): string {
    switch (tipo) {
      case 'Entrada':
        return 'badge--entrada';
      case 'Salida':
        return 'badge--salida';
      default:
        return 'badge--ajuste';
    }
  }

  signo(tipo: string): string {
    return tipo === 'Salida' ? '-' : tipo === 'Entrada' ? '+' : '';
  }

  formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valor);
  }

  formatearFecha(fecha: string): string {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(fecha));
  }
}
