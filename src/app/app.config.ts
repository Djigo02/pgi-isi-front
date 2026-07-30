import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { erreurInterceptor } from './interceptors/erreur.interceptor';
import { mockBackendInterceptor } from './interceptors/mock-backend.interceptor';

/**
 * Zoneless : l'application ne charge pas zone.js et se repose entierement sur
 * les signals pour declencher la detection de changement.
 *
 * Ordre des intercepteurs : erreurInterceptor est le plus externe, il enveloppe
 * donc aussi le mock. Ses 409 simules remontent ainsi par le meme chemin que
 * ceux du vrai back.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([erreurInterceptor, mockBackendInterceptor]))
  ]
};
