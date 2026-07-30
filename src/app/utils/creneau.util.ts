import { Creneau, Seance, SeanceProposee } from '../models/planification.model';

type Occupant = Pick<Seance, 'jour' | 'ordreDebut' | 'ordreFin'>;

/** Intervalle semi-ouvert [debut, fin[ occupe par une seance, en ordres de creneaux. */
export interface Intervalle {
  debut: number;
  fin: number;
}

export function intervalleDe(creneau: Creneau, nbCreneaux: number): Intervalle {
  return { debut: creneau.ordre, fin: creneau.ordre + Math.max(1, nbCreneaux) };
}

/** Le test de conflit tient en une ligne : c'est tout l'interet du modele en intervalles. */
export function seChevauchent(a: Intervalle, b: Intervalle): boolean {
  return a.debut < b.fin && b.debut < a.fin;
}

export function chevaucheSeance(intervalle: Intervalle, jour: string, seance: Occupant): boolean {
  return (
    seance.jour === jour &&
    seChevauchent(intervalle, { debut: seance.ordreDebut, fin: seance.ordreFin })
  );
}

export function creneauxCouverts(creneaux: readonly Creneau[], intervalle: Intervalle): Creneau[] {
  return creneaux.filter((c) => c.ordre >= intervalle.debut && c.ordre < intervalle.fin);
}

/** "08:00 - 10:00" pour une seance qui couvre deux creneaux d'une heure. */
export function libellePlage(creneaux: readonly Creneau[], intervalle: Intervalle): string {
  const couverts = creneauxCouverts(creneaux, intervalle);
  if (couverts.length === 0) return '';
  return `${couverts[0].heureDebut} - ${couverts[couverts.length - 1].heureFin}`;
}

export function dureeEnHeures(creneau: Creneau): number {
  const minutes = (heure: string) => {
    const [hh, mm] = heure.split(':').map(Number);
    return hh * 60 + mm;
  };
  return (minutes(creneau.heureFin) - minutes(creneau.heureDebut)) / 60;
}

/** Duree totale d'une seance en heures, calculee sur les creneaux reellement couverts. */
export function dureeSeance(
  seance: Pick<Seance, 'ordreDebut' | 'ordreFin'>,
  creneaux: readonly Creneau[]
): number {
  return creneauxCouverts(creneaux, { debut: seance.ordreDebut, fin: seance.ordreFin }).reduce(
    (total, c) => total + dureeEnHeures(c),
    0
  );
}

export function dernierOrdre(creneaux: readonly Creneau[]): number {
  return creneaux.reduce((max, c) => Math.max(max, c.ordre), 0);
}

/** Nombre de creneaux encore disponibles a partir d'un creneau de depart. */
export function tailleMaximale(creneauDepart: Creneau, creneaux: readonly Creneau[], plafond = 6): number {
  return Math.min(plafond, dernierOrdre(creneaux) - creneauDepart.ordre + 1);
}

export function estSeanceProposee(s: Seance | SeanceProposee): s is SeanceProposee {
  return !('statut' in s);
}
