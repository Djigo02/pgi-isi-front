import { Injectable, computed, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { environment } from "../../environments/environment";
import { AUTH_URLS } from "../urls/auth.urls";
import { RoleUtilisateur } from "../models/enums";
import {
  IdentifiantsChef,
  IdentifiantsEnseignant,
  IdentifiantsEtudiant,
  Utilisateur,
} from "../models/auth.model";

const CLE_SESSION = "planification.utilisateur";

/**
 * Authentification.
 *
 * Le microservice ne publie pas encore /api/auth : tant que useMock est actif,
 * les identifiants sont verifies localement contre le jeu de comptes ci-dessous.
 * Basculer sur le back consiste a supprimer les branches `if (environment.useMock)`.
 */
@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly _utilisateur = signal<Utilisateur | null>(this.restaurer());

  readonly utilisateur = this._utilisateur.asReadonly();
  readonly connecte = computed(() => this._utilisateur() !== null);
  readonly role = computed<RoleUtilisateur | null>(
    () => this._utilisateur()?.role ?? null,
  );
  readonly estChefDepartement = computed(
    () => this.role() === "CHEF_DEPARTEMENT",
  );

  async connecterEtudiant(
    identifiants: IdentifiantsEtudiant,
  ): Promise<Utilisateur> {
    if (environment.useMock) {
      return this.verifierLocalement(
        identifiants.login === "etudiant" &&
          identifiants.motDePasse === "etudiant",
        {
          id: "usr-etu-1",
          nom: "NKOLO Ariane",
          role: "ETUDIANT",
          classeId: "cls-gl2",
        },
      );
    }
    return this.appeler(AUTH_URLS.loginEtudiant, identifiants);
  }

  async connecterEnseignant(
    identifiants: IdentifiantsEnseignant,
  ): Promise<Utilisateur> {
    if (environment.useMock) {
      return this.verifierLocalement(
        identifiants.email === "j.mballa@univ.local" &&
          identifiants.code === "1234",
        {
          id: "usr-ens-1",
          nom: "MBALLA Jean",
          role: "ENSEIGNANT",
          enseignantId: "ens-001",
        },
      );
    }
    return this.appeler(AUTH_URLS.loginEnseignant, identifiants);
  }

  async connecterChefDepartement(
    identifiants: IdentifiantsChef,
  ): Promise<Utilisateur> {
    if (environment.useMock) {
      return this.verifierLocalement(
        identifiants.login === "chef" && identifiants.motDePasse === "chef",
        {
          id: "usr-chef-1",
          nom: "Dr. NGUEMA Paul",
          role: "CHEF_DEPARTEMENT",
          departementId: "27d43bda-1782-46fd-9751-de452dd34346",
          departementNom: "Reseaux",
        },
      );
    }
    return this.appeler(AUTH_URLS.loginChefDepartement, identifiants);
  }

  deconnecter(): void {
    this._utilisateur.set(null);
    localStorage.removeItem(CLE_SESSION);
  }

  private async appeler(url: string, corps: unknown): Promise<Utilisateur> {
    const utilisateur = await firstValueFrom(
      this.http.post<Utilisateur>(url, corps),
    );
    this.ouvrirSession(utilisateur);
    return utilisateur;
  }

  private verifierLocalement(
    valide: boolean,
    utilisateur: Utilisateur,
  ): Promise<Utilisateur> {
    if (!valide) {
      return Promise.reject(new Error("Identifiants incorrects."));
    }
    this.ouvrirSession(utilisateur);
    return Promise.resolve(utilisateur);
  }

  private ouvrirSession(utilisateur: Utilisateur): void {
    this._utilisateur.set(utilisateur);
    localStorage.setItem(CLE_SESSION, JSON.stringify(utilisateur));
  }

  private restaurer(): Utilisateur | null {
    const brut = localStorage.getItem(CLE_SESSION);
    if (!brut) return null;
    try {
      return JSON.parse(brut) as Utilisateur;
    } catch {
      localStorage.removeItem(CLE_SESSION);
      return null;
    }
  }
}
