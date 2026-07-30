import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { ErreurApi } from '../models/planification.model';

/**
 * Traduit les erreurs HTTP en notifications lisibles.
 *
 * Le back renvoie 409 avec la liste des violations : on affiche la premiere
 * contrainte dure, qui est la seule information utile a l'utilisateur.
 */
export const erreurInterceptor: HttpInterceptorFn = (requete, suivant) => {
  const notifications = inject(NotificationService);

  return suivant(requete).pipe(
    catchError((erreur: HttpErrorResponse) => {
      notifications.erreur(messageLisible(erreur));
      return throwError(() => erreur);
    })
  );
};

function messageLisible(erreur: HttpErrorResponse): string {
  const corps = erreur.error as ErreurApi | undefined;

  if (erreur.status === 409 && corps?.violations?.length) {
    const dure = corps.violations.find((v) => v.severite === 'DURE') ?? corps.violations[0];
    return dure.message;
  }
  if (corps?.message) return corps.message;
  if (erreur.status === 0) return 'Backend injoignable. Verifiez que le service tourne sur le port 8080.';
  if (erreur.status === 404) return 'Ressource introuvable.';
  if (erreur.status === 422) return 'Reference introuvable dans le referentiel.';
  return `Erreur ${erreur.status} lors de l'appel au service.`;
}
