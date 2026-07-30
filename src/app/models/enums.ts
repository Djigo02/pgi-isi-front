/** Enumerations du back, transposees en types litteraux TypeScript. */

export type Jour =
  | 'LUNDI' | 'MARDI' | 'MERCREDI' | 'JEUDI' | 'VENDREDI' | 'SAMEDI' | 'DIMANCHE';

export const JOURS: readonly Jour[] = [
  'LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'
] as const;

export const LIBELLE_JOUR: Record<Jour, string> = {
  LUNDI: 'Lundi',
  MARDI: 'Mardi',
  MERCREDI: 'Mercredi',
  JEUDI: 'Jeudi',
  VENDREDI: 'Vendredi',
  SAMEDI: 'Samedi',
  DIMANCHE: 'Dimanche'
};

export type TypeSeance = 'CM' | 'TD' | 'TP';
export const TYPES_SEANCE: readonly TypeSeance[] = ['CM', 'TD', 'TP'] as const;

export type StatutSeance = 'BROUILLON' | 'PUBLIEE' | 'ANNULEE';

export type TypeDisponibilite = 'DISPONIBLE' | 'INDISPONIBLE' | 'PREFERE';
export const TYPES_DISPONIBILITE: readonly TypeDisponibilite[] = [
  'DISPONIBLE', 'INDISPONIBLE', 'PREFERE'
] as const;

export type TypeSalle = 'AMPHI' | 'SALLE_COURS' | 'SALLE_TD';

export const LIBELLE_TYPE_SALLE: Record<TypeSalle, string> = {
  AMPHI: 'Amphi',
  SALLE_COURS: 'Salle de cours',
  SALLE_TD: 'Salle de TD'
};

export type PeriodeJournee = 'MATIN' | 'MIDI' | 'APRES_MIDI' | 'SOIR';

export type StatutDemande = 'EN_COURS' | 'TERMINEE' | 'ECHOUEE';

export type Severite = 'DURE' | 'SOUPLE';

export type CodeViolation =
  | 'CLASSE_OCCUPEE'
  | 'ENSEIGNANT_OCCUPE'
  | 'SALLE_OCCUPEE'
  | 'ENSEIGNANT_INDISPONIBLE'
  | 'CAPACITE_INSUFFISANTE'
  | 'DEBORDE_GRILLE'
  | 'ENSEIGNANT_NON_HABILITE'
  | 'JOURNEE_TROP_CHARGEE'
  | 'VOLUME_DEPASSE';

export type RoleUtilisateur = 'ETUDIANT' | 'ENSEIGNANT' | 'CHEF_DEPARTEMENT';
