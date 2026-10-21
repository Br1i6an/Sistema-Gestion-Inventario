import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.accessToken();

  const request = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      const esPeticionAuth =
        req.url.includes('/api/auth/login') || req.url.includes('/api/auth/refresh');

      //Solo se intenta renovar el token en errores 401 de endpoints protegidos.
      if (error.status === 401 && !esPeticionAuth && token) {
        //from() convierte la promesa de refresco en un observable.
        return from(auth.refrescar()).pipe(
          switchMap((ok) => {
            if (!ok) {
              return throwError(() => error);
            }

            const nuevoToken = auth.accessToken();
            const reintento = req.clone({
              setHeaders: { Authorization: `Bearer ${nuevoToken}` }
            });

            return next(reintento);
          }),
          catchError((e) => throwError(() => e))
        );
      }

      return throwError(() => error);
    })
  );
};
