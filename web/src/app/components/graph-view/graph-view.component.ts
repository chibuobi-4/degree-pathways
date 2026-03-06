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
  @Output() nodeClick = new EventEmitter<GraphNode>();

  layout: NodeLayout[] = [];
  viewBox = '0 0 800 400';
  transform = 'translate(0,0) scale(1)';
  private scale = 1;
  private panX = 0;
  private panY = 0;
  private isDragging = false;
  private startX = 0;
  private startY = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['nodes'] || changes['edges']) {
      this.computeLayout();
    }
  }

  private computeLayout(): void {
    const partOrder = ['A', 'B', 'C'];
    const nodeWidth = 72;
    const nodeHeight = 36;
    const rowGap = 100;
    const colGap = 90;
    const startX = 80;
    const startY = 60;

    this.layout = [];
    partOrder.forEach((part, rowIndex) => {
      const partNodes = this.nodes.filter(n => n.part === part);
      partNodes.forEach((node, i) => {
        this.layout.push({
          node,
          x: startX + i * (nodeWidth + colGap),
          y: startY + rowIndex * (nodeHeight + rowGap),
          width: nodeWidth,
          height: nodeHeight
        });
      });
    });

    const maxX = Math.max(...this.layout.map(l => l.x + l.width), 400);
    const maxY = Math.max(...this.layout.map(l => l.y + l.height), 300);
    this.viewBox = `0 0 ${maxX + 80} ${maxY + 60}`;
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
