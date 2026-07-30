import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import { Jour, LIBELLE_TYPE_SALLE } from '../../models/enums';
import { Creneau, Salle, Seance } from '../../models/planification.model';
import { evaluerSallesParCampus } from '../../utils/salle.util';

/**
 * Choix de la salle, groupe par campus.
 *
 * La premiere maquette se contentait d'une liste deroulante : on ne voyait ni le
 * campus, ni pourquoi une salle etait indisponible. Ici chaque salle affiche son
 * campus, son etage, sa capacite et son statut sur la plage visee.
 */
@Component({
  selector: 'app-selecteur-salle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './selecteur-salle.html',
  styleUrl: './selecteur-salle.css'
})
export class SelecteurSalle {
  readonly salles = input.required<readonly Salle[]>();
  readonly seances = input.required<readonly Seance[]>();
  readonly creneaux = input.required<readonly Creneau[]>();
  readonly jour = input.required<Jour>();
  readonly creneauDepart = input<Creneau | undefined>(undefined);
  readonly nbCreneaux = input.required<number>();
  readonly effectif = input.required<number>();
  readonly seanceIgnoreeId = input<string | null>(null);

  /** Deux sens : le parent lit la salle choisie, le composant la met a jour. */
  readonly salleId = model<string | null>(null);

  protected readonly libelleType = LIBELLE_TYPE_SALLE;
  protected readonly campusFiltre = signal<string | null>(null);
  protected readonly seulementLibres = signal(true);

  protected readonly groupes = computed(() =>
    evaluerSallesParCampus({
      salles: this.salles(),
      seances: this.seances(),
      creneaux: this.creneaux(),
      jour: this.jour(),
      creneauDepart: this.creneauDepart(),
      nbCreneaux: this.nbCreneaux(),
      effectif: this.effectif(),
      seanceIgnoreeId: this.seanceIgnoreeId()
    })
  );

  protected readonly groupesAffiches = computed(() => {
    const filtre = this.campusFiltre();
    const libresUniquement = this.seulementLibres();

    return this.groupes()
      .filter((groupe) => !filtre || groupe.campus.id === filtre)
      .map((groupe) => ({
        ...groupe,
        salles: libresUniquement
          ? groupe.salles.filter((s) => s.statut === 'LIBRE' || s.salle.id === this.salleId())
          : groupe.salles
      }))
      .filter((groupe) => groupe.salles.length > 0);
  });

  protected readonly totalLibres = computed(() =>
    this.groupes().reduce((total, groupe) => total + groupe.nbLibres, 0)
  );

  protected readonly salleChoisie = computed(() =>
    this.groupes()
      .flatMap((groupe) => groupe.salles)
      .find((evaluee) => evaluee.salle.id === this.salleId())
  );

  protected basculerCampus(campusId: string): void {
    this.campusFiltre.update((actuel) => (actuel === campusId ? null : campusId));
  }

  protected choisir(salleId: string, selectionnable: boolean): void {
    if (selectionnable) this.salleId.set(salleId);
  }
}
