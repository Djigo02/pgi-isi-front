import {
  CodeViolation, Jour, PeriodeJournee, Severite, StatutDemande,
  StatutSeance, TypeDisponibilite, TypeSalle, TypeSeance
} from './enums';

/* ----------------------------------------------------------------- Pedagogie */

export interface Periode {
  id: string;
  libelle: string;
  anneeAcademique: string;
  semestre: number;
  actif: boolean;
}

export interface Departement {
  id: string;
  code: string;
  nom: string;
  actif: boolean;
}

export interface DepartementRequest {
  code: string;
  nom: string;
  actif: boolean;
}

export interface Classe {
  id: string;
  code: string;
  nom: string;
  effectif: number;
  departementId: string;
  departementCode: string;
  departementNom: string;
  actif: boolean;
}

export interface ClasseRequest {
  code: string;
  nom: string;
  effectif: number;
  departementId: string;
  actif: boolean;
}

export interface ElementConstitutif {
  id: string;
  code: string;
  intitule: string;
  volumeHebdomadaire: number;
  classeId: string;
  classeCode: string;
  actif: boolean;
}

export interface ElementConstitutifRequest {
  code: string;
  intitule: string;
  volumeHebdomadaire: number;
  classeId: string;
  actif: boolean;
}

export interface Enseignant {
  id: string;
  matricule: string;
  nom: string;
  email: string;
  grade: string;
  actif: boolean;
}

export interface EnseignantRequest {
  matricule: string;
  nom: string;
  email: string;
  grade: string;
  actif: boolean;
}

export interface AffectationEnseignant {
  id: string;
  enseignantId: string;
  enseignantNom: string;
  ecId: string;
  ecCode: string;
}

export interface AffectationRequest {
  enseignantId: string;
  ecId: string;
}

/* --------------------------------------------------------------- Referentiel */

export interface Campus {
  id: string;
  code: string;
  nom: string;
  actif: boolean;
}

export interface Salle {
  id: string;
  code: string;
  campusId: string;
  campusCode: string;
  campusNom: string;
  etage: number;
  capacite: number;
  type: TypeSalle;
  actif: boolean;
}

export interface SalleRequest {
  code: string;
  campusId: string;
  etage: number;
  capacite: number;
  type: TypeSalle;
  actif: boolean;
}

export interface Creneau {
  id: string;
  code: string;
  heureDebut: string;
  heureFin: string;
  ordre: number;
  periodeJournee: PeriodeJournee;
  actif: boolean;
}

/* -------------------------------------------------------------- Planification */

export interface Violation {
  code: CodeViolation;
  severite: Severite;
  message: string;
}

export interface Disponibilite {
  id: string;
  enseignantId: string;
  periodeId: string;
  jour: Jour;
  creneau: Creneau | null;
  type: TypeDisponibilite;
}

export interface DisponibiliteRequest {
  enseignantId: string;
  periodeId: string;
  jour: Jour;
  creneauId: string | null;
  type: TypeDisponibilite;
}

export interface Seance {
  id: string;
  periodeId: string;
  classeId: string;
  ecId: string;
  enseignantId: string;
  salle: Salle;
  creneau: Creneau;
  jour: Jour;
  nbCreneaux: number;
  ordreDebut: number;
  ordreFin: number;
  type: TypeSeance;
  statut: StatutSeance;
  version: number;
  avertissements: Violation[];
}

export interface SeanceRequest {
  periodeId: string;
  classeId: string;
  ecId: string;
  enseignantId: string;
  salleId: string;
  creneauId: string;
  jour: Jour;
  nbCreneaux: number;
  type: TypeSeance;
}

export interface DeplacementSeanceRequest {
  jour: Jour;
  creneauId: string;
}

export interface DureeSeanceRequest {
  nbCreneaux: number;
}

export interface SeancePatchRequest {
  enseignantId?: string;
  salleId?: string;
  type?: TypeSeance;
}

export interface PublicationRequest {
  classeId: string;
  periodeId: string;
}

export interface VerificationResult {
  violations: Violation[];
  avertissements: Violation[];
}

/* ------------------------------------------------------- Generation assistee */

export interface SeanceProposee {
  id: string;
  periodeId: string;
  classeId: string;
  ecId: string;
  enseignantId: string;
  salle: Salle;
  creneau: Creneau;
  jour: Jour;
  nbCreneaux: number;
  ordreDebut: number;
  ordreFin: number;
  type: TypeSeance;
}

export interface Proposition {
  id: string;
  rang: number;
  scoreDur: number;
  scoreSouple: number;
  retenue: boolean;
  seancesProposees: SeanceProposee[];
  violations: string[];
}

export interface DemandeGeneration {
  id: string;
  periodeId: string;
  demandeurId: string;
  classeIds: string[];
  statut: StatutDemande;
  creeLe: string;
  termineLe: string | null;
  propositions: Proposition[];
}

export interface DemandeGenerationRequest {
  periodeId: string;
  classeIds: string[];
  nombreDePropositions: number;
}

/* ---------------------------------------------------------- Erreurs metier */

export interface ErreurApi {
  timestamp?: string;
  status: number;
  code: string;
  message: string;
  violations?: Violation[];
}
