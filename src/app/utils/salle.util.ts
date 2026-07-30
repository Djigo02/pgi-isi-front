import { Jour } from '../models/enums';
import { Campus, Creneau, Salle, Seance } from '../models/planification.model';
import { chevaucheSeance, intervalleDe } from './creneau.util';

export type StatutSalle = 'LIBRE' | 'OCCUPEE' | 'TROP_PETITE';

export interface SalleEvaluee {
  salle: Salle;
  statut: StatutSalle;
  /** Renseigne quand la salle est occupee : ce qui l'occupe. */
  motif: string;
  selectionnable: boolean;
}

export interface GroupeCampus {
  campus: Pick<Campus, 'id' | 'code' | 'nom'>;
  salles: SalleEvaluee[];
  nbLibres: number;
}

export interface ParametresEvaluation {
  salles: readonly Salle[];
  seances: readonly Seance[];
  creneaux: readonly Creneau[];
  jour: Jour;
  creneauDepart: Creneau | undefined;
  nbCreneaux: number;
  effectif: number;
  /** Seance en cours de deplacement : elle ne doit pas se bloquer elle-meme. */
  seanceIgnoreeId?: string | null;
}

/**
 * Evalue chaque salle pour une plage donnee, puis la regroupe par campus.
 *
 * C'est ce qui manquait a la premiere maquette : on ne voyait ni le campus,
 * ni la raison pour laquelle une salle etait indisponible.
 */
export function evaluerSallesParCampus(p: ParametresEvaluation): GroupeCampus[] {
  const evaluees = p.salles
    .filter((s) => s.actif)
    .map((salle) => evaluerSalle(salle, p))
    .sort((a, b) => a.salle.code.localeCompare(b.salle.code));

  const parCampus = new Map<string, GroupeCampus>();

  for (const evaluee of evaluees) {
    const cle = evaluee.salle.campusId;
    let groupe = parCampus.get(cle);
    if (!groupe) {
      groupe = {
        campus: {
          id: evaluee.salle.campusId,
          code: evaluee.salle.campusCode,
          nom: evaluee.salle.campusNom
        },
        salles: [],
        nbLibres: 0
      };
      parCampus.set(cle, groupe);
    }
    groupe.salles.push(evaluee);
    if (evaluee.statut === 'LIBRE') groupe.nbLibres++;
  }

  return [...parCampus.values()].sort((a, b) => a.campus.nom.localeCompare(b.campus.nom));
}

function evaluerSalle(salle: Salle, p: ParametresEvaluation): SalleEvaluee {
  if (salle.capacite < p.effectif) {
    return {
      salle,
      statut: 'TROP_PETITE',
      motif: `${salle.capacite} places pour ${p.effectif} etudiants`,
      selectionnable: false
    };
  }

  if (p.creneauDepart) {
    const plage = intervalleDe(p.creneauDepart, p.nbCreneaux);
    const occupant = p.seances.find(
      (s) =>
        s.id !== p.seanceIgnoreeId &&
        s.statut !== 'ANNULEE' &&
        s.salle.id === salle.id &&
        chevaucheSeance(plage, p.jour, s)
    );
    if (occupant) {
      return {
        salle,
        statut: 'OCCUPEE',
        motif: `occupee de ${occupant.creneau.heureDebut} sur ${occupant.nbCreneaux} creneau(x)`,
        selectionnable: false
      };
    }
  }

  return { salle, statut: 'LIBRE', motif: `${salle.capacite} places`, selectionnable: true };
}
