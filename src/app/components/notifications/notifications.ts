import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notifications',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toasts" aria-live="polite">
      @for (notification of service.notifications(); track notification.id) {
        <div class="toast toast--{{ notification.variante }}" (click)="service.fermer(notification.id)">
          {{ notification.message }}
        </div>
      }
    </div>
  `,
  styles: `
    .toasts {
      position: fixed;
      right: 20px;
      bottom: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 100;
    }
    .toast {
      background: var(--couleur-texte);
      color: #fff;
      padding: 10px 14px;
      border-radius: var(--rayon);
      font-size: 13px;
      max-width: 360px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgb(31 41 51 / 18%);
    }
    .toast--erreur { background: var(--couleur-danger); }
    .toast--succes { background: var(--couleur-succes); }
  `
})
export class Notifications {
  protected readonly service = inject(NotificationService);
}
