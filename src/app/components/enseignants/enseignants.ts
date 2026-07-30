import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PedagogieService } from '../../services/pedagogie.service';
import { PlanificationService } from '../../services/planification.service';
import { PlanningStore } from '../../services/planning-store.service';
import { NotificationService } from '../../services/notification.service';
import { JOURS, Jour, LIBELLE_JOUR, TYPES_DISPONIBILITE, TypeDisponibilite } from '../../models/enums';
import { Enseignant } from '../../models/planification.model';

/** Gestion des enseignants : ajout, habilitations et disponibilites. */
@Component({
  selector: 'app-enseignants',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './enseignants.html',
  styleUrl: './enseignants.css'
})
export class Enseignants {
  private readonly fb = inject(FormBuilder);
  private readonly pedagogie = inject(PedagogieService);
  private readonly planification = inject(PlanificationService);
  private readonly notifications = inject(NotificationService);
  protected readonly store = inject(PlanningStore);

  protected readonly jours = JOURS;
  protected readonly libelleJour = LIBELLE_JOUR;
  protected readonly typesDisponibilite = TYPES_DISPONIBILITE;

  protected readonly selectionne = signal<Enseignant | null>(null);
  protected readonly enregistrement = signal(false);

  protected readonly formulaire = this.fb.nonNullable.group({
    matricule: ['', [Validators.required]],
    nom: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    grade: ['Assistant', [Validators.required]]
  });

  protected readonly formulaireDisponibilite = this.fb.nonNullable.group({
    jour: ['LUNDI' as Jour, [Validators.required]],
    creneauId: [''],
    type: ['INDISPONIBLE' as TypeDisponibilite, [Validators.required]]
  });

  /** EC que l'enseignant selectionne est habilite a assurer. */
  protected readonly habilitations = computed(() => {
    const enseignant = this.selectionne();
    if (!enseignant) return [];
    return this.store
      .affectations()
      .filter((a) => a.enseignantId === enseignant.id)
      .map((a) => a.ecCode);
  });

  protected readonly disponibilitesSelectionne = computed(() => {
    const enseignant = this.selectionne();
    if (!enseignant) return [];
    return this.store.disponibilites().filter((d) => d.enseignantId === enseignant.id);
  });

  constructor() {
    void this.store.initialiser();
  }

  protected async ajouter(): Promise<void> {
    if (this.formulaire.invalid || this.enregistrement()) return;
    this.enregistrement.set(true);
    try {
      const enseignant = await this.pedagogie.creerEnseignant({
        ...this.formulaire.getRawValue(),
        actif: true
      });
      await this.store.rechargerEnseignants();
      this.formulaire.reset({ matricule: '', nom: '', email: '', grade: 'Assistant' });
      this.notifications.succes(`${enseignant.nom} ajoute au departement.`);
    } finally {
      this.enregistrement.set(false);
    }
  }

  protected async supprimer(enseignant: Enseignant): Promise<void> {
    await this.pedagogie.supprimerEnseignant(enseignant.id);
    await this.store.rechargerEnseignants();
    await this.store.rechargerAffectations();
    if (this.selectionne()?.id === enseignant.id) this.selectionne.set(null);
    this.notifications.info(`${enseignant.nom} retire.`);
  }

  protected async ajouterDisponibilite(): Promise<void> {
    const enseignant = this.selectionne();
    const periodeId = this.store.periodeId();
    if (!enseignant || !periodeId || this.formulaireDisponibilite.invalid) return;

    const valeurs = this.formulaireDisponibilite.getRawValue();
    await this.planification.creerDisponibilite({
      enseignantId: enseignant.id,
      periodeId,
      jour: valeurs.jour,
      creneauId: valeurs.creneauId || null,
      type: valeurs.type
    });
    await this.store.rechargerContexte();
    this.notifications.succes('Disponibilite enregistree.');
  }

  protected async retirerDisponibilite(id: string): Promise<void> {
    await this.planification.supprimerDisponibilite(id);
    await this.store.rechargerContexte();
  }
}
