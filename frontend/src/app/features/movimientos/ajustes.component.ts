import { Component, signal } from '@angular/core';
import { Movimiento } from '../../core/models';
import { MovimientoFormComponent } from './movimiento-form/movimiento-form.component';

@Component({
  selector: 'app-ajustes',
  standalone: true,
  imports: [MovimientoFormComponent],
  templateUrl: './ajustes.component.html',
  styleUrl: './movimientos-pagina.css'
})
export class AjustesComponent {
  readonly ultimoMovimiento = signal<Movimiento | null>(null);
}
