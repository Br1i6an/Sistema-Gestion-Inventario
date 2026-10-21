import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  //Espera a que termine la restauracion de la sesion (por ejemplo, tras
  //recargar la pagina con un refresh token vigente).
  await auth.esperarInicializacion();

  if (auth.autenticado()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
};

export const roleGuard = (roles: string[]): CanActivateFn => {
  return async () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    await auth.esperarInicializacion();

    const usuario = auth.usuario();

    if (usuario && roles.includes(usuario.rol)) {
      return true;
    }

    return router.createUrlTree(['/dashboard']);
  };
};
