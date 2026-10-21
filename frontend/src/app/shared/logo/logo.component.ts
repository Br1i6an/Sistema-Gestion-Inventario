import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-logo',
  standalone: true,
  template: `
    <svg
      [attr.width]="tamano"
      [attr.height]="tamano"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <!-- Caja superior: cara superior y laterales -->
      <path d="M4 8.5 16 3l12 5.5-12 5.5Z" />
      <path d="M4 8.5v5L16 19v-5" />
      <path d="M28 8.5v5L16 19" />
      <!-- Caja inferior, apilada -->
      <path d="M4 17.5 16 12l12 5.5L16 23Z" />
      <path d="M4 17.5v4.5L16 27v-4" />
      <path d="M28 17.5V22L16 27" />
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      line-height: 0;
    }
  `
})
export class LogoComponent {
  @Input() tamano = 24;
}
