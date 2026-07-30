/**
 * Chemins internes de l'application. Aucun routerLink ne doit contenir de chaine
 * ecrite a la main : on passe toujours par ces constantes.
 */
export const ROUTE_PATHS = {
  racine: '',
  login: 'login',
  loginEtudiant: 'etudiant',
  loginEnseignant: 'enseignant',
  loginChef: 'chef-departement',

  app: 'app',
  planification: 'planification',
  enseignants: 'enseignants',
  departement: 'departement',
  salles: 'salles',
  consultation: 'consultation'
} as const;

export const APP_ROUTES = {
  loginEtudiant: `/${ROUTE_PATHS.login}/${ROUTE_PATHS.loginEtudiant}`,
  loginEnseignant: `/${ROUTE_PATHS.login}/${ROUTE_PATHS.loginEnseignant}`,
  loginChef: `/${ROUTE_PATHS.login}/${ROUTE_PATHS.loginChef}`,

  planification: `/${ROUTE_PATHS.app}/${ROUTE_PATHS.planification}`,
  enseignants: `/${ROUTE_PATHS.app}/${ROUTE_PATHS.enseignants}`,
  departement: `/${ROUTE_PATHS.app}/${ROUTE_PATHS.departement}`,
  salles: `/${ROUTE_PATHS.app}/${ROUTE_PATHS.salles}`,
  consultation: `/${ROUTE_PATHS.app}/${ROUTE_PATHS.consultation}`
} as const;
