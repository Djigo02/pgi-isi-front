import { Injectable } from '@angular/core';
import { JOURS, Jour, TypeSalle } from '../models/enums';
import {
  AffectationEnseignant, Campus, Classe, Creneau, DemandeGeneration, Disponibilite,
  ElementConstitutif, Enseignant, Periode, Proposition, Salle, Seance, SeanceProposee,
  SeanceRequest, Violation
} from '../models/planification.model';
import { detecterConflits, contientBloquant } from '../utils/conflit.util';
import { dureeEnHeures } from '../utils/creneau.util';

/**
 * Backend simule en memoire.
 *
 * Il rejoue le seeder du microservice : 3 campus, 24 salles, 13 creneaux d'une heure,
 * plus un jeu pedagogique realiste. Il applique les memes regles de conflit que
 * ConflitService, ce qui permet de demontrer l'application sans lancer Spring.
 */
@Injectable({ providedIn: 'root' })
export class MockBackendService {
  readonly periodes: Periode[] = [
    { id: 'per-1', libelle: '2025-2026 - Semestre 1', anneeAcademique: '2025-2026', semestre: 1, actif: true },
    { id: 'per-2', libelle: '2025-2026 - Semestre 2', anneeAcademique: '2025-2026', semestre: 2, actif: false }
  ];

  readonly campus: Campus[] = [
    { id: 'cmp-siege', code: 'SIEGE', nom: 'Siege', actif: true },
    { id: 'cmp-annexe', code: 'ANNEXE', nom: 'Annexe', actif: true },
    { id: 'cmp-annexe-siege', code: 'ANNEXE_SIEGE', nom: 'Annexe Siege', actif: true }
  ];

  readonly creneaux: Creneau[] = this.construireCreneaux();
  salles: Salle[] = this.construireSalles();

  classes: Classe[] = [
    { id: 'cls-gl1', code: 'GL1', nom: 'Genie Logiciel - Niveau 1', effectif: 62, actif: true },
    { id: 'cls-gl2', code: 'GL2', nom: 'Genie Logiciel - Niveau 2', effectif: 41, actif: true },
    { id: 'cls-gl3', code: 'GL3', nom: 'Genie Logiciel - Niveau 3', effectif: 24, actif: true }
  ];

  ecs: ElementConstitutif[] = [
    this.ec('ec-1', 'INF111', 'Algorithmique', 6, 'cls-gl1'),
    this.ec('ec-2', 'INF112', 'Programmation en C', 5, 'cls-gl1'),
    this.ec('ec-3', 'INF121', 'Structures discretes', 3, 'cls-gl1'),
    this.ec('ec-4', 'INF122', 'Anglais technique', 2, 'cls-gl1'),
    this.ec('ec-5', 'INF211', 'Genie logiciel et UML', 6, 'cls-gl2'),
    this.ec('ec-6', 'INF212', 'Bases de donnees relationnelles', 5, 'cls-gl2'),
    this.ec('ec-7', 'INF221', 'Systemes d exploitation', 3, 'cls-gl2'),
    this.ec('ec-8', 'INF222', 'Reseaux informatiques', 3, 'cls-gl2'),
    this.ec('ec-9', 'INF311', 'Architecture microservices', 6, 'cls-gl3'),
    this.ec('ec-10', 'INF312', 'Intelligence artificielle', 3, 'cls-gl3'),
    this.ec('ec-11', 'INF313', 'Projet integrateur', 5, 'cls-gl3')
  ];

  enseignants: Enseignant[] = [
    { id: 'ens-1', matricule: 'E-2011-045', nom: 'MBALLA Jean', email: 'j.mballa@univ.local', grade: 'Maitre de conferences', actif: true },
    { id: 'ens-2', matricule: 'E-2015-118', nom: 'TCHOUA Alice', email: 'a.tchoua@univ.local', grade: 'Charge de cours', actif: true },
    { id: 'ens-3', matricule: 'E-2009-007', nom: 'KAMGA Robert', email: 'r.kamga@univ.local', grade: 'Professeur', actif: true },
    { id: 'ens-4', matricule: 'E-2018-233', nom: 'NDJOMO Sylvie', email: 's.ndjomo@univ.local', grade: 'Assistant', actif: true },
    { id: 'ens-5', matricule: 'E-2013-090', nom: 'FOTSO Marc', email: 'm.fotso@univ.local', grade: 'Charge de cours', actif: true },
    { id: 'ens-6', matricule: 'E-2020-311', nom: 'ESSOMBA Clara', email: 'c.essomba@univ.local', grade: 'Assistant', actif: true }
  ];

  /** Plusieurs enseignants par EC : le choix se fait seance par seance. */
  affectations: AffectationEnseignant[] = [
    this.aff('af-1', 'ens-1', 'ec-1'), this.aff('af-2', 'ens-4', 'ec-1'),
    this.aff('af-3', 'ens-2', 'ec-2'), this.aff('af-4', 'ens-4', 'ec-2'),
    this.aff('af-5', 'ens-3', 'ec-3'), this.aff('af-6', 'ens-5', 'ec-3'),
    this.aff('af-7', 'ens-6', 'ec-4'),
    this.aff('af-8', 'ens-1', 'ec-5'), this.aff('af-9', 'ens-3', 'ec-5'),
    this.aff('af-10', 'ens-4', 'ec-6'), this.aff('af-11', 'ens-2', 'ec-6'),
    this.aff('af-12', 'ens-5', 'ec-7'), this.aff('af-13', 'ens-1', 'ec-7'),
    this.aff('af-14', 'ens-5', 'ec-8'), this.aff('af-15', 'ens-6', 'ec-8'),
    this.aff('af-16', 'ens-1', 'ec-9'), this.aff('af-17', 'ens-3', 'ec-9'),
    this.aff('af-18', 'ens-3', 'ec-10'), this.aff('af-19', 'ens-4', 'ec-10'),
    this.aff('af-20', 'ens-2', 'ec-11'), this.aff('af-21', 'ens-4', 'ec-11')
  ];

  disponibilites: Disponibilite[] = [
    this.dispo('dsp-1', 'ens-1', 'SAMEDI', null, 'INDISPONIBLE'),
    this.dispo('dsp-2', 'ens-1', 'DIMANCHE', null, 'INDISPONIBLE'),
    this.dispo('dsp-3', 'ens-1', 'LUNDI', 'CRN-0800', 'PREFERE'),
    this.dispo('dsp-4', 'ens-2', 'MARDI', 'CRN-0800', 'PREFERE'),
    this.dispo('dsp-5', 'ens-3', 'VENDREDI', null, 'INDISPONIBLE'),
    this.dispo('dsp-6', 'ens-4', 'MERCREDI', 'CRN-1400', 'INDISPONIBLE'),
    this.dispo('dsp-7', 'ens-4', 'MERCREDI', 'CRN-1500', 'INDISPONIBLE'),
    this.dispo('dsp-8', 'ens-5', 'JEUDI', 'CRN-0800', 'INDISPONIBLE'),
    this.dispo('dsp-9', 'ens-5', 'JEUDI', 'CRN-0900', 'INDISPONIBLE'),
    this.dispo('dsp-10', 'ens-5', 'JEUDI', 'CRN-1000', 'INDISPONIBLE'),
    this.dispo('dsp-11', 'ens-6', 'MERCREDI', null, 'INDISPONIBLE')
  ];

  seances: Seance[] = [];
  demandes: DemandeGeneration[] = [];

  private compteur = 0;

  constructor() {
    this.seances = [
      this.construireSeance('sea-1', {
        periodeId: 'per-1', classeId: 'cls-gl3', ecId: 'ec-9', enseignantId: 'ens-1',
        salleId: 'sal-A23', creneauId: 'CRN-0800', jour: 'LUNDI', nbCreneaux: 2, type: 'CM'
      }, 'PUBLIEE'),
      this.construireSeance('sea-2', {
        periodeId: 'per-1', classeId: 'cls-gl3', ecId: 'ec-10', enseignantId: 'ens-3',
        salleId: 'sal-AS23', creneauId: 'CRN-1000', jour: 'MARDI', nbCreneaux: 2, type: 'CM'
      }, 'PUBLIEE'),
      this.construireSeance('sea-3', {
        periodeId: 'per-1', classeId: 'cls-gl3', ecId: 'ec-11', enseignantId: 'ens-2',
        salleId: 'sal-AS41', creneauId: 'CRN-1400', jour: 'JEUDI', nbCreneaux: 3, type: 'TP'
      }, 'PUBLIEE'),
      this.construireSeance('sea-4', {
        periodeId: 'per-1', classeId: 'cls-gl2', ecId: 'ec-7', enseignantId: 'ens-5',
        salleId: 'sal-AS11', creneauId: 'CRN-0800', jour: 'MERCREDI', nbCreneaux: 3, type: 'CM'
      }, 'BROUILLON'),
      this.construireSeance('sea-5', {
        periodeId: 'per-1', classeId: 'cls-gl1', ecId: 'ec-1', enseignantId: 'ens-1',
        salleId: 'sal-S01', creneauId: 'CRN-0800', jour: 'MARDI', nbCreneaux: 2, type: 'CM'
      }, 'BROUILLON')
    ];
  }

  /* --------------------------------------------------------------- Referentiel */

  private construireCreneaux(): Creneau[] {
    const creneaux: Creneau[] = [];
    for (let heure = 8, ordre = 1; heure < 21; heure++, ordre++) {
      const debut = `${String(heure).padStart(2, '0')}:00`;
      const fin = `${String(heure + 1).padStart(2, '0')}:00`;
      creneaux.push({
        id: `CRN-${String(heure).padStart(2, '0')}00`,
        code: `CRN-${String(heure).padStart(2, '0')}00`,
        heureDebut: debut,
        heureFin: fin,
        ordre,
        periodeJournee: heure < 12 ? 'MATIN' : heure < 14 ? 'MIDI' : heure < 18 ? 'APRES_MIDI' : 'SOIR',
        actif: true
      });
    }
    return creneaux;
  }

  private construireSalles(): Salle[] {
    const capacites: Record<string, number> = {
      S01: 150, S06: 120,
      A01: 80, A02: 80, A11: 60, A12: 60, A21: 60, A22: 55, A23: 45, A31: 45, A41: 40, A51: 35,
      AS11: 50, AS12: 50, AS21: 45, AS22: 45, AS23: 40, AS24: 40,
      AS31: 40, AS32: 40, AS33: 35, AS34: 35, AS41: 30, AS42: 30
    };

    return Object.entries(capacites).map(([code, capacite]) => {
      const prefixe = code.startsWith('AS') ? 'AS' : code.slice(0, 1);
      const campus =
        prefixe === 'AS' ? this.campus[2] : prefixe === 'A' ? this.campus[1] : this.campus[0];
      return {
        id: `sal-${code}`,
        code,
        campusId: campus.id,
        campusCode: campus.code,
        campusNom: campus.nom,
        etage: Number(code.slice(prefixe.length).charAt(0)),
        capacite,
        type: this.typeDepuisCapacite(capacite),
        actif: true
      };
    });
  }

  private typeDepuisCapacite(capacite: number): TypeSalle {
    if (capacite >= 100) return 'AMPHI';
    return capacite >= 45 ? 'SALLE_COURS' : 'SALLE_TD';
  }

  /* ---------------------------------------------------------------- Fabriques */

  private ec(id: string, code: string, intitule: string, volume: number, classeId: string): ElementConstitutif {
    const classe = ['cls-gl1', 'cls-gl2', 'cls-gl3'].indexOf(classeId);
    return {
      id, code, intitule, volumeHebdomadaire: volume, classeId,
      classeCode: ['GL1', 'GL2', 'GL3'][classe] ?? '', actif: true
    };
  }

  private aff(id: string, enseignantId: string, ecId: string): AffectationEnseignant {
    return {
      id, enseignantId, ecId,
      enseignantNom: this.enseignants.find((e) => e.id === enseignantId)?.nom ?? '',
      ecCode: this.ecs.find((e) => e.id === ecId)?.code ?? ''
    };
  }

  private dispo(
    id: string, enseignantId: string, jour: Jour, creneauCode: string | null,
    type: Disponibilite['type']
  ): Disponibilite {
    return {
      id, enseignantId, periodeId: 'per-1', jour,
      creneau: creneauCode ? this.creneaux.find((c) => c.id === creneauCode) ?? null : null,
      type
    };
  }

  construireSeance(id: string, requete: SeanceRequest, statut: Seance['statut']): Seance {
    const salle = this.salles.find((s) => s.id === requete.salleId)!;
    const creneau = this.creneaux.find((c) => c.id === requete.creneauId)!;
    return {
      id,
      periodeId: requete.periodeId,
      classeId: requete.classeId,
      ecId: requete.ecId,
      enseignantId: requete.enseignantId,
      salle,
      creneau,
      jour: requete.jour,
      nbCreneaux: requete.nbCreneaux,
      ordreDebut: creneau.ordre,
      ordreFin: creneau.ordre + requete.nbCreneaux,
      type: requete.type,
      statut,
      version: 0,
      avertissements: []
    };
  }

  nouvelId(prefixe: string): string {
    return `${prefixe}-${++this.compteur}-${Date.now().toString(36)}`;
  }

  /* ----------------------------------------------------------------- Controles */

  verifier(requete: SeanceRequest, seanceIdIgnoree?: string | null): Violation[] {
    return detecterConflits(
      { ...requete, id: seanceIdIgnoree ?? null },
      {
        seances: this.seances.filter((s) => s.periodeId === requete.periodeId),
        creneaux: this.creneaux,
        salles: this.salles,
        enseignants: this.enseignants,
        disponibilites: this.disponibilites.filter((d) => d.periodeId === requete.periodeId),
        affectations: this.affectations,
        classe: this.classes.find((c) => c.id === requete.classeId)
      }
    );
  }

  /* ------------------------------------------------------ Generation assistee */

  genererPropositions(periodeId: string, classeId: string, nombre: number): Proposition[] {
    const propositions: Proposition[] = [];
    for (let i = 0; i < nombre; i++) {
      propositions.push(this.uneProposition(periodeId, classeId, i));
    }
    return propositions
      .sort((a, b) => b.scoreSouple - a.scoreSouple)
      .map((p, index) => ({ ...p, rang: index + 1 }));
  }

  private uneProposition(periodeId: string, classeId: string, graine: number): Proposition {
    const melanger = <T>(liste: T[]): T[] => [...liste].sort(() => Math.random() - 0.5);
    const classe = this.classes.find((c) => c.id === classeId)!;
    const posees = this.seances.filter((s) => s.periodeId === periodeId);
    const virtuelles: Seance[] = [...posees];
    const proposees: SeanceProposee[] = [];
    const manquants: string[] = [];

    const sallesTriees = this.salles
      .filter((s) => s.actif && s.capacite >= classe.effectif)
      .sort((a, b) => a.capacite - b.capacite);

    for (const ec of melanger(this.ecs.filter((e) => e.classeId === classeId))) {
      const dejaPose = virtuelles
        .filter((s) => s.ecId === ec.id)
        .reduce((total, s) => total + (s.ordreFin - s.ordreDebut), 0);
      let restant = ec.volumeHebdomadaire - dejaPose;

      for (const jour of melanger([...JOURS])) {
        if (restant <= 0) break;
        for (const creneau of this.creneaux) {
          if (restant <= 0) break;
          const taille = Math.min(2, restant);
          const place = this.essayer(ec.id, classe, jour, creneau.id, taille, periodeId, virtuelles, sallesTriees);
          if (place) {
            virtuelles.push(place.seance);
            proposees.push(place.proposee);
            restant -= place.seance.nbCreneaux * dureeEnHeures(creneau);
          }
        }
      }
      if (restant > 0) manquants.push(`${ec.code} : ${restant} h non programmees.`);
    }

    const score = proposees.length * 10 - manquants.length * 20 - graine;
    return {
      id: this.nouvelId('prop'),
      rang: 0,
      scoreDur: 0,
      scoreSouple: score,
      retenue: false,
      seancesProposees: proposees,
      violations: manquants
    };
  }

  private essayer(
    ecId: string, classe: Classe, jour: Jour, creneauId: string, taille: number,
    periodeId: string, virtuelles: Seance[], sallesTriees: Salle[]
  ): { seance: Seance; proposee: SeanceProposee } | null {
    const habilites = this.affectations.filter((a) => a.ecId === ecId).map((a) => a.enseignantId);
    const ec = this.ecs.find((e) => e.id === ecId)!;

    for (let n = taille; n >= 1; n--) {
      for (const enseignantId of habilites) {
        for (const salle of sallesTriees) {
          const requete: SeanceRequest = {
            periodeId, classeId: classe.id, ecId, enseignantId,
            salleId: salle.id, creneauId, jour, nbCreneaux: n,
            type: ec.volumeHebdomadaire >= 5 ? 'CM' : 'TD'
          };
          const violations = detecterConflits(
            { ...requete, id: null },
            {
              seances: virtuelles, creneaux: this.creneaux, salles: this.salles,
              enseignants: this.enseignants,
              disponibilites: this.disponibilites.filter((d) => d.periodeId === periodeId),
              affectations: this.affectations, classe
            }
          );
          if (!contientBloquant(violations)) {
            const seance = this.construireSeance(this.nouvelId('virt'), requete, 'BROUILLON');
            const { statut, version, avertissements, ...reste } = seance;
            return { seance, proposee: { ...reste } as SeanceProposee };
          }
        }
      }
    }
    return null;
  }
}
