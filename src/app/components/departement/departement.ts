import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PedagogieService } from '../../services/pedagogie.service';
import { PlanningStore } from '../../services/planning-store.service';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { ElementConstitutif } from '../../models/planification.model';
import { dureeSeance } from '../../utils/creneau.util';

/**
 * Gestion du departement : periode de travail, classes, elements constitutifs
 * et surtout habilitations. C'est ici qu'on declare qu'un EC peut etre assure
 * par plusieurs enseignants, et qu'on ajoute les classes et EC du departement.
 */
@Component({
  selector: 'app-departement',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './departement.html',
  styleUrl: './departement.css'
})
export class Departement {
  private readonly fb = inject(FormBuilder);
  private readonly pedagogie = inject(PedagogieService);
  private readonly notifications = inject(NotificationService);
  private readonly auth = inject(AuthService);
  protected readonly store = inject(PlanningStore);

  protected readonly utilisateur = this.auth.utilisateur;
  protected readonly ecSelectionne = signal<ElementConstitutif | null>(null);
  protected readonly enregistrementClasse = signal(false);
  protected readonly enregistrementEc = signal(false);

  protected readonly formulaireClasse = this.fb.nonNullable.group({
    code: ['', [Validators.required]],
    nom: ['', [Validators.required]],
    effectif: [30, [Validators.required, Validators.min(1)]]
  });

  protected readonly formulaireEc = this.fb.nonNullable.group({
    code: ['', [Validators.required]],
    intitule: ['', [Validators.required]],
    volumeHebdomadaire: [3, [Validators.required, Validators.min(1)]]
  });

  /** Avancement global de la classe courante : heures posees sur heures dues. */
  protected readonly avancement = computed(() => {
    const ecs = this.store.ecsAvecVolume();
    const du = ecs.reduce((total, ec) => total + ec.volumeHebdomadaire, 0);
    const fait = ecs.reduce((total, ec) => total + ec.volumeProgramme, 0);
    return { du, fait, pourcentage: du === 0 ? 0 : Math.round((fait / du) * 100) };
  });

  protected readonly heuresParEnseignant = computed(() => {
    const creneaux = this.store.creneaux();
    const parEnseignant = new Map<string, number>();
    for (const seance of this.store.seances()) {
      const cumul = parEnseignant.get(seance.enseignantId) ?? 0;
      parEnseignant.set(seance.enseignantId, cumul + dureeSeance(seance, creneaux));
    }
    return this.store
      .enseignants()
      .map((enseignant) => ({ enseignant, heures: parEnseignant.get(enseignant.id) ?? 0 }))
      .sort((a, b) => b.heures - a.heures);
  });

  protected readonly habilitesDeLEc = computed(() => {
    const ec = this.ecSelectionne();
    if (!ec) return [];
    const parId = this.store.enseignantsParId();
    return this.store
      .affectations()
      .filter((a) => a.ecId === ec.id)
      .map((a) => ({ affectationId: a.id, enseignant: parId.get(a.enseignantId) }))
      .filter((entree) => entree.enseignant !== undefined);
  });

  protected readonly candidats = computed(() => {
    const dejaHabilites = new Set(this.habilitesDeLEc().map((h) => h.enseignant!.id));
    return this.store.enseignants().filter((e) => !dejaHabilites.has(e.id));
  });

  constructor() {
    void this.store.initialiser();
  }

  protected async changerClasse(classeId: string): Promise<void> {
    this.ecSelectionne.set(null);
    await this.store.changerClasse(classeId);
  }

  protected async changerPeriode(periodeId: string): Promise<void> {
    await this.store.changerPeriode(periodeId);
  }

  protected async ajouterClasse(): Promise<void> {
    if (this.formulaireClasse.invalid || this.enregistrementClasse()) return;
    this.enregistrementClasse.set(true);
    try {
      const classe = await this.pedagogie.creerClasse({
        ...this.formulaireClasse.getRawValue(),
        actif: true
      });
      await this.store.rechargerClasses();
      await this.changerClasse(classe.id);
      this.formulaireClasse.reset({ code: '', nom: '', effectif: 30 });
      this.notifications.succes(`Classe ${classe.nom} ajoutee.`);
    } finally {
      this.enregistrementClasse.set(false);
    }
  }

  protected async supprimerClasse(classeId: string): Promise<void> {
    await this.pedagogie.supprimerClasse(classeId);
    await this.store.rechargerClasses();
    if (this.store.classeId() === classeId) {
      await this.changerClasse(this.store.classes()[0]?.id ?? '');
    }
    this.notifications.info('Classe retiree.');
  }

  protected async ajouterEc(): Promise<void> {
    const classeId = this.store.classeId();
    if (!classeId || this.formulaireEc.invalid || this.enregistrementEc()) return;
    this.enregistrementEc.set(true);
    try {
      const ec = await this.pedagogie.creerElementConstitutif({
        ...this.formulaireEc.getRawValue(),
        classeId,
        actif: true
      });
      await this.store.rechargerEcs();
      this.formulaireEc.reset({ code: '', intitule: '', volumeHebdomadaire: 3 });
      this.notifications.succes(`EC ${ec.code} ajoute.`);
    } finally {
      this.enregistrementEc.set(false);
    }
  }

  protected async supprimerEc(ec: ElementConstitutif): Promise<void> {
    await this.pedagogie.supprimerElementConstitutif(ec.id);
    await this.store.rechargerEcs();
    await this.store.rechargerAffectations();
    if (this.ecSelectionne()?.id === ec.id) this.ecSelectionne.set(null);
    this.notifications.info(`EC ${ec.code} retire.`);
  }

  protected async habiliter(enseignantId: string): Promise<void> {
    const ec = this.ecSelectionne();
    if (!ec || !enseignantId) return;
    await this.pedagogie.creerAffectation({ enseignantId, ecId: ec.id });
    await this.store.rechargerAffectations();
    this.notifications.succes('Habilitation ajoutee.');
  }

  protected async retirerHabilitation(affectationId: string): Promise<void> {
    await this.pedagogie.supprimerAffectation(affectationId);
    await this.store.rechargerAffectations();
    this.notifications.info('Habilitation retiree.');
  }
}
