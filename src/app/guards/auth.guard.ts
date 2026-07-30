import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { APP_ROUTES } from '../urls/app.routes.urls';
import { RoleUtilisateur } from '../models/enums';

/** Toute route applicative exige une session ouverte. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.connecte() ? true : router.createUrlTree([APP_ROUTES.loginChef]);
};

/**
 * Restreint une route a certains roles.
 * Le workflow complet n'est ouvert qu'au chef de departement ; etudiants et
 * enseignants sont renvoyes vers leur page de consultation.
 */
export function roleGuard(...rolesAutorises: RoleUtilisateur[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const role = auth.role();

    if (!role) return router.createUrlTree([APP_ROUTES.loginChef]);
    if (rolesAutorises.includes(role)) return true;
    return router.createUrlTree([APP_ROUTES.consultation]);
  };
}
