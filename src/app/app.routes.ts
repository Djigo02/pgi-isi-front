import { Routes } from '@angular/router';
import { ROUTE_PATHS } from './urls/app.routes.urls';
import { authGuard, roleGuard } from './guards/auth.guard';

/** Tout est charge a la demande : le bundle initial ne contient que les logins. */
export const routes: Routes = [
  {
    path: ROUTE_PATHS.login,
    children: [
      {
        path: ROUTE_PATHS.loginEtudiant,
        title: 'Espace etudiant',
        loadComponent: () => import('./components/login-etudiant/login-etudiant').then((m) => m.LoginEtudiant)
      },
      {
        path: ROUTE_PATHS.loginEnseignant,
        title: 'Espace enseignant',
        loadComponent: () => import('./components/login-enseignant/login-enseignant').then((m) => m.LoginEnseignant)
      },
      {
        path: ROUTE_PATHS.loginChef,
        title: 'Espace chef de departement',
        loadComponent: () => import('./components/login-chef/login-chef').then((m) => m.LoginChef)
      },
      { path: '', pathMatch: 'full', redirectTo: ROUTE_PATHS.loginChef }
    ]
  },
  {
    path: ROUTE_PATHS.app,
    canActivate: [authGuard],
    loadComponent: () => import('./components/shell/shell').then((m) => m.Shell),
    children: [
      {
        path: ROUTE_PATHS.planification,
        title: 'Planification',
        canActivate: [roleGuard('CHEF_DEPARTEMENT')],
        loadComponent: () => import('./components/planning/planning').then((m) => m.Planning)
      },
      {
        path: ROUTE_PATHS.enseignants,
        title: 'Enseignants',
        canActivate: [roleGuard('CHEF_DEPARTEMENT')],
        loadComponent: () => import('./components/enseignants/enseignants').then((m) => m.Enseignants)
      },
      {
        path: ROUTE_PATHS.departement,
        title: 'Mon departement',
        canActivate: [roleGuard('CHEF_DEPARTEMENT')],
        loadComponent: () => import('./components/departement/departement').then((m) => m.Departement)
      },
      {
        path: ROUTE_PATHS.salles,
        title: 'Salles et campus',
        canActivate: [roleGuard('CHEF_DEPARTEMENT')],
        loadComponent: () => import('./components/salles/salles').then((m) => m.Salles)
      },
      {
        path: ROUTE_PATHS.consultation,
        title: 'Mon emploi du temps',
        loadComponent: () => import('./components/consultation/consultation').then((m) => m.Consultation)
      },
      { path: '', pathMatch: 'full', redirectTo: ROUTE_PATHS.planification }
    ]
  },
  { path: '', pathMatch: 'full', redirectTo: `/${ROUTE_PATHS.login}/${ROUTE_PATHS.loginChef}` },
  { path: '**', redirectTo: `/${ROUTE_PATHS.login}/${ROUTE_PATHS.loginChef}` }
];
