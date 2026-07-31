import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { PedagogieService } from "../../services/pedagogie.service";
import { PlanningStore } from "../../services/planning-store.service";
import { NotificationService } from "../../services/notification.service";
import { AuthService } from "../../services/auth.service";
import { dureeSeance } from "../../utils/creneau.util";

/**
 * Gestion du departement : periode de travail et classes. Les elements constitutifs
 * vivent sur leur propre page, les habilitations sur celle des enseignants.
 */
@Component({
  selector: "app-departement",
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./departement.html",
  styleUrl: "./departement.css",
})
export class Departement {
  private readonly fb = inject(FormBuilder);
  private readonly pedagogie = inject(PedagogieService);
  private readonly notifications = inject(NotificationService);
  private readonly auth = inject(AuthService);
  protected readonly store = inject(PlanningStore);

  protected readonly utilisateur = this.auth.utilisateur;
  protected readonly enregistrementClasse = signal(false);

  protected readonly formulaireClasse = this.fb.nonNullable.group({
    code: ["", [Validators.required]],
    nom: ["", [Validators.required]],
    effectif: [30, [Validators.required, Validators.min(1)]],
  });

  /** Avancement global de la classe courante : heures posees sur heures dues. */
  protected readonly avancement = computed(() => {
    const ecs = this.store.ecsAvecVolume();
    const du = ecs.reduce((total, ec) => total + ec.volumeHebdomadaire, 0);
    const fait = ecs.reduce((total, ec) => total + ec.volumeProgramme, 0);
    return {
      du,
      fait,
      pourcentage: du === 0 ? 0 : Math.round((fait / du) * 100),
    };
  });

  protected readonly heuresParEnseignant = computed(() => {
    const creneaux = this.store.creneaux();
    const parEnseignant = new Map<string, number>();
    for (const seance of this.store.seances()) {
      const cumul = parEnseignant.get(seance.enseignantId) ?? 0;
      parEnseignant.set(
        seance.enseignantId,
        cumul + dureeSeance(seance, creneaux),
      );
    }
    return this.store
      .enseignants()
      .map((enseignant) => ({
        enseignant,
        heures: parEnseignant.get(enseignant.id) ?? 0,
      }))
      .sort((a, b) => b.heures - a.heures);
  });

  constructor() {
    void this.store.initialiser();
  }

  protected async changerClasse(classeId: string): Promise<void> {
    await this.store.changerClasse(classeId);
  }

  protected async changerPeriode(periodeId: string): Promise<void> {
    await this.store.changerPeriode(periodeId);
  }

  protected async ajouterClasse(): Promise<void> {
    const departementId = this.utilisateur()?.departementId;
    if (
      this.formulaireClasse.invalid ||
      this.enregistrementClasse() ||
      !departementId
    )
      return;
    this.enregistrementClasse.set(true);
    try {
      const classe = await this.pedagogie.creerClasse({
        ...this.formulaireClasse.getRawValue(),
        departementId,
        actif: true,
      });
      await this.store.rechargerClasses();
      await this.changerClasse(classe.id);
      this.formulaireClasse.reset({ code: "", nom: "", effectif: 30 });
      this.notifications.succes(`Classe ${classe.nom} ajoutee.`);
    } finally {
      this.enregistrementClasse.set(false);
    }
  }

  protected async supprimerClasse(classeId: string): Promise<void> {
    await this.pedagogie.supprimerClasse(classeId);
    await this.store.rechargerClasses();
    if (this.store.classeId() === classeId) {
      await this.changerClasse(this.store.classes()[0]?.id ?? "");
    }
    this.notifications.info("Classe retiree.");
  }
}
