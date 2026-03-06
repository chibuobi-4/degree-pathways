import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphNode, GraphEdge } from '../../services/api.service';

interface NodeLayout {
  node: GraphNode;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PartBand {
  part: string;
  label: string;
  labelWidth: number;
  x: number;
  y: number;
  height: number;
  width: number;
}

@Component({
  selector: 'app-graph-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './graph-view.component.html',
  styleUrl: './graph-view.component.scss'
})
export class GraphViewComponent implements OnChanges {
  @Input() nodes: GraphNode[] = [];
  @Input() edges: GraphEdge[] = [];
  @Input() selectedId: string | null = null;
  @Input() pathwayNodeIds: string[] = [];
  @Output() nodeClick = new EventEmitter<GraphNode>();

  layout: NodeLayout[] = [];
  partBands: PartBand[] = [];
  viewBox = '0 0 800 480';
  viewBoxWidth = 800;
  viewBoxHeight = 480;
  transform = 'translate(0,0) scale(1)';
  private scale = 1;
  private panX = 0;
  private panY = 0;
  private isDragging = false;
  private startX = 0;
  private startY = 0;

  readonly PART_LABELS: Record<string, string> = {
    A: 'Part A — Foundation',
    B: 'Part B — Core',
    C: 'Part C — Advanced'
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['nodes'] || changes['edges']) {
      this.computeLayout();
    }
  }

  private computeLayout(): void {
    const partOrder = ['A', 'B', 'C'];
    const nodeWidth = 76;
    const nodeHeight = 38;
    const rowHeight = 120;
    const colGap = 88;
    const paddingRight = 80;
    const bandPadding = 24;
    /** Left margin reserved for Part A/B/C labels so nodes never overlap them */
    const labelColumnWidth = 240;
    const labelGap = 20;
    const contentMinWidth = 460;
    const contentWidth = Math.max(contentMinWidth, 800 - labelColumnWidth - labelGap - paddingRight);

    this.layout = [];
    this.partBands = [];
    let currentY = bandPadding;
    let maxContentX = 0;

    partOrder.forEach((part, rowIndex) => {
      const partNodes = this.nodes.filter(n => n.part === part);
      if (partNodes.length === 0) return;

      const totalRowWidth = partNodes.length * nodeWidth + (partNodes.length - 1) * colGap;
      const startX = labelColumnWidth + labelGap + Math.max(0, (contentWidth - totalRowWidth) / 2);
      const rowRight = startX + totalRowWidth;
      if (rowRight > maxContentX) maxContentX = rowRight;

      const bandY = currentY - 8;
      const bandH = rowHeight - 16;

      const label = this.PART_LABELS[part] || `Part ${part}`;
      const labelWidth = Math.min(200, Math.max(140, label.length * 9));
      this.partBands.push({
        part,
        label,
        labelWidth,
        x: 0,
        y: bandY,
        height: bandH,
        width: 800
      });

      partNodes.forEach((node, i) => {
        this.layout.push({
          node,
          x: startX + i * (nodeWidth + colGap),
          y: currentY + (bandH - nodeHeight) / 2,
          width: nodeWidth,
          height: nodeHeight
        });
      });

      currentY += rowHeight;
    });

    const maxX = Math.max(800, maxContentX + paddingRight);
    const maxY = currentY + bandPadding;
    this.viewBoxWidth = maxX;
    this.viewBoxHeight = maxY;
    this.viewBox = `0 0 ${maxX} ${maxY}`;

    this.partBands.forEach(b => b.width = maxX);
  }

  getNodeById(id: string): NodeLayout | undefined {
    return this.layout.find(l => l.node.id === id);
  }

  getEdgePath(edge: GraphEdge): string {
    const from = this.layout.find(l => l.node.id === edge.from);
    const to = this.layout.find(l => l.node.id === edge.to);
    if (!from || !to) return '';
    const x1 = from.x + from.width / 2;
    const y1 = from.y + from.height;
    const x2 = to.x + to.width / 2;
    const y2 = to.y;
    const midY = (y1 + y2) / 2;
    return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
  }

  isInPathway(nodeId: string): boolean {
    return this.pathwayNodeIds.length === 0 || this.pathwayNodeIds.includes(nodeId);
  }

  isPathwayEdge(edge: GraphEdge): boolean {
    if (this.pathwayNodeIds.length === 0) return true;
    return this.pathwayNodeIds.includes(edge.from) && this.pathwayNodeIds.includes(edge.to);
  }

  onNodeClick(node: GraphNode): void {
    this.nodeClick.emit(node);
  }

  onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    this.scale = Math.min(2, Math.max(0.3, this.scale + delta));
    this.updateTransform();
  }

  onPointerDown(e: PointerEvent): void {
    if ((e.target as HTMLElement).closest('svg .node')) return;
    this.isDragging = true;
    this.startX = e.clientX - this.panX;
    this.startY = e.clientY - this.panY;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  onPointerMove(e: PointerEvent): void {
    if (!this.isDragging) return;
    this.panX = e.clientX - this.startX;
    this.panY = e.clientY - this.startY;
    this.updateTransform();
  }

  onPointerUp(e: PointerEvent): void {
    this.isDragging = false;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  }

  private updateTransform(): void {
    this.transform = `translate(${this.panX}px,${this.panY}px) scale(${this.scale})`;
  }
}
