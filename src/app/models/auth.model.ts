import { RoleUtilisateur } from './enums';

export interface Utilisateur {
  id: string;
  nom: string;
  role: RoleUtilisateur;
  /** Renseigne pour un etudiant : sa classe. */
  classeId?: string;
  /** Renseigne pour un enseignant : son identifiant enseignant. */
  enseignantId?: string;
  /** Renseigne pour un chef de departement : le departement qu'il gere, et lui seul. */
  departementId?: string;
  departementNom?: string;
  jeton?: string;
}

export interface IdentifiantsEtudiant {
  login: string;
  motDePasse: string;
}

export interface IdentifiantsEnseignant {
  email: string;
  code: string;
}

export interface IdentifiantsChef {
  login: string;
  motDePasse: string;
}
