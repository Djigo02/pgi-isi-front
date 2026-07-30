import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { API_ROOT } from '../urls/api.urls';
import { MockBackendService } from '../services/mock-backend.service';
import { contientBloquant } from '../utils/conflit.util';
import { Jour } from '../models/enums';
import {
  Classe, ClasseRequest, DemandeGeneration, DeplacementSeanceRequest, Disponibilite,
  DisponibiliteRequest, DureeSeanceRequest, ElementConstitutif, ElementConstitutifRequest,
  Enseignant, EnseignantRequest, PublicationRequest, Salle,
  SalleRequest, Seance, SeancePatchRequest, SeanceRequest
} from '../models/planification.model';

/**
 * Backend simule. Actif uniquement si environment.useMock vaut true.
 *
 * Il respecte le contrat de ms_plannification_enseignement : memes chemins, memes
 * charges utiles, meme 409 avec la liste des violations. Basculer sur le vrai
 * service se fait en passant useMock a false, sans toucher au reste du code.
 */
export const mockBackendInterceptor: HttpInterceptorFn = (requete, suivant) => {
  if (!environment.useMock || !requete.url.startsWith(API_ROOT)) {
    return suivant(requete);
  }

  const db = inject(MockBackendService);
  const chemin = requete.url.slice(API_ROOT.length);
  const param = (nom: string) => requete.params.get(nom);

  const ok = <T>(corps: T): Observable<HttpResponse<T>> =>
    of(new HttpResponse({ status: 200, body: corps })).pipe(delay(120));

  const conflit = (violations: unknown[]) =>
    throwError(
      () =>
        new HttpErrorResponse({
          status: 409,
          error: {
            status: 409,
            code: 'CONFLIT_PLANIFICATION',
            message: 'La seance ne peut pas etre programmee sur cette plage.',
            violations
          }
        })
    ).pipe(delay(120));

  /* ------------------------------------------------------------- Referentiel */

  if (chemin === '/periodes') return ok(db.periodes);
  if (chemin === '/campus') return ok(db.campus);
  if (chemin === '/creneaux') return ok(db.creneaux);
  if (chemin === '/classes' && requete.method === 'GET') return ok(db.classes);

  if (chemin === '/classes' && requete.method === 'POST') {
    const corps = requete.body as ClasseRequest;
    const classe: Classe = { id: db.nouvelId('cls'), ...corps };
    db.classes = [...db.classes, classe];
    return ok(classe);
  }

  if (chemin.startsWith('/classes/') && requete.method === 'PUT') {
    const id = chemin.split('/')[2];
    const corps = requete.body as ClasseRequest;
    db.classes = db.classes.map((c) => (c.id === id ? { ...c, ...corps } : c));
    const classe = db.classes.find((c) => c.id === id)!;
    db.ecs = db.ecs.map((e) => (e.classeId === id ? { ...e, classeCode: classe.code } : e));
    return ok(classe);
  }

  if (chemin.startsWith('/classes/') && requete.method === 'DELETE') {
    const id = chemin.split('/')[2];
    db.classes = db.classes.filter((c) => c.id !== id);
    db.ecs = db.ecs.filter((e) => e.classeId !== id);
    return ok(null);
  }

  if (chemin === '/salles' && requete.method === 'GET') {
    let salles: Salle[] = db.salles;
    const campusCode = param('campusCode');
    const capaciteMin = param('capaciteMin');
    const type = param('type');
    if (campusCode) salles = salles.filter((s) => s.campusCode === campusCode);
    if (capaciteMin) salles = salles.filter((s) => s.capacite >= Number(capaciteMin));
    if (type) salles = salles.filter((s) => s.type === type);
    return ok(salles);
  }

  if (chemin === '/salles/disponibles') {
    const creneau = db.creneaux.find((c) => c.id === param('creneauId'));
    const nb = Number(param('nbCreneaux') ?? 1);
    const jour = param('jour') as Jour;
    const capaciteMin = Number(param('capaciteMin') ?? 0);
    if (!creneau) return ok<Salle[]>([]);

    const debut = creneau.ordre;
    const fin = debut + nb;
    const occupees = new Set(
      db.seances
        .filter(
          (s) =>
            s.periodeId === param('periodeId') && s.jour === jour &&
            s.statut !== 'ANNULEE' && s.ordreDebut < fin && debut < s.ordreFin
        )
        .map((s) => s.salle.id)
    );
    return ok(db.salles.filter((s) => s.actif && s.capacite >= capaciteMin && !occupees.has(s.id)));
  }

  if (chemin === '/salles' && requete.method === 'POST') {
    const corps = requete.body as SalleRequest;
    const campus = db.campus.find((c) => c.id === corps.campusId)!;
    const salle: Salle = {
      id: db.nouvelId('sal'), code: corps.code, campusId: campus.id,
      campusCode: campus.code, campusNom: campus.nom, etage: corps.etage,
      capacite: corps.capacite, type: corps.type, actif: corps.actif
    };
    db.salles = [...db.salles, salle];
    return ok(salle);
  }

  /* --------------------------------------------------------------- Pedagogie */

  if (chemin === '/elements-constitutifs' && requete.method === 'GET') {
    const classeId = param('classeId');
    return ok(classeId ? db.ecs.filter((e) => e.classeId === classeId) : db.ecs);
  }

  if (chemin === '/elements-constitutifs' && requete.method === 'POST') {
    const corps = requete.body as ElementConstitutifRequest;
    const classe = db.classes.find((c) => c.id === corps.classeId)!;
    const ec: ElementConstitutif = { id: db.nouvelId('ec'), ...corps, classeCode: classe.code };
    db.ecs = [...db.ecs, ec];
    return ok(ec);
  }

  if (chemin.startsWith('/elements-constitutifs/') && requete.method === 'PUT') {
    const id = chemin.split('/')[2];
    const corps = requete.body as ElementConstitutifRequest;
    const classe = db.classes.find((c) => c.id === corps.classeId)!;
    db.ecs = db.ecs.map((e) => (e.id === id ? { ...e, ...corps, classeCode: classe.code } : e));
    return ok(db.ecs.find((e) => e.id === id)!);
  }

  if (chemin.startsWith('/elements-constitutifs/') && requete.method === 'DELETE') {
    const id = chemin.split('/')[2];
    db.ecs = db.ecs.filter((e) => e.id !== id);
    db.affectations = db.affectations.filter((a) => a.ecId !== id);
    return ok(null);
  }

  if (chemin === '/enseignants' && requete.method === 'GET') return ok(db.enseignants);

  if (chemin === '/enseignants' && requete.method === 'POST') {
    const corps = requete.body as EnseignantRequest;
    const enseignant: Enseignant = { id: db.nouvelId('ens'), ...corps };
    db.enseignants = [...db.enseignants, enseignant];
    return ok(enseignant);
  }

  if (chemin.startsWith('/enseignants/') && requete.method === 'PUT') {
    const id = chemin.split('/')[2];
    const corps = requete.body as EnseignantRequest;
    db.enseignants = db.enseignants.map((e) => (e.id === id ? { ...e, ...corps } : e));
    return ok(db.enseignants.find((e) => e.id === id)!);
  }

  if (chemin.startsWith('/enseignants/') && requete.method === 'DELETE') {
    const id = chemin.split('/')[2];
    db.enseignants = db.enseignants.filter((e) => e.id !== id);
    db.affectations = db.affectations.filter((a) => a.enseignantId !== id);
    return ok(null);
  }

  if (chemin === '/affectations-enseignants' && requete.method === 'GET') {
    const ecId = param('ecId');
    return ok(ecId ? db.affectations.filter((a) => a.ecId === ecId) : db.affectations);
  }

  if (chemin === '/affectations-enseignants' && requete.method === 'POST') {
    const corps = requete.body as { enseignantId: string; ecId: string };
    const affectation = {
      id: db.nouvelId('af'),
      enseignantId: corps.enseignantId,
      ecId: corps.ecId,
      enseignantNom: db.enseignants.find((e) => e.id === corps.enseignantId)?.nom ?? '',
      ecCode: db.ecs.find((e) => e.id === corps.ecId)?.code ?? ''
    };
    db.affectations = [...db.affectations, affectation];
    return ok(affectation);
  }

  if (chemin.startsWith('/affectations-enseignants/') && requete.method === 'DELETE') {
    const id = chemin.split('/')[2];
    db.affectations = db.affectations.filter((a) => a.id !== id);
    return ok(null);
  }

  /* ----------------------------------------------------------- Disponibilites */

  if (chemin === '/disponibilites' && requete.method === 'GET') {
    let liste: Disponibilite[] = db.disponibilites;
    if (param('periodeId')) liste = liste.filter((d) => d.periodeId === param('periodeId'));
    if (param('enseignantId')) liste = liste.filter((d) => d.enseignantId === param('enseignantId'));
    return ok(liste);
  }

  if (chemin === '/disponibilites' && requete.method === 'POST') {
    const corps = requete.body as DisponibiliteRequest;
    const disponibilite: Disponibilite = {
      id: db.nouvelId('dsp'),
      enseignantId: corps.enseignantId,
      periodeId: corps.periodeId,
      jour: corps.jour,
      creneau: corps.creneauId ? db.creneaux.find((c) => c.id === corps.creneauId) ?? null : null,
      type: corps.type
    };
    db.disponibilites = [...db.disponibilites, disponibilite];
    return ok(disponibilite);
  }

  if (chemin.startsWith('/disponibilites/') && requete.method === 'DELETE') {
    const id = chemin.split('/')[2];
    db.disponibilites = db.disponibilites.filter((d) => d.id !== id);
    return ok(null);
  }

  /* ------------------------------------------------------------------ Seances */

  if (chemin === '/seances' && requete.method === 'GET') {
    let liste: Seance[] = db.seances;
    for (const cle of ['periodeId', 'classeId', 'enseignantId'] as const) {
      const valeur = param(cle);
      if (valeur) liste = liste.filter((s) => s[cle] === valeur);
    }
    if (param('salleId')) liste = liste.filter((s) => s.salle.id === param('salleId'));
    if (param('jour')) liste = liste.filter((s) => s.jour === param('jour'));
    return ok(liste);
  }

  if (chemin === '/seances/verifier') {
    const violations = db.verifier(requete.body as SeanceRequest);
    return ok({
      violations: violations.filter((v) => v.severite === 'DURE'),
      avertissements: violations.filter((v) => v.severite === 'SOUPLE')
    });
  }

  if (chemin === '/seances' && requete.method === 'POST') {
    const corps = requete.body as SeanceRequest;
    const violations = db.verifier(corps);
    if (contientBloquant(violations)) return conflit(violations.filter((v) => v.severite === 'DURE'));

    const seance = db.construireSeance(db.nouvelId('sea'), corps, 'BROUILLON');
    seance.avertissements = violations.filter((v) => v.severite === 'SOUPLE');
    db.seances = [...db.seances, seance];
    return ok(seance);
  }

  if (chemin === '/seances/publier') {
    const corps = requete.body as PublicationRequest;
    const publiees: Seance[] = [];
    db.seances = db.seances.map((s) => {
      if (s.classeId === corps.classeId && s.periodeId === corps.periodeId && s.statut === 'BROUILLON') {
        const majour = { ...s, statut: 'PUBLIEE' as const };
        publiees.push(majour);
        return majour;
      }
      return s;
    });
    return ok(publiees);
  }

  if (chemin.startsWith('/seances/') && chemin.endsWith('/deplacer')) {
    const id = chemin.split('/')[2];
    const corps = requete.body as DeplacementSeanceRequest;
    return appliquerModification(id, (s) => ({ ...s, jour: corps.jour, creneauId: corps.creneauId }));
  }

  if (chemin.startsWith('/seances/') && chemin.endsWith('/duree')) {
    const id = chemin.split('/')[2];
    const corps = requete.body as DureeSeanceRequest;
    return appliquerModification(id, (s) => ({ ...s, nbCreneaux: corps.nbCreneaux }));
  }

  if (chemin.startsWith('/seances/') && requete.method === 'PATCH') {
    const id = chemin.split('/')[2];
    const corps = requete.body as SeancePatchRequest;
    return appliquerModification(id, (s) => ({
      ...s,
      enseignantId: corps.enseignantId ?? s.enseignantId,
      salleId: corps.salleId ?? s.salleId,
      type: corps.type ?? s.type
    }));
  }

  if (chemin.startsWith('/seances/') && requete.method === 'DELETE') {
    const id = chemin.split('/')[2];
    db.seances = db.seances.filter((s) => s.id !== id);
    return ok(null);
  }

  /* ------------------------------------------------------ Emplois du temps */

  if (chemin.startsWith('/emplois-du-temps/classes/')) {
    const id = chemin.split('/')[3];
    return ok(db.seances.filter((s) => s.classeId === id && s.periodeId === param('periodeId')));
  }
  if (chemin.startsWith('/emplois-du-temps/enseignants/')) {
    const id = chemin.split('/')[3];
    return ok(db.seances.filter((s) => s.enseignantId === id && s.periodeId === param('periodeId')));
  }
  if (chemin.startsWith('/emplois-du-temps/salles/')) {
    const id = chemin.split('/')[3];
    return ok(db.seances.filter((s) => s.salle.id === id && s.periodeId === param('periodeId')));
  }

  /* ------------------------------------------------------ Generation assistee */

  if (chemin === '/demandes-generation' && requete.method === 'POST') {
    const corps = requete.body as { periodeId: string; classeIds: string[]; nombreDePropositions: number };
    const demande: DemandeGeneration = {
      id: db.nouvelId('dmd'),
      periodeId: corps.periodeId,
      demandeurId: 'usr-chef-1',
      classeIds: corps.classeIds,
      statut: 'TERMINEE',
      creeLe: new Date().toISOString(),
      termineLe: new Date().toISOString(),
      propositions: db.genererPropositions(
        corps.periodeId, corps.classeIds[0], corps.nombreDePropositions
      )
    };
    db.demandes = [...db.demandes, demande];
    return ok(demande);
  }

  if (chemin.startsWith('/demandes-generation/') && chemin.endsWith('/accepter')) {
    const [, , demandeId, , propositionId] = chemin.split('/');
    const demande = db.demandes.find((d) => d.id === demandeId);
    const proposition = demande?.propositions.find((p) => p.id === propositionId);
    if (!demande || !proposition) return ok<Seance[]>([]);

    const creees: Seance[] = proposition.seancesProposees.map((p) =>
      db.construireSeance(
        db.nouvelId('sea'),
        {
          periodeId: p.periodeId, classeId: p.classeId, ecId: p.ecId,
          enseignantId: p.enseignantId, salleId: p.salle.id, creneauId: p.creneau.id,
          jour: p.jour, nbCreneaux: p.nbCreneaux, type: p.type
        },
        'BROUILLON'
      )
    );
    db.seances = [...db.seances, ...creees];
    proposition.retenue = true;
    return ok(creees);
  }

  if (chemin.startsWith('/demandes-generation/') && requete.method === 'GET') {
    const id = chemin.split('/')[2];
    return ok(db.demandes.find((d) => d.id === id));
  }

  return suivant(requete);

  /** Rejoue la validation complete avant d'appliquer une modification de seance. */
  function appliquerModification(
    id: string,
    transformer: (source: SeanceRequest) => SeanceRequest
  ): Observable<HttpResponse<Seance>> {
    const existante = db.seances.find((s) => s.id === id)!;
    const source: SeanceRequest = {
      periodeId: existante.periodeId, classeId: existante.classeId, ecId: existante.ecId,
      enseignantId: existante.enseignantId, salleId: existante.salle.id,
      creneauId: existante.creneau.id, jour: existante.jour,
      nbCreneaux: existante.nbCreneaux, type: existante.type
    };
    const cible = transformer(source);
    const violations = db.verifier(cible, id);
    if (contientBloquant(violations)) {
      return throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: {
              status: 409,
              code: 'CONFLIT_PLANIFICATION',
              message: 'Modification impossible.',
              violations: violations.filter((v) => v.severite === 'DURE')
            }
          })
      );
    }
    const majour = db.construireSeance(id, cible, existante.statut);
    majour.version = existante.version + 1;
    majour.avertissements = violations.filter((v) => v.severite === 'SOUPLE');
    db.seances = db.seances.map((s) => (s.id === id ? majour : s));
    return of(new HttpResponse({ status: 200, body: majour })).pipe(delay(120));
  }
};
