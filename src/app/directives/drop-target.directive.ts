import { Directive, HostBinding, HostListener, inject, input, output } from '@angular/core';
import { ChargeGlissee, DragDropStore } from '../services/drag-drop.service';

/**
 * Zone de depot. Le predicat `appDropTargetAccepte` decide si la charge courante
 * peut atterrir ici : la case se colore en consequence avant meme le lacher.
 *
 * Un compteur de profondeur evite le clignotement quand le curseur passe au-dessus
 * d'un enfant de la zone.
 */
@Directive({
  selector: '[appDropTarget]'
})
export class DropTargetDirective {
  private readonly store = inject(DragDropStore);

  readonly accepte = input<(charge: ChargeGlissee) => boolean>(() => true, {
    alias: 'appDropTargetAccepte'
  });
  readonly depot = output<ChargeGlissee>({ alias: 'appDropTargetDepot' });

  @HostBinding('class.case--survol') protected survole = false;
  @HostBinding('class.case--refus') protected refuse = false;

  private profondeur = 0;

  @HostListener('dragenter', ['$event'])
  protected surEntree(evenement: DragEvent): void {
    const charge = this.store.charge();
    if (!charge) return;
    evenement.preventDefault();
    this.profondeur++;
    const autorise = this.accepte()(charge);
    this.survole = autorise;
    this.refuse = !autorise;
  }

  @HostListener('dragover', ['$event'])
  protected surSurvol(evenement: DragEvent): void {
    const charge = this.store.charge();
    if (!charge) return;
    evenement.preventDefault();
    if (evenement.dataTransfer) {
      evenement.dataTransfer.dropEffect = this.accepte()(charge) ? 'move' : 'none';
    }
  }

  @HostListener('dragleave')
  protected surSortie(): void {
    this.profondeur = Math.max(0, this.profondeur - 1);
    if (this.profondeur === 0) this.reinitialiser();
  }

  @HostListener('drop', ['$event'])
  protected surDepot(evenement: DragEvent): void {
    evenement.preventDefault();
    this.profondeur = 0;
    this.reinitialiser();

    const charge = this.store.charge();
    this.store.terminer();
    if (charge && this.accepte()(charge)) {
      this.depot.emit(charge);
    }
  }

  private reinitialiser(): void {
    this.survole = false;
    this.refuse = false;
  }
}
