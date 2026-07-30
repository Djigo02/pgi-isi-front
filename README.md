# planification-web — Angular 21

Interface de la plateforme de planification pédagogique. Front du microservice
[`ms_plannification_enseignement`](https://github.com/Djigo02/ms_plannification_enseignement).

## Lancer

```bash
cd planification-web
npm install
npm start          # http://localhost:4200
```

En développement, `environment.useMock = true` : un backend simulé en mémoire répond
à la place de Spring, l'application tourne donc seule. Pour brancher le vrai service :

```ts
// src/environments/environment.development.ts
useMock: false                       // le back doit tourner sur http://localhost:8080
```

## Comptes de démonstration

| Espace | Identifiants | Après connexion |
|---|---|---|
| Chef de département | `chef` / `chef` | workflow complet |
| Étudiant | `etudiant` / `etudiant` | emploi du temps de sa classe, lecture seule |
| Enseignant | `j.mballa@univ.local` / `1234` | ses séances, lecture seule |

Le workflow implémenté est celui du chef de département. Les deux autres espaces
réutilisent la même grille avec `lectureSeule` : ni glisser-déposer, ni boutons.

## Structure

```
src/app/
├── urls/           api.urls.ts · auth.urls.ts · app.routes.urls.ts
├── models/         enums.ts · planification.model.ts · auth.model.ts
├── services/       auth · referentiel · pedagogie · planification ·
│                   planning-store · drag-drop · notification · mock-backend
├── guards/         authGuard, roleGuard
├── interceptors/   erreur · mock-backend
├── directives/     draggable · drop-target
├── utils/          creneau.util · conflit.util · salle.util
└── components/     login-etudiant · login-enseignant · login-chef · shell ·
                    planning · panneau-ec · grille-seances · modale-seance ·
                    selecteur-salle · propositions-ia · enseignants ·
                    departement · salles · consultation · notifications
```

**Aucune URL n'est écrite en dur ailleurs que dans `src/app/urls/`.** Les trois
fichiers couvrent l'API du microservice, l'authentification et les routes internes.
Si le back change un chemin, un seul fichier bouge.

## Choix techniques

**Zoneless.** `provideZonelessChangeDetection()` : pas de `zone.js`, la détection de
changement repose entièrement sur les signals. Tous les composants sont en `OnPush`.

**Signals partout.** `PlanningStore` est l'unique source de vérité de l'atelier :
`signal` pour l'état brut, `computed` pour tout le reste (EC avec volume restant,
séances de la classe, contexte de conflit). Les composants ne stockent rien.
`linkedSignal` sert dans la modale pour réinitialiser enseignant, durée et salle dès
que l'EC ou le créneau change.

**API moderne.** `input()` / `input.required()`, `output()`, `model()` pour la
liaison bidirectionnelle du sélecteur de salle, `inject()` plutôt que le constructeur,
nouveau control flow `@if` / `@for` / `@switch` / `@empty`, routes en `loadComponent`.

**Glisser-déposer.** Deux directives (`appDraggable`, `appDropTarget`) au-dessus de
l'API HTML5, avec un `DragDropStore` à signal. Le navigateur interdit de lire
`dataTransfer` pendant `dragover` : sans ce signal partagé, impossible de colorer la
case survolée avant le lâcher. Un compteur de profondeur évite le clignotement quand
le curseur passe au-dessus d'un enfant de la zone.

## Ce qui a été amélioré : le choix de la salle

C'était le point faible de la maquette — une liste déroulante où ni le campus ni la
raison d'une indisponibilité n'apparaissaient. Le composant `selecteur-salle` affiche
maintenant, pour la plage visée :

- les salles **groupées par campus** (Siège, Annexe, Annexe Siège), avec un compteur
  de salles libres par campus ;
- pour chaque salle : code, **campus**, étage, capacité et type ;
- un statut explicite — `LIBRE`, `OCCUPÉE` (avec l'horaire de ce qui l'occupe) ou
  `TROP PETITE` (avec capacité vs effectif). Les deux derniers ne sont pas cliquables ;
- des filtres par campus et une bascule « seulement les salles libres » ;
- un résumé de la sélection sous la liste.

La même évaluation alimente la page **Salles et campus**, qui montre l'occupation des
24 salles pour un jour et un créneau choisis.

## Menus

| Menu | Contenu |
|---|---|
| Planification | grille 7 jours × 13 créneaux, glisser-déposer, durée réglable, proposition IA, publication |
| Enseignants | ajout d'un enseignant, habilitations, disponibilités par jour et créneau |
| Mon département | avancement de la classe, charge par enseignant, EC et **enseignants habilités par EC** |
| Salles et campus | référentiel des 24 salles avec occupation en direct |

## Modèle temporel

7 jours, 13 créneaux d'une heure de 08:00 à 21:00. Une séance démarre sur un créneau
et en occupe `nbCreneaux` consécutifs, soit l'intervalle semi-ouvert
`[ordreDebut, ordreFin[`. Le conflit se réduit alors à `a.debut < b.fin && b.debut < a.fin`
— une ligne, la même côté Java.

Un EC peut être assuré par plusieurs enseignants habilités ; **une séance en désigne
exactement un**. La modale ne propose que les habilités et signale ceux qui sont
indisponibles ou en créneau préféré sur la plage.

## Vérification

Les règles de `utils/conflit.util.ts` reproduisent `ConflitService` du back pour le
retour visuel immédiat, mais **le back reste l'autorité** : toute écriture repasse par
lui, et PostgreSQL a ses contraintes d'exclusion.

Les huit contraintes ont été testées hors navigateur, dont les deux cas qui comptent :

- séance 09:00–11:00 refusée face à une séance 08:00–10:00 du même enseignant
  (`ENSEIGNANT_OCCUPE`) ;
- même plage avec un enseignant différent : acceptée.

Plus `SALLE_OCCUPEE`, `CAPACITE_INSUFFISANTE`, `ENSEIGNANT_INDISPONIBLE` (y compris
une indisponibilité partielle couverte par la durée), `DEBORDE_GRILLE` et
`ENSEIGNANT_NON_HABILITE`.

## Correspondance avec le back

| Service Angular | Endpoints |
|---|---|
| `ReferentielService` | `/campus`, `/salles`, `/salles/disponibles`, `/creneaux` |
| `PedagogieService` | `/periodes`, `/classes`, `/elements-constitutifs`, `/enseignants`, `/affectations-enseignants` |
| `PlanificationService` | `/seances`, `/seances/verifier`, `/seances/{id}/deplacer`, `/seances/{id}/duree`, `/seances/publier`, `/disponibilites`, `/emplois-du-temps/*`, `/demandes-generation` |

Les modèles TypeScript sont alignés champ par champ sur les records du back
(`SeanceDto`, `SalleDto`, `CreneauDto`, `ViolationDto`…).

`/api/auth` n'existe pas encore côté back : `AuthService` vérifie les identifiants
localement tant que `useMock` est actif. Les chemins sont déjà posés dans
`urls/auth.urls.ts`, seul `AuthService` changera.
