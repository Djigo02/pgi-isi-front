import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { SelecteurSalle } from '../selecteur-salle/selecteur-salle';
import { PlanningStore, EcAvecVolume } from '../../services/planning-store.service';
import { Jour, LIBELLE_JOUR, TYPES_SEANCE, TypeSeance } from '../../models/enums';
import { Creneau, SeanceRequest } from '../../models/planification.model';
import { contientBloquant, detecterConflits } from '../../utils/conflit.util';
import { dureeEnHeures, tailleMaximale } from '../../utils/creneau.util';

/**
 * Trois decisions sont prises ici : QUI enseigne, OU, et sur COMBIEN de creneaux.
 *
 * Un EC peut etre assure par plusieurs enseignants habilites ; la seance en
 * designe exactement un. Les contraintes sont revalidees a chaque changement,
 * avec les memes regles que ConflitService cote back.
 */
@Component({
  selector: 'app-modale-seance',
  imports: [SelecteurSalle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './modale-seance.html',
  styleUrl: './modale-seance.css'
})
export class ModaleSeance {
  private readonly store = inject(PlanningStore);

  readonly ec = input.required<EcAvecVolume>();
  readonly jour = input.required<Jour>();
  readonly creneau = input.required<Creneau>();

  readonly valide = output<SeanceRequest>();
  readonly annule = output<void>();

  protected readonly libelleJour = LIBELLE_JOUR;
  protected readonly typesSeance = TYPES_SEANCE;
  protected readonly salles = this.store.salles;
  protected readonly seances = this.store.seances;
  protected readonly creneaux = this.store.creneaux;
  protected readonly classe = this.store.classeCourante;

  /** linkedSignal : la valeur se reinitialise si l'EC ou le creneau change. */
  protected readonly enseignantId = linkedSignal<string | null>(
    () => this.ec().enseignants[0]?.id ?? null
  );

  protected readonly type = linkedSignal<TypeSeance>(
    () => (this.ec().volumeHebdomadaire >= 5 ? 'CM' : 'TD')
  );

  protected readonly nbCreneaux = linkedSignal<number>(() =>
    Math.max(1, Math.min(2, Math.ceil(this.ec().volumeRestant / dureeEnHeures(this.creneau()))))
  );

  protected readonly salleId = linkedSignal<string | null>(() => {
    this.creneau();
    return null;
  });

  protected readonly dureesPossibles = computed(() => {
    const maximum = tailleMaximale(this.creneau(), this.creneaux());
    const heure = dureeEnHeures(this.creneau());
    return Array.from({ length: Math.max(1, maximum) }, (_, index) => ({
      valeur: index + 1,
      libelle: `${index + 1} creneau${index > 0 ? 'x' : ''} - ${(index + 1) * heure} h`
    }));
  });

  protected readonly requete = computed<SeanceRequest | null>(() => {
    const enseignantId = this.enseignantId();
    const salleId = this.salleId();
    const periodeId = this.store.periodeId();
    const classeId = this.store.classeId();
    if (!enseignantId || !salleId || !periodeId || !classeId) return null;

    return {
      periodeId,
      classeId,
      ecId: this.ec().id,
      enseignantId,
      salleId,
      creneauId: this.creneau().id,
      jour: this.jour(),
      nbCreneaux: this.nbCreneaux(),
      type: this.type()
    };
  });

  protected readonly violations = computed(() => {
    const requete = this.requete();
    if (!requete) return [];
    return detecterConflits({ ...requete, id: null }, this.store.contexteConflit());
  });

  protected readonly bloque = computed(
    () => this.requete() === null || contientBloquant(this.violations())
  );

  protected readonly disponibiliteEnseignant = computed(() => {
    const jour = this.jour();
    const creneauId = this.creneau().id;
    return new Map(
      this.ec().enseignants.map((enseignant) => {
        const regle = this.store
          .disponibilites()
          .find(
            (d) =>
              d.enseignantId === enseignant.id &&
              d.jour === jour &&
              (d.creneau === null || d.creneau.id === creneauId)
          );
        return [enseignant.id, regle?.type ?? 'DISPONIBLE'];
      })
    );
  });

  protected confirmer(): void {
    const requete = this.requete();
    if (requete && !this.bloque()) this.valide.emit(requete);
  }
}
