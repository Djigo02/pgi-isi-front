import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { PlanningStore } from '../../services/planning-store.service';
import { JOURS, Jour, LIBELLE_JOUR, LIBELLE_TYPE_SALLE } from '../../models/enums';
import { evaluerSallesParCampus } from '../../utils/salle.util';

/**
 * Referentiel des salles, vu campus par campus, avec l'occupation reelle
 * du jour et du creneau selectionnes.
 */
@Component({
  selector: 'app-salles',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './salles.html',
  styleUrl: './salles.css'
})
export class Salles {
  protected readonly store = inject(PlanningStore);

  protected readonly jours = JOURS;
  protected readonly libelleJour = LIBELLE_JOUR;
  protected readonly libelleType = LIBELLE_TYPE_SALLE;

  protected readonly jour = signal<Jour>('LUNDI');
  protected readonly creneauId = signal<string | null>(null);

  protected readonly creneauCourant = computed(() => {
    const id = this.creneauId();
    const creneaux = this.store.creneaux();
    return creneaux.find((c) => c.id === id) ?? creneaux[0];
  });

  protected readonly groupes = computed(() =>
    evaluerSallesParCampus({
      salles: this.store.salles(),
      seances: this.store.seances(),
      creneaux: this.store.creneaux(),
      jour: this.jour(),
      creneauDepart: this.creneauCourant(),
      nbCreneaux: 1,
      effectif: 0
    })
  );

  protected readonly total = computed(() => this.store.salles().length);
  protected readonly nbLibres = computed(() =>
    this.groupes().reduce((total, groupe) => total + groupe.nbLibres, 0),
  );

  constructor() {
    void this.store.initialiser();
  }
}
