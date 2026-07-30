import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DraggableDirective } from '../../directives/draggable.directive';
import { DropTargetDirective } from '../../directives/drop-target.directive';
import { ChargeGlissee } from '../../services/drag-drop.service';
import { JOURS, Jour, LIBELLE_JOUR } from '../../models/enums';
import { Creneau, ElementConstitutif, Enseignant, Seance } from '../../models/planification.model';

export interface DepotSeance {
  charge: ChargeGlissee;
  jour: Jour;
  creneauId: string;
}

interface CarteSeance {
  seance: Seance;
  colonne: number;
  ligne: number;
  span: number;
  compacte: boolean;
  codeEc: string;
  nomEnseignant: string;
  plage: string;
}

const HAUTEUR_LIGNE = 42;

/**
 * Grille hebdomadaire : 7 jours en colonnes, les creneaux en lignes.
 *
 * Les cases sont de simples zones de depot ; les seances sont posees par-dessus
 * en grid-area et s'etirent sur autant de lignes que de creneaux occupes.
 */
@Component({
  selector: 'app-grille-seances',
  imports: [DraggableDirective, DropTargetDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './grille-seances.html',
  styleUrl: './grille-seances.css'
})
export class GrilleSeances {
  readonly creneaux = input.required<readonly Creneau[]>();
  readonly seances = input.required<readonly Seance[]>();
  readonly ecs = input.required<readonly ElementConstitutif[]>();
  readonly enseignants = input.required<readonly Enseignant[]>();
  readonly lectureSeule = input(false);

  readonly depot = output<DepotSeance>();
  readonly suppression = output<string>();
  readonly redimensionnement = output<{ seanceId: string; delta: number }>();

  protected readonly jours = JOURS;
  protected readonly libelleJour = LIBELLE_JOUR;

  protected readonly gabaritColonnes = computed(
    () => `92px repeat(${JOURS.length}, minmax(120px, 1fr))`
  );

  protected readonly gabaritLignes = computed(
    () => `auto repeat(${this.creneaux().length}, ${HAUTEUR_LIGNE}px)`
  );

  /** Cle "JOUR|ordre" -> seance, pour savoir quelles cases sont deja prises. */
  private readonly occupation = computed(() => {
    const index = new Map<string, Seance>();
    for (const seance of this.seances()) {
      for (let ordre = seance.ordreDebut; ordre < seance.ordreFin; ordre++) {
        index.set(`${seance.jour}|${ordre}`, seance);
      }
    }
    return index;
  });

  protected readonly cartes = computed<CarteSeance[]>(() => {
    const creneaux = this.creneaux();
    const ecs = new Map(this.ecs().map((e) => [e.id, e]));
    const enseignants = new Map(this.enseignants().map((e) => [e.id, e]));

    return this.seances().flatMap((seance) => {
      const colonne = JOURS.indexOf(seance.jour);
      const ligne = creneaux.findIndex((c) => c.id === seance.creneau.id);
      if (colonne < 0 || ligne < 0) return [];

      const couverts = creneaux.filter(
        (c) => c.ordre >= seance.ordreDebut && c.ordre < seance.ordreFin
      );

      return [{
        seance,
        colonne: colonne + 2,
        ligne: ligne + 2,
        span: seance.nbCreneaux,
        compacte: seance.nbCreneaux === 1,
        codeEc: ecs.get(seance.ecId)?.code ?? seance.ecId,
        nomEnseignant: enseignants.get(seance.enseignantId)?.nom ?? '',
        plage: couverts.length
          ? `${couverts[0].heureDebut} - ${couverts[couverts.length - 1].heureFin}`
          : ''
      }];
    });
  });

  /** Une case n'accepte rien si elle est deja couverte, sauf par la seance qui l'occupe. */
  protected accepte(jour: Jour, ordre: number): (charge: ChargeGlissee) => boolean {
    return (charge) => {
      if (this.lectureSeule()) return false;
      const occupant = this.occupation().get(`${jour}|${ordre}`);
      if (!occupant) return true;
      return charge.type === 'SEANCE' && charge.seanceId === occupant.id;
    };
  }

  protected surDepot(charge: ChargeGlissee, jour: Jour, creneauId: string): void {
    this.depot.emit({ charge, jour, creneauId });
  }

  protected chargeSeance(seance: Seance): ChargeGlissee {
    return { type: 'SEANCE', seanceId: seance.id };
  }
}
