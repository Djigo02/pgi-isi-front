import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URLS } from '../urls/api.urls';
import {
  AffectationEnseignant, AffectationRequest, Classe, ClasseRequest, ElementConstitutif,
  ElementConstitutifRequest, Enseignant, EnseignantRequest, Periode
} from '../models/planification.model';

/** Donnees pedagogiques : periodes, classes, EC, enseignants, affectations. */
@Injectable({ providedIn: 'root' })
export class PedagogieService {
  private readonly http = inject(HttpClient);

  listerPeriodes(): Promise<Periode[]> {
    return firstValueFrom(this.http.get<Periode[]>(API_URLS.periodes));
  }

  listerClasses(departementId?: string): Promise<Classe[]> {
    let params = new HttpParams();
    if (departementId) params = params.set('departementId', departementId);
    return firstValueFrom(this.http.get<Classe[]>(API_URLS.classes, { params }));
  }

  creerClasse(requete: ClasseRequest): Promise<Classe> {
    return firstValueFrom(this.http.post<Classe>(API_URLS.classes, requete));
  }

  modifierClasse(id: string, requete: ClasseRequest): Promise<Classe> {
    return firstValueFrom(this.http.put<Classe>(API_URLS.classe(id), requete));
  }

  supprimerClasse(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(API_URLS.classe(id)));
  }

  listerElementsConstitutifs(classeId?: string): Promise<ElementConstitutif[]> {
    let params = new HttpParams();
    if (classeId) params = params.set('classeId', classeId);
    return firstValueFrom(this.http.get<ElementConstitutif[]>(API_URLS.elementsConstitutifs, { params }));
  }

  creerElementConstitutif(requete: ElementConstitutifRequest): Promise<ElementConstitutif> {
    return firstValueFrom(this.http.post<ElementConstitutif>(API_URLS.elementsConstitutifs, requete));
  }

  modifierElementConstitutif(id: string, requete: ElementConstitutifRequest): Promise<ElementConstitutif> {
    return firstValueFrom(this.http.put<ElementConstitutif>(API_URLS.elementConstitutif(id), requete));
  }

  supprimerElementConstitutif(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(API_URLS.elementConstitutif(id)));
  }

  listerEnseignants(): Promise<Enseignant[]> {
    return firstValueFrom(this.http.get<Enseignant[]>(API_URLS.enseignants));
  }

  creerEnseignant(requete: EnseignantRequest): Promise<Enseignant> {
    return firstValueFrom(this.http.post<Enseignant>(API_URLS.enseignants, requete));
  }

  modifierEnseignant(id: string, requete: EnseignantRequest): Promise<Enseignant> {
    return firstValueFrom(this.http.put<Enseignant>(API_URLS.enseignant(id), requete));
  }

  supprimerEnseignant(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(API_URLS.enseignant(id)));
  }

  /** Un EC peut etre assure par plusieurs enseignants : c'est ici que cela se declare. */
  listerAffectations(ecId?: string): Promise<AffectationEnseignant[]> {
    let params = new HttpParams();
    if (ecId) params = params.set('ecId', ecId);
    return firstValueFrom(this.http.get<AffectationEnseignant[]>(API_URLS.affectations, { params }));
  }

  creerAffectation(requete: AffectationRequest): Promise<AffectationEnseignant> {
    return firstValueFrom(this.http.post<AffectationEnseignant>(API_URLS.affectations, requete));
  }

  supprimerAffectation(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(API_URLS.affectation(id)));
  }
}
