import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

@Component({
  selector: 'app-confirmar',
  standalone: true,
  imports: [NgIcon],
  templateUrl: './confirmar.component.html',
  styleUrl: './confirmar.component.css'
})
export class ConfirmarComponent {
  @Input() visible = false;
  @Input() titulo = 'Confirmar accion';
  @Input() mensaje = '¿Desea continuar?';
  @Input() textoConfirmar = 'Confirmar';
  @Input() textoCancelar = 'Cancelar';
  @Input() peligroso = false;

  @Output() aceptado = new EventEmitter<void>();
  @Output() cancelado = new EventEmitter<void>();

  confirmar(): void {
    this.visible = false;
    this.aceptado.emit();
  }

  cancelar(): void {
    this.visible = false;
    this.cancelado.emit();
  }
}
