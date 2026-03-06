import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, University, Programme, CatalogueVersion, Module, GraphNode, GraphEdge } from '../services/api.service';
import { GraphViewComponent } from '../components/graph-view/graph-view.component';
import { PathwayPanelComponent } from '../components/pathway-panel/pathway-panel.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, GraphViewComponent, PathwayPanelComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  universities: University[] = [];
  programmes: Programme[] = [];
  catalogues: CatalogueVersion[] = [];
  modules: Module[] = [];
  graphNodes: GraphNode[] = [];
  graphEdges: GraphEdge[] = [];
  pathway: Module[] = [];

  selectedUniversityId: string | null = null;
  selectedProgrammeId: string | null = null;
  selectedCatalogueId: string | null = null;
  selectedModuleId: string | null = null;
  skillFilter: string | null = null;
  skills: { id: string; name: string }[] = [];

  loading = false;
  error: string | null = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadUniversities();
  }

  loadUniversities(): void {
    this.api.getUniversities().subscribe({
      next: (u) => {
        this.universities = u;
        if (u.length) this.selectedUniversityId = u[0].id;
        this.onUniversityChange();
      },
      error: (e) => (this.error = e.message)
    });
  }

  onUniversityChange(): void {
    this.selectedProgrammeId = null;
    this.selectedCatalogueId = null;
    this.catalogues = [];
    this.modules = [];
    this.graphNodes = [];
    this.graphEdges = [];
    this.pathway = [];
    this.selectedModuleId = null;
    if (!this.selectedUniversityId) return;
    this.api.getProgrammes(this.selectedUniversityId).subscribe({
      next: (p) => {
        this.programmes = p;
        if (p.length) this.selectedProgrammeId = p[0].id;
        this.onProgrammeChange();
      },
      error: (e) => (this.error = e.message)
    });
  }

  onProgrammeChange(): void {
    this.selectedCatalogueId = null;
    this.catalogues = [];
    this.modules = [];
    this.graphNodes = [];
    this.graphEdges = [];
    this.pathway = [];
    this.selectedModuleId = null;
    if (!this.selectedProgrammeId) return;
    this.loading = true;
    this.error = null;
    this.api.getCatalogues(this.selectedProgrammeId).subscribe({
      next: (c) => {
        this.catalogues = c;
        if (c.length) this.selectedCatalogueId = c[0].id;
        this.onCatalogueChange();
      },
      error: (e) => {
        this.error = e.message;
        this.loading = false;
      }
    });
    this.api.getSkills(this.selectedProgrammeId).subscribe({
      next: (s) => (this.skills = s),
      error: () => {}
    });
  }

  onCatalogueChange(): void {
    this.modules = [];
    this.graphNodes = [];
    this.graphEdges = [];
    this.pathway = [];
    this.selectedModuleId = null;
    if (!this.selectedCatalogueId) return;
    this.loading = true;
    this.api.getModules(this.selectedCatalogueId).subscribe({
      next: (m) => {
        this.modules = m;
        this.loading = false;
      },
      error: (e) => {
        this.error = e.message;
        this.loading = false;
      }
    });
    this.api.getGraph(this.selectedCatalogueId).subscribe({
      next: (g) => {
        this.graphNodes = g.nodes;
        this.graphEdges = g.edges;
      },
      error: () => {}
    });
  }

  onNodeClick(node: GraphNode): void {
    this.selectedModuleId = node.id;
    this.loadPathway(node.id);
  }

  onModuleClick(module: Module): void {
    this.selectedModuleId = module.id;
    this.loadPathway(module.id);
  }

  loadPathway(moduleId: string): void {
    this.pathway = [];
    this.api.getPathway(moduleId).subscribe({
      next: (res) => (this.pathway = res.pathway),
      error: () => (this.pathway = [])
    });
  }

  get filteredModules(): Module[] {
    let list = this.modules;
    if (this.skillFilter) {
      list = list.filter(m => m.moduleSkills?.some(ms => ms.skill.name === this.skillFilter));
    }
    return list.sort((a, b) => ({ A: 1, B: 2, C: 3 }[a.part] || 0) - ({ A: 1, B: 2, C: 3 }[b.part] || 0));
  }

  getModuleSkills(m: Module): string[] {
    return m.moduleSkills?.map(ms => ms.skill.name) ?? [];
  }

  get selectedModule(): Module | null {
    if (!this.selectedModuleId) return null;
    return this.pathway.find(m => m.id === this.selectedModuleId) ?? this.modules.find(m => m.id === this.selectedModuleId) ?? null;
  }

  getLearningOutcomesList(module: Module): string[] {
    const raw = module.learningOutcomes?.trim();
    if (!raw) return [];
    return raw.split(/\n/).map(s => s.trim()).filter(Boolean);
  }
}
