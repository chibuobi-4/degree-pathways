import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Module } from '../../services/api.service';

@Component({
  selector: 'app-pathway-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pathway-panel.component.html',
  styleUrl: './pathway-panel.component.scss'
})
export class PathwayPanelComponent {
  @Input() pathway: Module[] = [];
  @Input() selectedModuleId: string | null = null;
}
