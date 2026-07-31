import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URLS } from '../urls/api.urls';
import { Departement, DepartementRequest } from '../models/planification.model';

/** Departements : rattaches aux classes, geres un par un par leur chef. */
@Injectable({ providedIn: 'root' })
export class DepartementService {
  private readonly http = inject(HttpClient);

  listerDepartements(): Promise<Departement[]> {
    return firstValueFrom(this.http.get<Departement[]>(API_URLS.departements));
  }

  detailDepartement(id: string): Promise<Departement> {
    return firstValueFrom(this.http.get<Departement>(API_URLS.departement(id)));
  }

  creerDepartement(requete: DepartementRequest): Promise<Departement> {
    return firstValueFrom(this.http.post<Departement>(API_URLS.departements, requete));
  }

  modifierDepartement(id: string, requete: DepartementRequest): Promise<Departement> {
    return firstValueFrom(this.http.put<Departement>(API_URLS.departement(id), requete));
  }

  supprimerDepartement(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(API_URLS.departement(id)));
  }
}
