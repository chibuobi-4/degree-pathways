import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface University {
  id: string;
  name: string;
  country: string | null;
  url: string | null;
}

export interface Programme {
  id: string;
  universityId: string;
  name: string;
  award: string | null;
  durationYears: number | null;
}

export interface CatalogueVersion {
  id: string;
  programmeId: string;
  academicYear: string;
  isActive: boolean;
}

export interface Module {
  id: string;
  code: string;
  title: string;
  part: string;
  credits: number | null;
  description: string | null;
  learningOutcomes?: string | null;
  required: boolean;
  moduleSkills?: { skill: { name: string } }[];
}

export interface Skill {
  id: string;
  name: string;
  category: string | null;
}

export interface GraphNode {
  id: string;
  code: string;
  title: string;
  part: string;
  skills: string[];
}

export interface GraphEdge {
  from: string;
  to: string;
  type: string;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface PathwayResponse {
  module: Module;
  pathway: Module[];
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getUniversities(): Observable<University[]> {
    return this.http.get<University[]>(`${this.base}/universities`);
  }

  getProgrammes(universityId?: string): Observable<Programme[]> {
    const params = universityId ? new HttpParams().set('universityId', universityId) : undefined;
    return this.http.get<Programme[]>(`${this.base}/programmes`, { params });
  }

  getCatalogues(programmeId: string): Observable<CatalogueVersion[]> {
    return this.http.get<CatalogueVersion[]>(`${this.base}/catalogues`, {
      params: { programmeId }
    });
  }

  getModules(catalogueVersionId: string): Observable<Module[]> {
    return this.http.get<Module[]>(`${this.base}/modules`, {
      params: { catalogueVersionId }
    });
  }

  getSkills(programmeId: string): Observable<Skill[]> {
    return this.http.get<Skill[]>(`${this.base}/skills`, {
      params: { programmeId }
    });
  }

  getGraph(catalogueVersionId: string): Observable<GraphResponse> {
    return this.http.get<GraphResponse>(`${this.base}/graph`, {
      params: { catalogueVersionId }
    });
  }

  getPathway(moduleId: string): Observable<PathwayResponse> {
    return this.http.get<PathwayResponse>(`${this.base}/pathways/from-module/${moduleId}`);
  }
}
