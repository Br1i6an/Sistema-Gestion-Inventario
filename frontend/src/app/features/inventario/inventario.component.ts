import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { ActivatedRoute } from '@angular/router';
import { Categoria, Producto } from '../../core/models';
import { InventarioApiService } from '../../core/services/inventario-api.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import { PaginacionComponent } from '../../shared/paginacion/paginacion.component';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [FormsModule, NgIcon, PaginacionComponent],
  templateUrl: './inventario.component.html',
  styleUrl: './inventario.component.css'
})
export class InventarioComponent implements OnInit {
  private readonly api = inject(InventarioApiService);
  private readonly notificaciones = inject(NotificacionService);
  private readonly route = inject(ActivatedRoute);

  readonly cargando = signal(true);
  readonly productos = signal<Producto[]>([]);
  readonly categorias = signal<Categoria[]>([]);
  readonly totalRegistros = signal(0);
  readonly totalPaginas = signal(0);

  //Filtros
  readonly busqueda = signal('');
  readonly categoriaId = signal<number | null>(null);
  readonly soloBajoStock = signal(false);
  readonly soloActivos = signal(true);
  readonly ordenarPor = signal('nombre');
  readonly dirOrden = signal<'asc' | 'desc'>('asc');
  readonly pagina = signal(1);
  readonly tamanoPagina = 20;

  async ngOnInit(): Promise<void> {
    await this.cargarCategorias();

    //Permite preseleccionar el filtro de stock bajo desde el dashboard.
    const soloBajo = this.route.snapshot.queryParamMap.get('soloBajoStock');
    if (soloBajo === 'true') {
      this.soloBajoStock.set(true);
    }

    await this.cargar();
  }

  async cargarCategorias(): Promise<void> {
    try {
      this.categorias.set(await this.api.getCategorias());
    } catch (e) {
      this.notificaciones.errorHttp(e);
    }
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);

    try {
      const resultado = await this.api.getInventario({
        busqueda: this.busqueda().trim() || undefined,
        categoriaId: this.categoriaId(),
        soloBajoStock: this.soloBajoStock(),
        soloActivos: this.soloActivos(),
        ordenarPor: this.ordenarPor(),
        dirOrden: this.dirOrden(),
        pagina: this.pagina(),
        tamano: this.tamanoPagina
      });

      this.productos.set(resultado.items);
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
    this.busqueda.set('');
    this.categoriaId.set(null);
    this.soloBajoStock.set(false);
    this.soloActivos.set(true);
    this.ordenarPor.set('nombre');
    this.dirOrden.set('asc');
    await this.aplicarFiltros();
  }

  async cambiarPagina(pagina: number): Promise<void> {
    this.pagina.set(pagina);
    await this.cargar();
  }

  async ordenar(columna: string): Promise<void> {
    if (this.ordenarPor() === columna) {
      this.dirOrden.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.ordenarPor.set(columna);
      this.dirPorDefecto(columna);
    }
    await this.aplicarFiltros();
  }

  private dirPorDefecto(columna: string): void {
    this.dirOrden.set(['stock', 'precio', 'valor'].includes(columna) ? 'desc' : 'asc');
  }

  formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valor);
  }

  formatearNumero(valor: number): string {
    return new Intl.NumberFormat('es-CO').format(valor);
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

  flechaOrden(columna: string): string {
    if (this.ordenarPor() !== columna) {
      return '';
    }
    return this.dirOrden() === 'asc' ? '↑' : '↓';
  }
}
