import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

@Component({
  selector: 'app-paginacion',
  standalone: true,
  imports: [NgIcon],
  templateUrl: './paginacion.component.html',
  styleUrl: './paginacion.component.css'
})
export class PaginacionComponent {
  @Input() pagina = 1;
  @Input() totalPaginas = 0;
  @Input() totalRegistros = 0;
  @Input() tamanoPagina = 20;

  @Output() cambioPagina = new EventEmitter<number>();

  get tieneAnterior(): boolean {
    return this.pagina > 1;
  }

  get tieneSiguiente(): boolean {
    return this.pagina < this.totalPaginas;
  }

  get desde(): number {
    return this.totalRegistros === 0 ? 0 : (this.pagina - 1) * this.tamanoPagina + 1;
  }

  get hasta(): number {
    return Math.min(this.pagina * this.tamanoPagina, this.totalRegistros);
  }

  get paginas(): number[] {
    const total = this.totalPaginas;
    const actual = this.pagina;
    const maximo = 7;

    if (total <= maximo) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    let inicio = Math.max(1, actual - 2);
    let fin = Math.min(total, actual + 2);

    if (actual <= 3) {
      inicio = 1;
      fin = 5;
    } else if (actual >= total - 2) {
      inicio = total - 4;
      fin = total;
    }

    const resultado: number[] = [];
    for (let i = inicio; i <= fin; i++) {
      resultado.push(i);
    }
    return resultado;
  }

  irA(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas && pagina !== this.pagina) {
      this.cambioPagina.emit(pagina);
    }
  }
}
