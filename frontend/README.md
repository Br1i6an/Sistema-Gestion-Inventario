# Frontend - Sistema de Gestion de Inventario

Aplicacion Angular 22 del Sistema de Gestion de Inventario, con **CSS propio**
(sin framework de estilos).

La documentacion completa del proyecto (arquitectura, puesta en marcha, API,
base de datos y seguridad) se encuentra en el **README.md de la raiz** del repositorio.

## Comandos habituales

```bash
npm install        # Instalar dependencias
npm start          # Servidor de desarrollo en http://localhost:4200
npm run build      # Build de produccion en dist/frontend
```

El servidor de desarrollo usa `proxy.conf.json` para redirigir `/api` y `/health`
hacia la API en `http://localhost:5099`. Si la API corre en otro puerto, ajustar
el valor `target` en ese archivo.

## Pruebas unitarias

Las pruebas usan **Jest** con `jest-preset-angular`. La convencion de nombres es
`<carpeta>/test/<archivo>.spec.ts`.

```bash
npm test                # Ejecuta toda la suite (188 pruebas)
npm run test:watch      # Modo watch
npm run test:coverage   # Reporte de cobertura en frontend/coverage
npm run test:ci         # Modo CI

npm test -- src/app/features/login    # Ejecuta solo una carpeta o archivo
```

### Archivos de configuracion

| Archivo | Proposito |
|---|---|
| `jest.config.js` | Configuracion de Jest (entorno jsdom, transformaciones y cobertura) |
| `setup-jest.ts` | Inicializa el entorno de pruebas de Angular (TestBed, modo zoneless) |
| `tsconfig.spec.json` | Configuracion de TypeScript exclusiva para las pruebas |
| `src/app/testing/factories.ts` | Fabricas de datos de prueba (productos, movimientos, etc.) |
