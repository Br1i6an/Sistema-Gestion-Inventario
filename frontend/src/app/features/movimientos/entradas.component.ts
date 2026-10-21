import { Component, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Movimiento } from '../../core/models';
import { MovimientoFormComponent } from './movimiento-form/movimiento-form.component';

@Component({
  selector: 'app-entradas',
  standalone: true,
  imports: [MovimientoFormComponent, DecimalPipe],
  templateUrl: './entradas.component.html',
  styleUrl: './movimientos-pagina.css'
})
export class EntradasComponent {
  readonly ultimoMovimiento = signal<Movimiento | null>(null);
}
