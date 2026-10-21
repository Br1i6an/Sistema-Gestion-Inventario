import { describe, expect, it } from '@jest/globals';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { iconos } from '../index';


const RAIZ_APP = join(__dirname, '..', '..', '..');

function plantillas(dir: string = RAIZ_APP): string[] {
  const archivos: string[] = [];

  for (const entrada of readdirSync(dir)) {
    if (entrada === 'test' || entrada === 'testing' || entrada === 'icons') {
      continue;
    }

    const ruta = join(dir, entrada);

    if (statSync(ruta).isDirectory()) {
      archivos.push(...plantillas(ruta));
    } else if (entrada.endsWith('.html') || entrada.endsWith('.ts')) {
      archivos.push(ruta);
    }
  }

  return archivos;
}

function iconosDe(plantilla: string): string[] {
  const contenido = readFileSync(plantilla, 'utf-8');
  const nombres = new Set<string>();

  for (const coincidencia of contenido.matchAll(/<ng-icon[^>]*\bname="([^"]+)"/g)) {
    nombres.add(coincidencia[1]);
  }

  for (const coincidencia of contenido.matchAll(/\[name\]="([^"]+)"/g)) {
    nombres.add(`[dinamico]${coincidencia[1]}`);
  }

  for (const coincidencia of contenido.matchAll(/'(lucide\w+)'/g)) {
    nombres.add(coincidencia[1]);
  }

  return [...nombres];
}

describe('Catalogo de iconos', () => {
  const nombresRegistrados = Object.keys(iconos);

  it('tiene iconos registrados', () => {
    expect(nombresRegistrados.length).toBeGreaterThan(0);
  });

  it('todos los iconos usados en las plantillas estan registrados', () => {
    const faltantes: string[] = [];

    for (const plantilla of plantillas()) {
      for (const nombre of iconosDe(plantilla)) {
        if (nombre.startsWith('[dinamico]')) {
          continue;
        }
        if (!nombresRegistrados.includes(nombre)) {
          faltantes.push(`${nombre} (en ${plantilla.replace(RAIZ_APP, 'src/app')})`);
        }
      }
    }

    expect(faltantes).toEqual([]);
  });

  it('todos los iconos del menu lateral estan registrados', () => {
    const layout = readFileSync(join(RAIZ_APP, 'layout', 'layout.component.ts'), 'utf-8');
    const nombres = [...layout.matchAll(/icono:\s*'(lucide\w+)'/g)].map((m) => m[1]);

    expect(nombres.length).toBeGreaterThan(0);

    for (const nombre of nombres) {
      expect(nombresRegistrados).toContain(nombre);
    }
  });

  it('no hay iconos registrados que no se usen en ninguna plantilla', () => {
    const usados = new Set<string>();

    for (const plantilla of plantillas()) {
      for (const nombre of iconosDe(plantilla)) {
        usados.add(nombre);
      }
    }

    const sinUso = nombresRegistrados.filter((n) => !usados.has(n));
    expect(sinUso).toEqual([]);
  });
});
