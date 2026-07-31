# Planification (portail chef de departement) — notes pour Claude

Portail Angular de planification des enseignements pour un chef de
departement : classes, elements constitutifs (EC), enseignants,
habilitations, disponibilites, et grille de planification (glisser-deposer).

## Backend — a toujours garder en tete

Ce front consomme **`ms_plannification_enseignement`** :
`https://github.com/Djigo02/ms_plannification_enseignement.git`

- Tourne sur `http://localhost:8080`, base `/api/planification` (voir
  `src/app/urls/api.urls.ts`, seul endroit ou les chemins d'API existent).
- `src/environments/environment.development.ts` : `useMock: false` —
  le front tape directement le vrai backend en dev, plus de simulation
  en memoire (`mock-backend.interceptor.ts`/`mock-backend.service.ts`
  existent encore mais ne sont plus actifs tant que `useMock` est `false`).
- **Avant de supposer la forme d'une requete/reponse, verifier le contrat
  reel du backend** via son OpenAPI : `curl -s http://localhost:8080/v3/api-docs`
  (ou lire le code du repo ci-dessus). Le DTO front (`planification.model.ts`)
  peut etre en retard sur ce que le backend accepte reellement — c'est deja
  arrive (voir historique ci-dessous).
- Si le backend n'est pas lance, `ng serve` demarre quand meme mais tous
  les appels HTTP echoueront (404/erreur reseau), pas seulement 400.

## Regles de rechargement de PlanningStore

`src/app/services/planning-store.service.ts` est l'etat central en
signals, partage par toutes les pages. Regle importante a ne jamais
regresser :

- `changerClasse(classeId)` ne recharge **que** les EC (`rechargerEcs()`).
  Les EC dependent de la classe, rien d'autre.
- `changerPeriode(periodeId)` ne recharge **que** disponibilites + seances
  (`rechargerDisponibilites()` + `rafraichirSeances()`). Ces deux-la
  dependent de la periode, pas de la classe.
- `rechargerDisponibilites()` : le backend **exige `enseignantId` ET
  `periodeId`** sur `GET /api/planification/disponibilites` (confirme
  via l'OpenAPI — les deux sont `required: true`, aucun des deux n'est
  optionnel malgre ce que suggererait un DTO naïf). Comme il n'y a pas
  de route "toutes les disponibilites d'une periode", on boucle un appel
  par enseignant charge (`store.enseignants()`) et on fusionne les
  resultats. Si un jour le backend expose une route bulk, simplifier ici.
- Il n'existe plus de `rechargerContexte()` fourre-tout : si un besoin
  futur necessite tout recharger d'un coup, composer les methodes
  existantes (`rechargerEcs`, `rechargerDisponibilites`, `rafraichirSeances`,
  `rechargerAffectations`) plutot que d'en recreer un.

## Structure des pages Pedagogie (3 pages, volontairement separees)

| Page | Route | Role |
|---|---|---|
| Departement | `/app/departement` | Classes du departement uniquement (KPIs + CRUD classe). |
| Elements constitutifs | `/app/elements-constitutifs` | CRUD des EC d'une classe, + tag "periode concernee". |
| Enseignants | `/app/enseignants` | Liste/ajout enseignant + **habilitations** (EC assignes) + disponibilites (section historique, non touchee). |

Notes :
- Les habilitations (`AffectationEnseignant`, EC <-> enseignant) ont ete
  **deplacees** de Departement vers Enseignants. Sur Enseignants, le
  selecteur de classe utilise pour choisir l'EC a habiliter est **local
  au composant** (`classeChoisie`), independant de `store.classeId()`
  global (pour ne pas perturber Planification/EC qui partagent ce
  signal).
- `ElementConstitutif` **n'a aucun champ `periodeId` cote backend**
  (`ElementConstitutifRequest` = `code, intitule, volumeHebdomadaire,
  classeId, actif`, confirme via OpenAPI). La colonne "Periode" affichee
  sur la page Elements constitutifs est un **marquage cosmetique
  100% front**, stocke dans `localStorage` (cle
  `planification.ec-periode`, map `ecId -> periodeId`). Rien n'est
  envoye au backend pour ca. Si le backend ajoute un jour ce champ,
  remplacer ce marquage local par le vrai champ.
- `src/app/services/departement.service.ts` existe (CRUD sur
  l'entite `Departement` elle-meme : code/nom du departement) mais
  **n'est branche sur aucune route/composant pour l'instant**. A
  utiliser si on ajoute une page de gestion du departement en tant
  que tel (distinct de la gestion de ses classes).

## Conventions front a respecter

- **Formulaires : toujours `(click)="methode()"` sur le bouton de
  soumission, jamais `(ngSubmit)` sur le `<form>`.** Avoir les deux en
  meme temps double l'appel (bug reel rencontre sur les boutons
  "Ajouter"). Exception assumee : les 3 pages de login
  (`login-chef`, `login-etudiant`, `login-enseignant`) gardent
  `(ngSubmit)` pour que la touche Entree soumette le formulaire —
  ne pas les convertir sans aussi gerer l'Entree autrement.
- **Checkboxes : toujours lire l'etat reel de l'evenement**, jamais
  togger un signal a l'aveugle. Pattern de reference :
  `(change)="methode($any($event.target).checked)"` (voir
  `selecteur-salle.html` et `elements-constitutifs.ts` ->
  `definirPeriode`). Un toggle aveugle peut se desynchroniser du DOM
  et donner l'impression que "la checkbox ne marche pas".

## Commandes utiles

- Type-check rapide (utilise tout au long de cette session) :
  `npx tsc --noEmit -p tsconfig.app.json`
- Dev server : `ng serve` (ou `npx ng serve --port <port>` si 4200 est
  pris).
- Pas d'outil de pilotage navigateur disponible dans cet environnement
  (`chromium-cli`/Playwright non installes) : les verifications
  visuelles dans le navigateur restent a faire manuellement par
  l'utilisateur.

## Historique recent (pour contexte, pas a re-derouler)

1. Bug initial : `GET /api/planification/disponibilites` renvoyait
   400 en boucle. Cause : le backend exige `enseignantId` + `periodeId`
   tous les deux, le front n'envoyait que `periodeId`. Fix : appel par
   enseignant + fusion (voir regles de rechargement ci-dessus).
2. Constat : changer/ajouter une classe rechargeait inutilement les
   disponibilites de tous les enseignants. Fix : `changerClasse` et
   `changerPeriode` ne rechargent plus que ce qui depend reellement
   d'eux (voir section dediee).
3. Scission de l'ancienne page "Departement" (qui faisait classes + EC
   + habilitations) en 3 pages (voir tableau ci-dessus), avec routes/menu
   mis a jour (`app.routes.urls.ts`, `app.routes.ts`, `shell.ts`/`shell.html`,
   nouvelle icone `"livre"`).
4. Ajout d'un marquage "periode" par EC (front-only, cf. plus haut) :
   d'abord tente en checkboxes multi-periodes, puis simplifie en un
   select mono-periode a la demande de l'utilisateur.
5. Conversion de tous les formulaires touches vers `(click)` (hors
   pages de login) + fix du binding checkbox (cf. conventions
   ci-dessus).
