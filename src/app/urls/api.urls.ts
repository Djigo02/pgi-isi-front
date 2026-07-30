import { environment } from '../../environments/environment';

/**
 * Toutes les URL du microservice Planification.
 * Aucune chaine d'URL ne doit apparaitre ailleurs dans l'application :
 * si le back change de chemin, ce fichier est le seul a modifier.
 *
 * Aligne sur ms_plannification_enseignement (base /api/planification).
 */
export const API_ROOT = `${environment.apiBaseUrl}/api/planification`;

export const API_URLS = {
  // --- Pedagogie -----------------------------------------------------------
  periodes: `${API_ROOT}/periodes`,
  periode: (id: string) => `${API_ROOT}/periodes/${id}`,

  classes: `${API_ROOT}/classes`,
  classe: (id: string) => `${API_ROOT}/classes/${id}`,

  elementsConstitutifs: `${API_ROOT}/elements-constitutifs`,
  elementConstitutif: (id: string) => `${API_ROOT}/elements-constitutifs/${id}`,

  enseignants: `${API_ROOT}/enseignants`,
  enseignant: (id: string) => `${API_ROOT}/enseignants/${id}`,

  affectations: `${API_ROOT}/affectations-enseignants`,
  affectation: (id: string) => `${API_ROOT}/affectations-enseignants/${id}`,

  // --- Referentiel ---------------------------------------------------------
  campus: `${API_ROOT}/campus`,
  campusDetail: (id: string) => `${API_ROOT}/campus/${id}`,

  salles: `${API_ROOT}/salles`,
  salle: (id: string) => `${API_ROOT}/salles/${id}`,
  sallesDisponibles: `${API_ROOT}/salles/disponibles`,

  creneaux: `${API_ROOT}/creneaux`,
  creneau: (id: string) => `${API_ROOT}/creneaux/${id}`,

  // --- Planification -------------------------------------------------------
  disponibilites: `${API_ROOT}/disponibilites`,
  disponibilite: (id: string) => `${API_ROOT}/disponibilites/${id}`,

  seances: `${API_ROOT}/seances`,
  seance: (id: string) => `${API_ROOT}/seances/${id}`,
  seanceVerifier: `${API_ROOT}/seances/verifier`,
  seanceDeplacer: (id: string) => `${API_ROOT}/seances/${id}/deplacer`,
  seanceDuree: (id: string) => `${API_ROOT}/seances/${id}/duree`,
  seancesPublier: `${API_ROOT}/seances/publier`,

  // --- Generation assistee -------------------------------------------------
  demandesGeneration: `${API_ROOT}/demandes-generation`,
  demandeGeneration: (id: string) => `${API_ROOT}/demandes-generation/${id}`,
  accepterProposition: (demandeId: string, propositionId: string) =>
    `${API_ROOT}/demandes-generation/${demandeId}/propositions/${propositionId}/accepter`,

  // --- Emplois du temps (projection en lecture) ----------------------------
  emploiDuTempsClasse: (classeId: string) => `${API_ROOT}/emplois-du-temps/classes/${classeId}`,
  emploiDuTempsEnseignant: (id: string) => `${API_ROOT}/emplois-du-temps/enseignants/${id}`,
  emploiDuTempsSalle: (id: string) => `${API_ROOT}/emplois-du-temps/salles/${id}`
} as const;
