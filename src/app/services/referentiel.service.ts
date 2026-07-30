import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URLS } from '../urls/api.urls';
import { Jour, TypeSalle } from '../models/enums';
import { Campus, Creneau, Salle, SalleRequest } from '../models/planification.model';

/** Referentiel : campus, salles, creneaux. Lecture majoritaire, ecriture pour les salles. */
@Injectable({ providedIn: 'root' })
export class ReferentielService {
  private readonly http = inject(HttpClient);

  listerCampus(): Promise<Campus[]> {
    return firstValueFrom(this.http.get<Campus[]>(API_URLS.campus));
  }

  listerCreneaux(): Promise<Creneau[]> {
    return firstValueFrom(this.http.get<Creneau[]>(API_URLS.creneaux));
  }

  listerSalles(filtres?: { campusCode?: string; capaciteMin?: number; type?: TypeSalle }): Promise<Salle[]> {
    let params = new HttpParams();
    if (filtres?.campusCode) params = params.set('campusCode', filtres.campusCode);
    if (filtres?.capaciteMin != null) params = params.set('capaciteMin', filtres.capaciteMin);
    if (filtres?.type) params = params.set('type', filtres.type);
    return firstValueFrom(this.http.get<Salle[]>(API_URLS.salles, { params }));
  }

  /** Salles libres telles que le back les calcule : la reference en cas de doute. */
  sallesDisponibles(criteres: {
    periodeId: string;
    jour: Jour;
    creneauId: string;
    nbCreneaux: number;
    capaciteMin?: number;
  }): Promise<Salle[]> {
    let params = new HttpParams()
      .set('periodeId', criteres.periodeId)
      .set('jour', criteres.jour)
      .set('creneauId', criteres.creneauId)
      .set('nbCreneaux', criteres.nbCreneaux);
    if (criteres.capaciteMin != null) params = params.set('capaciteMin', criteres.capaciteMin);
    return firstValueFrom(this.http.get<Salle[]>(API_URLS.sallesDisponibles, { params }));
  }

  creerSalle(requete: SalleRequest): Promise<Salle> {
    return firstValueFrom(this.http.post<Salle>(API_URLS.salles, requete));
  }

  modifierSalle(id: string, requete: SalleRequest): Promise<Salle> {
    return firstValueFrom(this.http.put<Salle>(API_URLS.salle(id), requete));
  }

  supprimerSalle(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(API_URLS.salle(id)));
  }
}
