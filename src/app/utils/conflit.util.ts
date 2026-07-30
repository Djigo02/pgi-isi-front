import { Jour, TypeSeance } from '../models/enums';
import {
  AffectationEnseignant, Classe, Creneau, Disponibilite,
  Enseignant, Salle, Seance, Violation
} from '../models/planification.model';
import { chevaucheSeance, creneauxCouverts, dernierOrdre, dureeSeance, intervalleDe } from './creneau.util';

/**
 * Detection de conflits cote client.
 *
 * Elle reprend a l'identique les regles de ConflitService (back) pour donner un
 * retour immediat pendant le glisser-deposer, sans aller-retour reseau. Le back
 * reste l'autorite : toute ecriture repasse par lui, et la base a ses contraintes
 * d'exclusion.
 */
export interface CandidatSeance {
  id?: string | null;
  classeId: string;
  ecId: string;
  enseignantId: string;
  salleId: string;
  jour: Jour;
  creneauId: string;
  nbCreneaux: number;
  type: TypeSeance;
}

export interface ContexteConflit {
  seances: readonly Seance[];
  creneaux: readonly Creneau[];
  salles: readonly Salle[];
  enseignants: readonly Enseignant[];
  disponibilites: readonly Disponibilite[];
  affectations: readonly AffectationEnseignant[];
  classe: Classe | undefined;
}

const HEURES_MAX_PAR_JOUR = 8;

const dur = (code: Violation['code'], message: string): Violation =>
  ({ code, severite: 'DURE', message });
const souple = (code: Violation['code'], message: string): Violation =>
  ({ code, severite: 'SOUPLE', message });

export function detecterConflits(candidat: CandidatSeance, ctx: ContexteConflit): Violation[] {
  const violations: Violation[] = [];
  const creneau = ctx.creneaux.find((c) => c.id === candidat.creneauId);
  if (!creneau) return violations;

  const plage = intervalleDe(creneau, candidat.nbCreneaux);

  if (plage.fin > dernierOrdre(ctx.creneaux) + 1) {
    return [dur('DEBORDE_GRILLE', 'La duree depasse la fin de la journee.')];
  }

  const nom = (id: string) => ctx.enseignants.find((e) => e.id === id)?.nom ?? id;
  const salle = ctx.salles.find((s) => s.id === candidat.salleId);

  const enChevauchement = ctx.seances.filter(
    (s) => s.id !== candidat.id && s.statut !== 'ANNULEE' && chevaucheSeance(plage, candidat.jour, s)
  );

  if (enChevauchement.some((s) => s.classeId === candidat.classeId)) {
    violations.push(dur('CLASSE_OCCUPEE', 'La classe a deja une seance sur cette plage.'));
  }
  if (enChevauchement.some((s) => s.enseignantId === candidat.enseignantId)) {
    violations.push(dur('ENSEIGNANT_OCCUPE', `${nom(candidat.enseignantId)} enseigne deja sur cette plage.`));
  }
  if (enChevauchement.some((s) => s.salle.id === candidat.salleId)) {
    violations.push(dur('SALLE_OCCUPEE', `La salle ${salle?.code ?? ''} est deja occupee.`));
  }

  const couverts = creneauxCouverts(ctx.creneaux, plage);
  const indisponible = couverts.some((c) =>
    ctx.disponibilites.some(
      (d) =>
        d.enseignantId === candidat.enseignantId &&
        d.jour === candidat.jour &&
        d.type === 'INDISPONIBLE' &&
        (d.creneau === null || d.creneau.id === c.id)
    )
  );
  if (indisponible) {
    violations.push(
      dur('ENSEIGNANT_INDISPONIBLE', `${nom(candidat.enseignantId)} est indisponible sur cette plage.`)
    );
  }

  if (salle && ctx.classe && salle.capacite < ctx.classe.effectif) {
    violations.push(
      dur(
        'CAPACITE_INSUFFISANTE',
        `Capacite de ${salle.code} (${salle.capacite}) inferieure a l'effectif (${ctx.classe.effectif}).`
      )
    );
  }

  const habilite = ctx.affectations.some(
    (a) => a.ecId === candidat.ecId && a.enseignantId === candidat.enseignantId
  );
  if (ctx.affectations.length > 0 && !habilite) {
    violations.push(
      dur('ENSEIGNANT_NON_HABILITE', `${nom(candidat.enseignantId)} n'est pas affecte a cet EC.`)
    );
  }

  const heures = heuresDeLaJournee(candidat, plage, ctx);
  if (heures > HEURES_MAX_PAR_JOUR) {
    violations.push(souple('JOURNEE_TROP_CHARGEE', `${heures} h de cours pour la classe ce jour-la.`));
  }

  return violations;
}

function heuresDeLaJournee(
  candidat: CandidatSeance,
  plage: { debut: number; fin: number },
  ctx: ContexteConflit
): number {
  const autres = ctx.seances.filter(
    (s) => s.id !== candidat.id && s.classeId === candidat.classeId && s.jour === candidat.jour
  );
  const total =
    autres.reduce((cumul, s) => cumul + dureeSeance(s, ctx.creneaux), 0) +
    dureeSeance({ ordreDebut: plage.debut, ordreFin: plage.fin }, ctx.creneaux);
  return Math.round(total * 10) / 10;
}

export const contientBloquant = (violations: readonly Violation[]): boolean =>
  violations.some((v) => v.severite === 'DURE');

export const premierBloquant = (violations: readonly Violation[]): Violation | undefined =>
  violations.find((v) => v.severite === 'DURE');
