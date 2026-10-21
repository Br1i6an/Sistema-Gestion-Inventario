/* =============================================================================
 *  Configuracion global de los tests (setup-jest.ts)
 *  Se carga una sola vez, antes de ejecutar cualquier suite.
 * ============================================================================= */

// Prepara el entorno de pruebas de Angular (TestBed) en modo zoneless,
// que es el que usa esta aplicacion (Angular 22 con signals).
import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';

setupZonelessTestEnv();

/* -------------------------------------------------------------------------- */
/*  Silencia el aviso de Angular sobre el uso de Zone.js, que no aplica a     */
/*  esta aplicacion.                                                          */
/* -------------------------------------------------------------------------- */
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const primer = String(args[0] ?? '');
  if (primer.includes('Zone.js') || primer.includes('zone.js')) {
    return;
  }
  originalWarn(...(args as []));
};
