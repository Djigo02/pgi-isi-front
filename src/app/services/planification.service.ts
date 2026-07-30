import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URLS } from '../urls/api.urls';
import { Jour } from '../models/enums';
import {
  DemandeGeneration, DemandeGenerationRequest, DeplacementSeanceRequest,
  Disponibilite, DisponibiliteRequest, DureeSeanceRequest, PublicationRequest,
  Seance, SeancePatchRequest, SeanceRequest, VerificationResult
} from '../models/planification.model';

/** Seances, disponibilites, emplois du temps et generation assistee. */
@Injectable({ providedIn: 'root' })
export class PlanificationService {
  private readonly http = inject(HttpClient);

  /* ------------------------------------------------------------- Disponibilites */

  listerDisponibilites(filtres?: { enseignantId?: string; periodeId?: string }): Promise<Disponibilite[]> {
    let params = new HttpParams();
    if (filtres?.enseignantId) params = params.set('enseignantId', filtres.enseignantId);
    if (filtres?.periodeId) params = params.set('periodeId', filtres.periodeId);
    return firstValueFrom(this.http.get<Disponibilite[]>(API_URLS.disponibilites, { params }));
  }

  creerDisponibilite(requete: DisponibiliteRequest): Promise<Disponibilite> {
    return firstValueFrom(this.http.post<Disponibilite>(API_URLS.disponibilites, requete));
  }

  supprimerDisponibilite(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(API_URLS.disponibilite(id)));
  }

  /* -------------------------------------------------------------------- Seances */

  rechercherSeances(filtres: {
    periodeId?: string; classeId?: string; enseignantId?: string; salleId?: string; jour?: Jour;
  }): Promise<Seance[]> {
    let params = new HttpParams();
    for (const [cle, valeur] of Object.entries(filtres)) {
      if (valeur) params = params.set(cle, String(valeur));
    }
    return firstValueFrom(this.http.get<Seance[]>(API_URLS.seances, { params }));
  }

  /** Essai a blanc : renvoie les violations sans rien ecrire. */
  verifier(requete: SeanceRequest): Promise<VerificationResult> {
    return firstValueFrom(this.http.post<VerificationResult>(API_URLS.seanceVerifier, requete));
  }

  creerSeance(requete: SeanceRequest): Promise<Seance> {
    return firstValueFrom(this.http.post<Seance>(API_URLS.seances, requete));
  }

  deplacerSeance(id: string, requete: DeplacementSeanceRequest): Promise<Seance> {
    return firstValueFrom(this.http.patch<Seance>(API_URLS.seanceDeplacer(id), requete));
  }

  changerDuree(id: string, requete: DureeSeanceRequest): Promise<Seance> {
    return firstValueFrom(this.http.patch<Seance>(API_URLS.seanceDuree(id), requete));
  }

  modifierSeance(id: string, requete: SeancePatchRequest): Promise<Seance> {
    return firstValueFrom(this.http.patch<Seance>(API_URLS.seance(id), requete));
  }

  supprimerSeance(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(API_URLS.seance(id)));
  }

  publier(requete: PublicationRequest): Promise<Seance[]> {
    return firstValueFrom(this.http.post<Seance[]>(API_URLS.seancesPublier, requete));
  }

  /* ------------------------------------------------------------ Emploi du temps */

  emploiDuTempsClasse(classeId: string, periodeId: string): Promise<Seance[]> {
    const params = new HttpParams().set('periodeId', periodeId);
    return firstValueFrom(this.http.get<Seance[]>(API_URLS.emploiDuTempsClasse(classeId), { params }));
  }

  emploiDuTempsEnseignant(enseignantId: string, periodeId: string): Promise<Seance[]> {
    const params = new HttpParams().set('periodeId', periodeId);
    return firstValueFrom(this.http.get<Seance[]>(API_URLS.emploiDuTempsEnseignant(enseignantId), { params }));
  }

  emploiDuTempsSalle(salleId: string, periodeId: string): Promise<Seance[]> {
    const params = new HttpParams().set('periodeId', periodeId);
    return firstValueFrom(this.http.get<Seance[]>(API_URLS.emploiDuTempsSalle(salleId), { params }));
  }

  /* ------------------------------------------------------- Generation assistee */

  lancerGeneration(requete: DemandeGenerationRequest): Promise<DemandeGeneration> {
    return firstValueFrom(this.http.post<DemandeGeneration>(API_URLS.demandesGeneration, requete));
  }

  suivreGeneration(id: string): Promise<DemandeGeneration> {
    return firstValueFrom(this.http.get<DemandeGeneration>(API_URLS.demandeGeneration(id)));
  }

  /** Seule voie qui transforme une proposition en seances reelles. */
  accepterProposition(demandeId: string, propositionId: string): Promise<Seance[]> {
    return firstValueFrom(
      this.http.post<Seance[]>(API_URLS.accepterProposition(demandeId, propositionId), {})
    );
  }
}
