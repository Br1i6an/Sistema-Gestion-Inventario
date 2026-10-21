import { Component, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Movimiento } from '../../core/models';
import { MovimientoFormComponent } from './movimiento-form/movimiento-form.component';

@Component({
  selector: 'app-salidas',
  standalone: true,
  imports: [MovimientoFormComponent, DecimalPipe],
  templateUrl: './salidas.component.html',
  styleUrl: './movimientos-pagina.css'
})
export class SalidasComponent {
  readonly ultimoMovimiento = signal<Movimiento | null>(null);
}
