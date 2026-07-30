import { Directive, HostBinding, HostListener, inject, input } from '@angular/core';
import { ChargeGlissee, DragDropStore } from '../services/drag-drop.service';

/**
 * Rend un element glissable et publie sa charge dans le store.
 * Aucune regle metier ici : uniquement du transport.
 */
@Directive({
  selector: '[appDraggable]'
})
export class DraggableDirective {
  private readonly store = inject(DragDropStore);

  readonly charge = input.required<ChargeGlissee>({ alias: 'appDraggable' });
  readonly desactive = input(false, { alias: 'appDraggableDesactive' });

  @HostBinding('attr.draggable')
  get glissable(): 'true' | 'false' {
    return this.desactive() ? 'false' : 'true';
  }

  @HostBinding('class.est-glisse') protected enCours = false;

  @HostListener('dragstart', ['$event'])
  protected surDebut(evenement: DragEvent): void {
    if (this.desactive()) {
      evenement.preventDefault();
      return;
    }
    this.enCours = true;
    this.store.demarrer(this.charge());
    evenement.dataTransfer?.setData('text/plain', JSON.stringify(this.charge()));
    if (evenement.dataTransfer) evenement.dataTransfer.effectAllowed = 'move';
  }

  @HostListener('dragend')
  protected surFin(): void {
    this.enCours = false;
    this.store.terminer();
  }
}
