import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Notifications } from './components/notifications/notifications';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Notifications],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <router-outlet />
    <app-notifications />
  `
})
export class App {}
