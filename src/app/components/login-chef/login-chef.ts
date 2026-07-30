import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { APP_ROUTES } from '../../urls/app.routes.urls';

@Component({
  selector: 'app-login-chef',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login-chef.html'
})
export class LoginChef {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly liens = APP_ROUTES;
  protected readonly enCours = signal(false);
  protected readonly erreur = signal<string | null>(null);

  protected readonly formulaire = this.fb.nonNullable.group({
    login: ['chef', [Validators.required]],
    motDePasse: ['chef', [Validators.required]]
  });

  protected async soumettre(): Promise<void> {
    if (this.formulaire.invalid || this.enCours()) return;
    this.enCours.set(true);
    this.erreur.set(null);
    try {
      await this.auth.connecterChefDepartement(this.formulaire.getRawValue());
      await this.router.navigateByUrl(APP_ROUTES.planification);
    } catch (erreur) {
      this.erreur.set(erreur instanceof Error ? erreur.message : 'Connexion impossible.');
    } finally {
      this.enCours.set(false);
    }
  }
}
