import { environment } from '../../environments/environment';

/**
 * URL d'authentification.
 *
 * ms_plannification_enseignement n'expose pas encore ces endpoints : AuthService
 * fonctionne aujourd'hui en local. Le jour ou le microservice Utilisateurs arrive,
 * seul AuthService change, les chemins sont deja poses ici.
 */
const AUTH_ROOT = `${environment.apiBaseUrl}/api/auth`;

export const AUTH_URLS = {
  loginEtudiant: `${AUTH_ROOT}/etudiants/login`,
  loginEnseignant: `${AUTH_ROOT}/enseignants/login`,
  loginChefDepartement: `${AUTH_ROOT}/chefs-departement/login`,
  rafraichir: `${AUTH_ROOT}/refresh`,
  deconnexion: `${AUTH_ROOT}/logout`,
  profil: `${AUTH_ROOT}/moi`
} as const;
