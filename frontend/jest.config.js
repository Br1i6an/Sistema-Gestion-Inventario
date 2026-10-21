/* =============================================================================
 *  Configuracion de Jest para el frontend Angular.
 *
 *  Ejecutar los tests con:      npm test
 *  Modo watch:                   npm run test:watch
 *  Con cobertura:                npm run test:coverage
 *  Solo un archivo:              npm test -- src/app/features/login
 * ============================================================================= */

const { createCjsPreset } = require('jest-preset-angular/presets');

const preset = createCjsPreset({
  tsconfig: '<rootDir>/tsconfig.spec.json',
  testEnvironment: 'jsdom'
});

/**
 * @type {import('jest').Config}
 */
module.exports = {
  ...preset,

  // Prepara el entorno de pruebas de Angular (TestBed).
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],

  // La convencion del proyecto es <carpeta>/test/<archivo>.spec.ts
  testMatch: ['<rootDir>/src/**/*.spec.ts'],

  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/.angular/'],

  // Reporte de cobertura sobre el codigo fuente de la aplicacion.
  collectCoverageFrom: [
    'src/app/**/*.ts',
    '!src/app/**/*.spec.ts',
    '!src/app/**/*.d.ts',
    '!src/app/**/test/**'
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['html', 'text-summary', 'lcov'],

  // Evita problemas de rutas en Windows.
  haste: {
    retainAllFiles: false
  },

  // Silencia el aviso de "Please add a comment" de Angular en los tests.
  // (Se documenta el porque en setup-jest.ts)
  verbose: false
};
