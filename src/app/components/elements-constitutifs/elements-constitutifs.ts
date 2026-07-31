import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { PedagogieService } from "../../services/pedagogie.service";
import { PlanningStore, EcAvecVolume } from "../../services/planning-store.service";
import { NotificationService } from "../../services/notification.service";

const CLE_STOCKAGE_LOCAL = "planification.ec-periode";

/** Association purement locale EC -> periode : aucun champ periodeId n'existe sur l'EC cote backend. */
function chargerEcPeriode(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(CLE_STOCKAGE_LOCAL) ?? "{}");
  } catch {
    return {};
  }
}

/**
 * Gestion des elements constitutifs d'une classe. La periode concernee par un
 * EC est un marquage cosmetique stocke dans le navigateur : le backend ne
 * connait pas de relation EC <-> periode.
 */
@Component({
  selector: "app-elements-constitutifs",
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./elements-constitutifs.html",
  styleUrl: "./elements-constitutifs.css",
})
export class ElementsConstitutifs {
  private readonly fb = inject(FormBuilder);
  private readonly pedagogie = inject(PedagogieService);
  private readonly notifications = inject(NotificationService);
  protected readonly store = inject(PlanningStore);

  protected readonly enregistrementEc = signal(false);
  private readonly ecPeriode = signal<Record<string, string>>(chargerEcPeriode());

  protected readonly formulaireEc = this.fb.nonNullable.group({
    code: ["", [Validators.required]],
    intitule: ["", [Validators.required]],
    volumeHebdomadaire: [3, [Validators.required, Validators.min(1)]],
    periodeId: ["", [Validators.required]],
  });

  constructor() {
    void this.store.initialiser().then(() => {
      this.formulaireEc.patchValue({ periodeId: this.store.periodeId() ?? "" });
    });
  }

  protected async changerClasse(classeId: string): Promise<void> {
    await this.store.changerClasse(classeId);
  }

  protected async changerPeriode(periodeId: string): Promise<void> {
    await this.store.changerPeriode(periodeId);
    this.formulaireEc.patchValue({ periodeId });
  }

  /** Libelle de la periode marquee pour un EC, ou "Toutes" si aucun marquage. */
  protected periodeDe(ec: EcAvecVolume): string {
    const periodeId = this.ecPeriode()[ec.id];
    if (!periodeId) return "Toutes";
    return this.store.periodes().find((p) => p.id === periodeId)?.libelle ?? "Toutes";
  }

  private enregistrerPeriodeEc(ecId: string, periodeId: string): void {
    this.ecPeriode.update((tags) => {
      const suivantes = { ...tags, [ecId]: periodeId };
      localStorage.setItem(CLE_STOCKAGE_LOCAL, JSON.stringify(suivantes));
      return suivantes;
    });
  }

  private retirerPeriodeEc(ecId: string): void {
    this.ecPeriode.update((tags) => {
      const suivantes = { ...tags };
      delete suivantes[ecId];
      localStorage.setItem(CLE_STOCKAGE_LOCAL, JSON.stringify(suivantes));
      return suivantes;
    });
  }

  protected async ajouterEc(): Promise<void> {
    const classeId = this.store.classeId();
    if (!classeId || this.formulaireEc.invalid || this.enregistrementEc())
      return;
    this.enregistrementEc.set(true);
    try {
      const { code, intitule, volumeHebdomadaire, periodeId } = this.formulaireEc.getRawValue();
      const ec = await this.pedagogie.creerElementConstitutif({
        code,
        intitule,
        volumeHebdomadaire,
        classeId,
        actif: true,
      });
      this.enregistrerPeriodeEc(ec.id, periodeId);
      await this.store.rechargerEcs();
      this.formulaireEc.reset({
        code: "",
        intitule: "",
        volumeHebdomadaire: 3,
        periodeId: this.store.periodeId() ?? "",
      });
      this.notifications.succes(`EC ${ec.code} ajoute.`);
    } finally {
      this.enregistrementEc.set(false);
    }
  }

  protected async supprimerEc(ec: EcAvecVolume): Promise<void> {
    await this.pedagogie.supprimerElementConstitutif(ec.id);
    this.retirerPeriodeEc(ec.id);
    await this.store.rechargerEcs();
    await this.store.rechargerAffectations();
    this.notifications.info(`EC ${ec.code} retire.`);
  }
}
