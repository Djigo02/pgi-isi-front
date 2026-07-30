import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { APP_ROUTES } from '../../urls/app.routes.urls';

@Component({
  selector: 'app-login-enseignant',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login-enseignant.html'
})
export class LoginEnseignant {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly liens = APP_ROUTES;
  protected readonly enCours = signal(false);
  protected readonly erreur = signal<string | null>(null);

  /** L'enseignant s'identifie par son email et un code a usage pedagogique. */
  protected readonly formulaire = this.fb.nonNullable.group({
    email: ['j.mballa@univ.local', [Validators.required, Validators.email]],
    code: ['1234', [Validators.required, Validators.minLength(4)]]
  });

  protected async soumettre(): Promise<void> {
    if (this.formulaire.invalid || this.enCours()) return;
    this.enCours.set(true);
    this.erreur.set(null);
    try {
      await this.auth.connecterEnseignant(this.formulaire.getRawValue());
      await this.router.navigateByUrl(APP_ROUTES.consultation);
    } catch (erreur) {
      this.erreur.set(erreur instanceof Error ? erreur.message : 'Connexion impossible.');
    } finally {
      this.enCours.set(false);
    }
  }
}
