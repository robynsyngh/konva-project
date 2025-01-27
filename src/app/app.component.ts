import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KonvaCanvasComponent } from './konva-canvas/konva-canvas.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, KonvaCanvasComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'konva-project';
}
