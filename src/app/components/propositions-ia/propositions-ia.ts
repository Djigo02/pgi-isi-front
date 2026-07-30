import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { LIBELLE_JOUR } from '../../models/enums';
import { DemandeGeneration, Proposition } from '../../models/planification.model';
import { PlanningStore } from '../../services/planning-store.service';

/**
 * Propositions du moteur, classees par score.
 * L'IA propose, le chef de departement decide : rien n'est ecrit sans acceptation.
 */
@Component({
  selector: 'app-propositions-ia',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './propositions-ia.html',
  styleUrl: './propositions-ia.css'
})
export class PropositionsIa {
  private readonly store = inject(PlanningStore);

  readonly demande = input.required<DemandeGeneration>();
  readonly accepte = output<Proposition>();
  readonly ferme = output<void>();

  protected readonly libelleJour = LIBELLE_JOUR;

  protected resume(proposition: Proposition): string {
    const ecs = this.store.ecsParId();
    const enseignants = this.store.enseignantsParId();

    return proposition.seancesProposees
      .map((seance) => {
        const code = ecs.get(seance.ecId)?.code ?? seance.ecId;
        const nom = enseignants.get(seance.enseignantId)?.nom ?? '';
        return `${code} - ${LIBELLE_JOUR[seance.jour]} ${seance.creneau.heureDebut} - ${nom} - ${seance.salle.code}`;
      })
      .join(' | ');
  }
}
