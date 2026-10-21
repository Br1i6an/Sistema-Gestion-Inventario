import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { Categoria, Producto, ProductoRequest } from '../../core/models';
import { InventarioApiService } from '../../core/services/inventario-api.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import { ConfirmarComponent } from '../../shared/confirmar/confirmar.component';
import { PaginacionComponent } from '../../shared/paginacion/paginacion.component';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [FormsModule, DecimalPipe, NgIcon, PaginacionComponent, ConfirmarComponent],
  templateUrl: './productos.component.html',
  styleUrl: './productos.component.css'
})
export class ProductosComponent implements OnInit {
  private readonly api = inject(InventarioApiService);
  private readonly notificaciones = inject(NotificacionService);

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly productos = signal<Producto[]>([]);
  readonly categorias = signal<Categoria[]>([]);
  readonly totalRegistros = signal(0);
  readonly totalPaginas = signal(0);

  //Modales y estado del formulario
  readonly modalAbierto = signal(false);
  readonly modoEdicion = signal<'crear' | 'editar'>('crear');
  readonly productoEditando = signal<Producto | null>(null);
  readonly confirmarBaja = signal(false);
  readonly productoABorrar = signal<Producto | null>(null);

  //Filtros
  readonly busqueda = signal('');
  readonly categoriaId = signal<number | null>(null);
  readonly pagina = signal(1);
  readonly tamanoPagina = 10;

  //Formulario
  readonly form = signal<ProductoRequest>(this.formVacio());

  async ngOnInit(): Promise<void> {
    await this.cargarCategorias();
    await this.cargar();
  }

  private formVacio(): ProductoRequest {
    return {
      codigo: '',
      nombre: '',
      descripcion: '',
      categoriaId: 0,
      precioUnitario: 0,
      stockMinimo: 0,
      stockInicial: 0,
      activo: true
    };
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
        soloActivos: false,
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

  async cambiarPagina(pagina: number): Promise<void> {
    this.pagina.set(pagina);
    await this.cargar();
  }


  abrirCrear(): void {
    this.modoEdicion.set('crear');
    this.productoEditando.set(null);
    this.form.set(this.formVacio());
    this.modalAbierto.set(true);
  }

  abrirEditar(producto: Producto): void {
    this.modoEdicion.set('editar');
    this.productoEditando.set(producto);
    this.form.set({
      codigo: producto.codigo,
      nombre: producto.nombre,
      descripcion: producto.descripcion ?? '',
      categoriaId: producto.categoriaId,
      precioUnitario: producto.precioUnitario,
      stockMinimo: producto.stockMinimo,
      stockInicial: 0,
      activo: producto.activo
    });
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
  }

  actualizarForm<K extends keyof ProductoRequest>(campo: K, valor: ProductoRequest[K]): void {
    this.form.update((f) => ({ ...f, [campo]: valor }));
  }

  async guardar(): Promise<void> {
    const datos = this.form();

    if (!datos.codigo.trim() || !datos.nombre.trim() || !datos.categoriaId) {
      this.notificaciones.aviso('Complete el codigo, el nombre y la categoria.');
      return;
    }

    this.guardando.set(true);

    try {
      if (this.modoEdicion() === 'crear') {
        const creado = await this.api.crearProducto(datos);
        this.notificaciones.exito(`Producto "${creado.nombre}" creado correctamente.`);
      } else {
        const id = this.productoEditando()!.id;
        await this.api.actualizarProducto(id, datos);
        this.notificaciones.exito(`Producto "${datos.nombre}" actualizado correctamente.`);
      }

      this.cerrarModal();

      //Tras crear se vuelve a la primera pagina: el producto nuevo puede no
      //caer en la que estaba abierta y el usuario creeria que no se guardo.
      if (this.modoEdicion() === 'crear') {
        this.pagina.set(1);
      }

      await this.cargar();
    } catch (e) {
      this.notificaciones.errorHttp(e);
    } finally {
      this.guardando.set(false);
    }
  }


  solicitarBaja(producto: Producto): void {
    this.productoABorrar.set(producto);
    this.confirmarBaja.set(true);
  }

  async confirmarDarDeBaja(): Promise<void> {
    const producto = this.productoABorrar();
    if (!producto) {
      return;
    }

    try {
      const resultado = await this.api.darDeBajaProducto(producto.id);
      this.notificaciones.exito(resultado.mensaje);
      await this.cargar();
    } catch (e) {
      this.notificaciones.errorHttp(e);
    } finally {
      this.productoABorrar.set(null);
    }
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
