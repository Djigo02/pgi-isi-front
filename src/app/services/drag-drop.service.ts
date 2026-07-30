import { Injectable, signal } from "@angular/core";

/** Ce qui est en train d'etre glisse : soit un EC du panneau, soit une seance de la grille. */
export type ChargeGlissee =
  | { type: "EC"; ecId: string }
  | { type: "SEANCE"; seanceId: string };

/**
 * Etat partage du glisser-deposer.
 *
 * Le navigateur interdit de lire dataTransfer pendant dragover : sans ce signal,
 * impossible de savoir ce qui survole une case et donc de colorer la cible.
 */
@Injectable({ providedIn: "root" })
export class DragDropStore {
  private readonly _charge = signal<ChargeGlissee | null>(null);

  readonly charge = this._charge.asReadonly();

  demarrer(charge: ChargeGlissee): void {
    this._charge.set(charge);
  }

  terminer(): void {
    this._charge.set(null);
  }
}
