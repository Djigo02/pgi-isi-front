import { Injectable, signal } from '@angular/core';

export type VarianteNotification = 'info' | 'succes' | 'erreur';

export interface Notification {
  id: number;
  message: string;
  variante: VarianteNotification;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private compteur = 0;
  private readonly _notifications = signal<Notification[]>([]);

  readonly notifications = this._notifications.asReadonly();

  info(message: string): void {
    this.pousser(message, 'info', 3800);
  }

  succes(message: string): void {
    this.pousser(message, 'succes', 3800);
  }

  erreur(message: string): void {
    this.pousser(message, 'erreur', 6000);
  }

  fermer(id: number): void {
    this._notifications.update((liste) => liste.filter((n) => n.id !== id));
  }

  private pousser(message: string, variante: VarianteNotification, duree: number): void {
    const id = ++this.compteur;
    this._notifications.update((liste) => [...liste, { id, message, variante }]);
    setTimeout(() => this.fermer(id), duree);
  }
}
