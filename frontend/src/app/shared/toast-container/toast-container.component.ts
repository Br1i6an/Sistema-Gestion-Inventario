import { Component, inject } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { NotificacionService } from '../../core/services/notificacion.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [NgIcon],
  templateUrl: './toast-container.component.html',
  styleUrl: './toast-container.component.css'
})
export class ToastContainerComponent {
  readonly servicio = inject(NotificacionService);
}
