import { Component, Input, OnInit, inject, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { Movimiento, Producto } from '../../../core/models';
import { InventarioApiService } from '../../../core/services/inventario-api.service';
import { NotificacionService } from '../../../core/services/notificacion.service';

export type ModoMovimiento = 'entrada' | 'salida' | 'ajuste';

@Component({
  selector: 'app-movimiento-form',
  standalone: true,
  imports: [FormsModule, DecimalPipe, NgIcon],
  templateUrl: './movimiento-form.component.html',
  styleUrl: './movimiento-form.component.css'
})
export class MovimientoFormComponent implements OnInit {
  private readonly api = inject(InventarioApiService);
  private readonly notificaciones = inject(NotificacionService);

  @Input() modo: ModoMovimiento = 'entrada';

  readonly onRegistrado = output<Movimiento>();

  readonly productos = signal<Producto[]>([]);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly busquedaProducto = signal('');

  //Campos del formulario
  readonly productoId = signal<number | null>(null);
  readonly cantidad = signal<number | null>(null);
  readonly precioUnitario = signal<number | null>(null);
  readonly stockFinal = signal<number | null>(null);
  readonly motivo = signal('');
  readonly referencia = signal('');
  readonly errores = signal<Record<string, string>>({});

  async ngOnInit(): Promise<void> {
    await this.cargarProductos();
  }

  async cargarProductos(): Promise<void> {
    this.cargando.set(true);
    try {
      const resultado = await this.api.getInventario({ pagina: 1, tamano: 100, soloActivos: true });
      this.productos.set(resultado.items);
    } catch (e) {
      this.notificaciones.errorHttp(e);
    } finally {
      this.cargando.set(false);
    }
  }

  productoSeleccionado(): Producto | undefined {
    return this.productos().find((p) => p.id === this.productoId());
  }

  productosFiltrados(): Producto[] {
    const texto = this.busquedaProducto().trim().toLowerCase();
    if (!texto) {
      return this.productos();
    }
    return this.productos().filter(
      (p) =>
        p.nombre.toLowerCase().includes(texto) ||
        p.codigo.toLowerCase().includes(texto)
    );
  }

  onProductoChange(id: number | null): void {
    this.productoId.set(id);
    const producto = this.productoSeleccionado();

    //Al elegir el producto se sugiere su precio unitario.
    if (producto && this.precioUnitario() === null) {
      this.precioUnitario.set(producto.precioUnitario);
    }
  }

  async registrar(): Promise<void> {
    if (!this.validar()) {
      return;
    }

    this.guardando.set(true);
    this.errores.set({});

    try {
      let movimiento: Movimiento;

      if (this.modo === 'entrada') {
        movimiento = await this.api.registrarEntrada({
          productoId: this.productoId()!,
          cantidad: this.cantidad()!,
          precioUnitario: this.precioUnitario(),
          motivo: this.motivo().trim() || undefined,
          referencia: this.referencia().trim() || undefined
        });
      } else if (this.modo === 'salida') {
        movimiento = await this.api.registrarSalida({
          productoId: this.productoId()!,
          cantidad: this.cantidad()!,
          motivo: this.motivo().trim() || undefined,
          referencia: this.referencia().trim() || undefined
        });
      } else {
        movimiento = await this.api.registrarAjuste({
          productoId: this.productoId()!,
          stockFinal: this.stockFinal()!,
          motivo: this.motivo().trim() || undefined,
          referencia: this.referencia().trim() || undefined
        });
      }

      this.notificaciones.exito(
        `${this.titulo()} ${this.modo === 'ajuste' ? 'registrado' : 'registrada'}. ` +
        `Stock: ${movimiento.stockAnterior} → ${movimiento.stockResultante}.`
      );

      this.onRegistrado.emit(movimiento);
      this.limpiarFormulario();
    } catch (e) {
      this.notificaciones.errorHttp(e);
    } finally {
      this.guardando.set(false);
    }
  }

  private validar(): boolean {
    const errores: Record<string, string> = {};

    if (!this.productoId()) {
      errores['productoId'] = 'Seleccione un producto.';
    }

    if (this.modo === 'ajuste') {
      if (this.stockFinal() === null || this.stockFinal()! < 0) {
        errores['stockFinal'] = 'Ingrese un stock final valido (mayor o igual a cero).';
      }
    } else {
      if (this.cantidad() === null || this.cantidad()! <= 0) {
        errores['cantidad'] = 'La cantidad debe ser mayor a cero.';
      }
    }

    this.errores.set(errores);
    return Object.keys(errores).length === 0;
  }

  private limpiarFormulario(): void {
    this.cantidad.set(null);
    this.stockFinal.set(null);
    this.motivo.set('');
    this.referencia.set('');
    this.precioUnitario.set(this.productoSeleccionado()?.precioUnitario ?? null);
  }

  titulo(): string {
    switch (this.modo) {
      case 'entrada':
        return 'Entrada';
      case 'salida':
        return 'Salida';
      default:
        return 'Ajuste';
    }
  }

  descripcion(): string {
    switch (this.modo) {
      case 'entrada':
        return 'Registra el ingreso de mercaderia al almacen. El stock del producto aumenta y queda registrada la operacion en la bitacora.';
      case 'salida':
        return 'Registra el despacho de mercaderia. El stock del producto disminuye y la operacion queda registrada en la bitacora.';
      default:
        return 'Ajusta el stock a un valor absoluto luego de un conteo fisico. La diferencia queda registrada como movimiento de ajuste.';
    }
  }
}
