import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from "@angular/router";
import { AuthService } from "../../services/auth.service";
import { APP_ROUTES } from "../../urls/app.routes.urls";
import { RoleUtilisateur } from "../../models/enums";

type Icone = "calendrier" | "utilisateurs" | "batiment" | "porte" | "oeil" | "livre";

interface EntreeMenu {
  libelle: string;
  lien: string;
  description: string;
  roles: RoleUtilisateur[];
  groupe: string;
  icone: Icone;
}

interface GroupeMenu {
  nom: string;
  entrees: EntreeMenu[];
}

@Component({
  selector: "app-shell",
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./shell.html",
  styleUrls: ["./shell.css"],
})
export class Shell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly utilisateur = this.auth.utilisateur;

  private readonly menu: EntreeMenu[] = [
    {
      libelle: "Planification",
      lien: APP_ROUTES.planification,
      description: "Grille hebdomadaire et glisser-deposer",
      roles: ["CHEF_DEPARTEMENT"],
      groupe: "Principal",
      icone: "calendrier",
    },
    {
      libelle: "Mon departement",
      lien: APP_ROUTES.departement,
      description: "Classes du departement",
      roles: ["CHEF_DEPARTEMENT"],
      groupe: "Pedagogie",
      icone: "batiment",
    },
    {
      libelle: "Elements constitutifs",
      lien: APP_ROUTES.elementsConstitutifs,
      description: "EC d'une classe, par periode",
      roles: ["CHEF_DEPARTEMENT"],
      groupe: "Pedagogie",
      icone: "livre",
    },
    {
      libelle: "Enseignants",
      lien: APP_ROUTES.enseignants,
      description: "Ajouter un enseignant, ses habilitations et disponibilites",
      roles: ["CHEF_DEPARTEMENT"],
      groupe: "Pedagogie",
      icone: "utilisateurs",
    },
    {
      libelle: "Salles et campus",
      lien: APP_ROUTES.salles,
      description: "Referentiel des 24 salles reparties sur 3 campus",
      roles: ["CHEF_DEPARTEMENT"],
      groupe: "Referentiel",
      icone: "porte",
    },
    {
      libelle: "Mon emploi du temps",
      lien: APP_ROUTES.consultation,
      description: "Consultation en lecture seule",
      roles: ["ETUDIANT", "ENSEIGNANT"],
      groupe: "Consultation",
      icone: "oeil",
    },
  ];

  /** Le menu se reduit tout seul au role : pas de lien mort a l'ecran. */
  protected readonly entreesVisibles = computed(() => {
    const role = this.auth.role();
    return role
      ? this.menu.filter((entree) => entree.roles.includes(role))
      : [];
  });

  /** Regroupe les entrees visibles par categorie, dans leur ordre d'apparition. */
  protected readonly groupesVisibles = computed<GroupeMenu[]>(() => {
    const groupes: GroupeMenu[] = [];
    for (const entree of this.entreesVisibles()) {
      let groupe = groupes.find((g) => g.nom === entree.groupe);
      if (!groupe) {
        groupe = { nom: entree.groupe, entrees: [] };
        groupes.push(groupe);
      }
      groupe.entrees.push(entree);
    }
    return groupes;
  });

  protected readonly libelleRole = computed(() => {
    switch (this.auth.role()) {
      case "CHEF_DEPARTEMENT":
        return "Chef de departement";
      case "ENSEIGNANT":
        return "Enseignant";
      case "ETUDIANT":
        return "Etudiant";
      default:
        return "";
    }
  });

  protected readonly initiales = computed(() => {
    const nom = this.utilisateur()?.nom ?? "";
    const parties = nom.split(/\s+/).filter(Boolean);
    const lettres = parties.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
    return lettres.join("") || "?";
  });

  protected readonly menuOuvert = signal(false);
  protected readonly pleinEcran = signal(false);

  constructor() {
    document.addEventListener("fullscreenchange", () => {
      this.pleinEcran.set(document.fullscreenElement !== null);
    });
  }

  protected toggleMenu(): void {
    this.menuOuvert.update((ouvert) => !ouvert);
  }

  protected fermerMenu(): void {
    this.menuOuvert.set(false);
  }

  protected async togglePleinEcran(): Promise<void> {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  }

  protected async deconnecter(): Promise<void> {
    this.auth.deconnecter();
    await this.router.navigateByUrl(APP_ROUTES.loginChef);
  }
}
