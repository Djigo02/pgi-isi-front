import { Injectable, computed, inject, signal } from '@angular/core';
import { PedagogieService } from './pedagogie.service';
import { PlanificationService } from './planification.service';
import { ReferentielService } from './referentiel.service';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';
import { ContexteConflit } from '../utils/conflit.util';
import { dureeSeance } from '../utils/creneau.util';
import {
  AffectationEnseignant, Campus, Classe, Creneau, Disponibilite,
  ElementConstitutif, Enseignant, Periode, Salle, Seance
} from '../models/planification.model';

/** EC enrichi du volume deja programme pour la classe et la periode courantes. */
export interface EcAvecVolume extends ElementConstitutif {
  volumeProgramme: number;
  volumeRestant: number;
  /** Enseignants habilites a assurer cet EC. */
  enseignants: Enseignant[];
}

/**
 * Etat unique de l'atelier de planification, entierement en signals.
 *
 * Les composants ne stockent rien : ils lisent des signals calcules et appellent
 * des methodes. C'est ce qui permet a la grille, au panneau des EC et au selecteur
 * de salle de rester coherents sans aucune synchronisation manuelle.
 */
@Injectable({ providedIn: 'root' })
export class PlanningStore {
  private readonly pedagogie = inject(PedagogieService);
  private readonly planification = inject(PlanificationService);
  private readonly referentiel = inject(ReferentielService);
  private readonly notifications = inject(NotificationService);
  private readonly auth = inject(AuthService);

  /** Un chef de departement ne voit et ne gere que les classes de son propre departement. */
  private get departementId(): string | undefined {
    return this.auth.utilisateur()?.departementId;
  }

  /* ------------------------------------------------------------------ Signaux */

  private readonly _periodes = signal<Periode[]>([]);
  private readonly _classes = signal<Classe[]>([]);
  private readonly _creneaux = signal<Creneau[]>([]);
  private readonly _campus = signal<Campus[]>([]);
  private readonly _salles = signal<Salle[]>([]);
  private readonly _enseignants = signal<Enseignant[]>([]);
  private readonly _ecs = signal<ElementConstitutif[]>([]);
  private readonly _affectations = signal<AffectationEnseignant[]>([]);
  private readonly _disponibilites = signal<Disponibilite[]>([]);
  private readonly _seances = signal<Seance[]>([]);

  private readonly _periodeId = signal<string | null>(null);
  private readonly _classeId = signal<string | null>(null);
  private readonly _chargement = signal(false);
  private readonly _pret = signal(false);

  readonly periodes = this._periodes.asReadonly();
  readonly classes = this._classes.asReadonly();
  readonly creneaux = this._creneaux.asReadonly();
  readonly campus = this._campus.asReadonly();
  readonly salles = this._salles.asReadonly();
  readonly enseignants = this._enseignants.asReadonly();
  readonly affectations = this._affectations.asReadonly();
  readonly disponibilites = this._disponibilites.asReadonly();
  readonly seances = this._seances.asReadonly();
  readonly periodeId = this._periodeId.asReadonly();
  readonly classeId = this._classeId.asReadonly();
  readonly chargement = this._chargement.asReadonly();
  readonly pret = this._pret.asReadonly();

  /* ---------------------------------------------------------------- Calculs */

  readonly creneauxParId = computed(() => new Map(this._creneaux().map((c) => [c.id, c])));
  readonly enseignantsParId = computed(() => new Map(this._enseignants().map((e) => [e.id, e])));
  readonly ecsParId = computed(() => new Map(this._ecs().map((e) => [e.id, e])));

  readonly classeCourante = computed(() =>
    this._classes().find((c) => c.id === this._classeId())
  );

  readonly seancesClasse = computed(() =>
    this._seances().filter((s) => s.classeId === this._classeId() && s.statut !== 'ANNULEE')
  );

  /** EC de la classe, avec leur avancement et la liste des enseignants habilites. */
  readonly ecsAvecVolume = computed<EcAvecVolume[]>(() => {
    const creneaux = this._creneaux();
    const seances = this.seancesClasse();
    const enseignantsParId = this.enseignantsParId();
    const affectations = this._affectations();

    return this._ecs().map((ec) => {
      const programme = seances
        .filter((s) => s.ecId === ec.id)
        .reduce((total, s) => total + dureeSeance(s, creneaux), 0);

      const enseignants = affectations
        .filter((a) => a.ecId === ec.id)
        .map((a) => enseignantsParId.get(a.enseignantId))
        .filter((e): e is Enseignant => e !== undefined);

      return {
        ...ec,
        volumeProgramme: programme,
        volumeRestant: ec.volumeHebdomadaire - programme,
        enseignants
      };
    });
  });

  /** Tout ce dont le detecteur de conflits a besoin, et rien de plus. */
  readonly contexteConflit = computed<ContexteConflit>(() => ({
    seances: this._seances(),
    creneaux: this._creneaux(),
    salles: this._salles(),
    enseignants: this._enseignants(),
    disponibilites: this._disponibilites(),
    affectations: this._affectations(),
    classe: this.classeCourante()
  }));

  readonly nbBrouillons = computed(
    () => this.seancesClasse().filter((s) => s.statut === 'BROUILLON').length
  );

  /* -------------------------------------------------------------- Chargement */

  async initialiser(): Promise<void> {
    if (this._pret()) return;
    this._chargement.set(true);
    try {
      const [periodes, classes, creneaux, campus, salles, enseignants] = await Promise.all([
        this.pedagogie.listerPeriodes(),
        this.pedagogie.listerClasses(this.departementId),
        this.referentiel.listerCreneaux(),
        this.referentiel.listerCampus(),
        this.referentiel.listerSalles(),
        this.pedagogie.listerEnseignants()
      ]);

      this._periodes.set(periodes);
      this._classes.set(classes);
      this._creneaux.set([...creneaux].sort((a, b) => a.ordre - b.ordre));
      this._campus.set(campus);
      this._salles.set(salles);
      this._enseignants.set(enseignants);

      this._periodeId.set(periodes.find((p) => p.actif)?.id ?? periodes[0]?.id ?? null);
      this._classeId.set(classes[0]?.id ?? null);

      await Promise.all([
        this.rechargerEcs(),
        this.rechargerDisponibilites(),
        this.rafraichirSeances(),
        this.rechargerAffectations()
      ]);
      this._pret.set(true);
    } catch (erreur) {
      this.notifications.erreur(this.messageDe(erreur));
    } finally {
      this._chargement.set(false);
    }
  }

  /** Seules les disponibilites et les seances dependent de la periode : la classe n'y change rien. */
  async changerPeriode(periodeId: string): Promise<void> {
    this._periodeId.set(periodeId);
    this._chargement.set(true);
    try {
      await Promise.all([this.rechargerDisponibilites(), this.rafraichirSeances()]);
    } catch (erreur) {
      this.notifications.erreur(this.messageDe(erreur));
    } finally {
      this._chargement.set(false);
    }
  }

  /** Seuls les EC dependent de la classe : pas besoin de retoucher disponibilites/seances/affectations. */
  async changerClasse(classeId: string): Promise<void> {
    this._classeId.set(classeId);
    this._chargement.set(true);
    try {
      await this.rechargerEcs();
    } catch (erreur) {
      this.notifications.erreur(this.messageDe(erreur));
    } finally {
      this._chargement.set(false);
    }
  }

  /** Le backend exige un enseignantId : on interroge chaque enseignant et on fusionne. */
  async rechargerDisponibilites(): Promise<void> {
    const periodeId = this._periodeId();
    if (!periodeId) return;
    const resultats = await Promise.all(
      this._enseignants().map((e) =>
        this.planification.listerDisponibilites({ enseignantId: e.id, periodeId })
      )
    );
    this._disponibilites.set(resultats.flat());
  }

  /** Recharge uniquement les seances : suffisant apres une ecriture. */
  async rafraichirSeances(): Promise<void> {
    const periodeId = this._periodeId();
    if (!periodeId) return;
    this._seances.set(await this.planification.rechercherSeances({ periodeId }));
  }

  async rechargerEnseignants(): Promise<void> {
    this._enseignants.set(await this.pedagogie.listerEnseignants());
  }

  async rechargerClasses(): Promise<void> {
    this._classes.set(await this.pedagogie.listerClasses(this.departementId));
    if (!this._classeId() && this._classes().length) this._classeId.set(this._classes()[0].id);
  }

  /** Recharge les EC de la classe courante : suffisant apres ajout/suppression d'un EC. */
  async rechargerEcs(): Promise<void> {
    const classeId = this._classeId();
    if (!classeId) return;
    this._ecs.set(await this.pedagogie.listerElementsConstitutifs(classeId));
  }

  async rechargerAffectations(): Promise<void> {
    this._affectations.set(await this.pedagogie.listerAffectations());
  }

  async rechargerSalles(): Promise<void> {
    this._salles.set(await this.referentiel.listerSalles());
  }

  messageDe(erreur: unknown): string {
    if (typeof erreur === 'object' && erreur !== null && 'error' in erreur) {
      const corps = (erreur as { error?: { message?: string; violations?: { message: string }[] } }).error;
      if (corps?.violations?.length) return corps.violations[0].message;
      if (corps?.message) return corps.message;
    }
    return erreur instanceof Error ? erreur.message : 'Une erreur est survenue.';
  }
}
