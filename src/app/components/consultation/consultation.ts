import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { GrilleSeances } from '../grille-seances/grille-seances';
import { AuthService } from '../../services/auth.service';
import { PedagogieService } from '../../services/pedagogie.service';
import { PlanificationService } from '../../services/planification.service';
import { PlanningStore } from '../../services/planning-store.service';
import { ElementConstitutif, Seance } from '../../models/planification.model';

/**
 * Consultation en lecture seule, pour l'etudiant et pour l'enseignant.
 * La meme grille sert, avec lectureSeule active : ni glisser-deposer, ni boutons.
 */
@Component({
  selector: 'app-consultation',
  imports: [GrilleSeances],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './consultation.html'
})
export class Consultation {
  private readonly auth = inject(AuthService);
  private readonly pedagogie = inject(PedagogieService);
  private readonly planification = inject(PlanificationService);
  protected readonly store = inject(PlanningStore);

  protected readonly seances = signal<Seance[]>([]);
  /** Tous les EC, pas seulement ceux de la classe courante du store. */
  protected readonly ecs = signal<ElementConstitutif[]>([]);
  protected readonly utilisateur = this.auth.utilisateur;

  protected readonly intitule = computed(() => {
    const utilisateur = this.utilisateur();
    if (utilisateur?.role === 'ETUDIANT') {
      const classe = this.store.classes().find((c) => c.id === utilisateur.classeId);
      return classe ? `Emploi du temps de ${classe.nom}` : 'Emploi du temps de votre classe';
    }
    return 'Vos seances de la periode';
  });

  constructor() {
    void this.charger();
  }

  private async charger(): Promise<void> {
    await this.store.initialiser();
    this.ecs.set(await this.pedagogie.listerElementsConstitutifs());

    const utilisateur = this.utilisateur();
    const periodeId = this.store.periodeId();
    if (!utilisateur || !periodeId) return;

    if (utilisateur.role === 'ETUDIANT' && utilisateur.classeId) {
      this.seances.set(await this.planification.emploiDuTempsClasse(utilisateur.classeId, periodeId));
    } else if (utilisateur.role === 'ENSEIGNANT' && utilisateur.enseignantId) {
      this.seances.set(
        await this.planification.emploiDuTempsEnseignant(utilisateur.enseignantId, periodeId)
      );
    }
  }
}
