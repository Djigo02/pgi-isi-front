import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DraggableDirective } from '../../directives/draggable.directive';
import { EcAvecVolume } from '../../services/planning-store.service';

/** Panneau lateral : les EC de la classe, glissables vers la grille. */
@Component({
  selector: 'app-panneau-ec',
  imports: [DraggableDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="panneau">
      <h2 class="panneau__titre">EC a programmer</h2>
      <p class="panneau__aide">Glissez un EC vers une case de la grille.</p>

      <ul class="liste-ec">
        @for (ec of ecs(); track ec.id) {
          <li
            class="carte-ec"
            [class.carte-ec--complet]="ec.volumeRestant <= 0"
            [appDraggable]="{ type: 'EC', ecId: ec.id }"
            [title]="ec.intitule"
          >
            <div class="carte-ec__entete">
              <span class="carte-ec__code">{{ ec.code }}</span>
              <span class="carte-ec__type">{{ ec.enseignants.length }} enseignant(s)</span>
            </div>
            <p class="carte-ec__intitule">{{ ec.intitule }}</p>
            <div class="jauge">
              <div class="jauge__barre" [style.width.%]="pourcentage(ec)"></div>
            </div>
            <p class="carte-ec__volume">
              {{ ec.volumeProgramme }} h / {{ ec.volumeHebdomadaire }} h hebdo
            </p>
          </li>
        } @empty {
          <li class="panneau__aide">Aucun EC pour cette classe.</li>
        }
      </ul>
    </aside>
  `,
  styleUrl: './panneau-ec.css'
})
export class PanneauEc {
  readonly ecs = input.required<readonly EcAvecVolume[]>();

  protected pourcentage(ec: EcAvecVolume): number {
    if (ec.volumeHebdomadaire === 0) return 0;
    return Math.min(100, Math.round((ec.volumeProgramme / ec.volumeHebdomadaire) * 100));
  }
}
