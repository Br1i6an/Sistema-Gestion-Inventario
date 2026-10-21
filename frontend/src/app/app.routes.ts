import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent),
    title: 'Iniciar sesion | Inventario'
  },
  {
    path: '',
    loadComponent: () => import('./layout/layout.component').then((m) => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
        title: 'Dashboard | Inventario'
      },
      {
        path: 'inventario',
        loadComponent: () =>
          import('./features/inventario/inventario.component').then((m) => m.InventarioComponent),
        title: 'Inventario | Inventario'
      },
      {
        path: 'productos',
        loadComponent: () =>
          import('./features/productos/productos.component').then((m) => m.ProductosComponent),
        title: 'Productos | Inventario'
      },
      {
        path: 'movimientos',
        loadComponent: () =>
          import('./features/movimientos/movimientos.component').then((m) => m.MovimientosComponent),
        title: 'Movimientos | Inventario'
      },
      {
        path: 'entradas',
        canActivate: [roleGuard(['ADMIN', 'OPERADOR'])],
        loadComponent: () =>
          import('./features/movimientos/entradas.component').then((m) => m.EntradasComponent),
        title: 'Entradas | Inventario'
      },
      {
        path: 'salidas',
        canActivate: [roleGuard(['ADMIN', 'OPERADOR'])],
        loadComponent: () =>
          import('./features/movimientos/salidas.component').then((m) => m.SalidasComponent),
        title: 'Salidas | Inventario'
      },
      {
        path: 'ajustes',
        canActivate: [roleGuard(['ADMIN', 'OPERADOR'])],
        loadComponent: () =>
          import('./features/movimientos/ajustes.component').then((m) => m.AjustesComponent),
        title: 'Ajustes | Inventario'
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
