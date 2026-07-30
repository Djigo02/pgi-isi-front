import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import { PanneauEc } from "../panneau-ec/panneau-ec";
import { GrilleSeances, DepotSeance } from "../grille-seances/grille-seances";
import { ModaleSeance } from "../modale-seance/modale-seance";
import { PropositionsIa } from "../propositions-ia/propositions-ia";
import {
  EcAvecVolume,
  PlanningStore,
} from "../../services/planning-store.service";
import { PlanificationService } from "../../services/planification.service";
import { NotificationService } from "../../services/notification.service";
import { Jour } from "../../models/enums";
import {
  Creneau,
  DemandeGeneration,
  Proposition,
  SeanceRequest,
} from "../../models/planification.model";
import {
  detecterConflits,
  contientBloquant,
  premierBloquant,
} from "../../utils/conflit.util";

interface CibleDepot {
  ec: EcAvecVolume;
  jour: Jour;
  creneau: Creneau;
}

/** Atelier de planification : c'est ici que le chef de departement travaille. */
@Component({
  selector: "app-planning",
  imports: [PanneauEc, GrilleSeances, ModaleSeance, PropositionsIa],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./planning.html",
  styleUrl: "./planning.css",
})
export class Planning {
  protected readonly store = inject(PlanningStore);
  private readonly planification = inject(PlanificationService);
  private readonly notifications = inject(NotificationService);

  protected readonly cible = signal<CibleDepot | null>(null);
  protected readonly demande = signal<DemandeGeneration | null>(null);
  protected readonly generationEnCours = signal(false);

  protected readonly titreClasse = computed(() => {
    const classe = this.store.classeCourante();
    return classe ? `${classe.nom} - ${classe.effectif} etudiants` : "";
  });

  protected readonly nbPubliees = computed(
    () => this.store.seancesClasse().filter((s) => s.statut === "PUBLIEE").length,
  );

  protected readonly volumeRestantTotal = computed(() =>
    this.store
      .ecsAvecVolume()
      .reduce((total, ec) => total + Math.max(ec.volumeRestant, 0), 0),
  );

  constructor() {
    void this.store.initialiser();
  }

  /* ------------------------------------------------------------------ Filtres */

  protected async changerClasse(valeur: string): Promise<void> {
    await this.store.changerClasse(valeur);
  }

  protected async changerPeriode(valeur: string): Promise<void> {
    await this.store.changerPeriode(valeur);
  }

  /* ------------------------------------------------------- Glisser-deposer */

  protected async surDepot(evenement: DepotSeance): Promise<void> {
    if (evenement.charge.type === "SEANCE") {
      await this.deplacer(
        evenement.charge.seanceId,
        evenement.jour,
        evenement.creneauId,
      );
      return;
    }

    const ec = this.store
      .ecsAvecVolume()
      .find((e) => e.id === (evenement.charge as { ecId: string }).ecId);
    const creneau = this.store
      .creneaux()
      .find((c) => c.id === evenement?.creneauId);
    if (!ec || !creneau) return;

    if (ec.enseignants.length === 0) {
      this.notifications.erreur(`Aucun enseignant habilite pour ${ec.code}.`);
      return;
    }
    if (ec.volumeRestant <= 0) {
      this.notifications.info(`${ec.code} : volume hebdomadaire deja atteint.`);
    }

    this.cible.set({ ec, jour: evenement.jour, creneau });
  }

  private async deplacer(
    seanceId: string,
    jour: Jour,
    creneauId: string,
  ): Promise<void> {
    const seance = this.store.seances().find((s) => s.id === seanceId);
    if (!seance) return;

    const violations = detecterConflits(
      {
        id: seance.id,
        classeId: seance.classeId,
        ecId: seance.ecId,
        enseignantId: seance.enseignantId,
        salleId: seance.salle.id,
        jour,
        creneauId,
        nbCreneaux: seance.nbCreneaux,
        type: seance.type,
      },
      this.store.contexteConflit(),
    );

    if (contientBloquant(violations)) {
      this.notifications.erreur(premierBloquant(violations)!.message);
      return;
    }

    await this.planification.deplacerSeance(seanceId, { jour, creneauId });
    await this.store.rafraichirSeances();
    this.notifications.succes("Seance deplacee.");
  }

  /* ---------------------------------------------------------------- Seances */

  protected async confirmerSeance(requete: SeanceRequest): Promise<void> {
    const code = this.cible()?.ec.code ?? "";
    this.cible.set(null);
    try {
      const seance = await this.planification.creerSeance(requete);
      await this.store.rafraichirSeances();
      seance.avertissements.forEach((a) => this.notifications.info(a.message));
      this.notifications.succes(`${code} programme.`);
    } catch {
      // erreurInterceptor a deja notifie l'utilisateur
    }
  }

  protected async redimensionner(evenement: {
    seanceId: string;
    delta: number;
  }): Promise<void> {
    const seance = this.store
      .seances()
      .find((s) => s.id === evenement.seanceId);
    if (!seance) return;

    const nouvelleTaille = seance.nbCreneaux + evenement.delta;
    if (nouvelleTaille < 1) {
      this.notifications.info("Une seance occupe au moins un creneau.");
      return;
    }

    const violations = detecterConflits(
      {
        id: seance.id,
        classeId: seance.classeId,
        ecId: seance.ecId,
        enseignantId: seance.enseignantId,
        salleId: seance.salle.id,
        jour: seance.jour,
        creneauId: seance.creneau.id,
        nbCreneaux: nouvelleTaille,
        type: seance.type,
      },
      this.store.contexteConflit(),
    );

    if (contientBloquant(violations)) {
      this.notifications.erreur(premierBloquant(violations)!.message);
      return;
    }

    await this.planification.changerDuree(seance.id, {
      nbCreneaux: nouvelleTaille,
    });
    await this.store.rafraichirSeances();
  }

  protected async supprimer(seanceId: string): Promise<void> {
    await this.planification.supprimerSeance(seanceId);
    await this.store.rafraichirSeances();
    this.notifications.info("Seance retiree.");
  }

  protected async publier(): Promise<void> {
    const classeId = this.store.classeId();
    const periodeId = this.store.periodeId();
    if (!classeId || !periodeId) return;

    const publiees = await this.planification.publier({ classeId, periodeId });
    await this.store.rafraichirSeances();
    if (publiees.length === 0)
      this.notifications.info("Aucun brouillon a publier.");
    else this.notifications.succes(`${publiees.length} seance(s) publiee(s).`);
  }

  /* ------------------------------------------------------ Generation assistee */

  protected async lancerGeneration(): Promise<void> {
    const classeId = this.store.classeId();
    const periodeId = this.store.periodeId();
    if (!classeId || !periodeId) return;

    this.generationEnCours.set(true);
    try {
      const demande = await this.planification.lancerGeneration({
        periodeId,
        classeIds: [classeId],
        nombreDePropositions: 3,
      });
      this.demande.set(demande);
    } finally {
      this.generationEnCours.set(false);
    }
  }

  protected async accepterProposition(proposition: Proposition): Promise<void> {
    const demande = this.demande();
    if (!demande) return;

    this.demande.set(null);
    const creees = await this.planification.accepterProposition(
      demande.id,
      proposition.id,
    );
    await this.store.rafraichirSeances();
    this.notifications.succes(
      `Proposition ${proposition.rang} appliquee : ${creees.length} seances en brouillon.`,
    );
  }
}
