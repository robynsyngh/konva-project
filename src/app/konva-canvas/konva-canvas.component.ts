import { AfterViewInit, Component, OnInit } from '@angular/core';
import Konva from 'konva';

@Component({
  selector: 'app-konva-canvas',
  standalone: true,
  imports: [],
  templateUrl: './konva-canvas.component.html',
  styleUrl: './konva-canvas.component.css'
})
export class KonvaCanvasComponent implements OnInit, AfterViewInit {

  stage: Konva.Stage | null = null;
  backgroundLayer: Konva.Layer | null = null;
  drawingLayer: Konva.Layer | null = null;
  interactionLayer: Konva.Layer | null = null;
  currentPolygon: Konva.Line | null = null;
  maskPolygons: Konva.Line[] = [];
  eraserEnabled: boolean = false;
  file: string | null = null;

  constructor() { }

  ngOnInit(): void {
    this.updateStageSize();
    window.addEventListener('resize', this.updateStageSize.bind(this));
  }
  
  updateStageSize(): void {
    if (!this.stage || !this.drawingLayer || !this.backgroundLayer) return;
    if (this.stage) {
      this.stage.width(window.innerWidth);
      this.stage.height(window.innerHeight);
      this.backgroundLayer.batchDraw();
      this.drawingLayer.batchDraw();
    }
  }
  ngAfterViewInit(): void {
    this.initializeCanvas();
  }

  initializeCanvas(): void {
    this.stage = new Konva.Stage({
      container: 'canvas-container',
      width: window.innerWidth,
      height: window.innerHeight,
    });

    this.backgroundLayer = new Konva.Layer();
    this.drawingLayer = new Konva.Layer();
    this.interactionLayer = new Konva.Layer();

    this.stage.add(this.backgroundLayer);
    this.stage.add(this.drawingLayer);
    this.stage.add(this.interactionLayer);

    this.setupEventListeners();
  }

  // Function to handle image upload
  onImageUpload(event: Event): void {

    if (!this.stage || !this.drawingLayer || !this.backgroundLayer) {
      console.error('Stage or layers are not initialized');
      return;
    }


    const input = event.target as HTMLInputElement;


    if (input.files && input.files[0]) {
      const reader = new FileReader();


      reader.onload = () => {
        const imageObj = new Image();
        imageObj.src = reader.result as string;
        this.file = imageObj.src;

        imageObj.onload = () => {
          if (!this.stage || !this.drawingLayer || !this.backgroundLayer) {
            console.error('Stage or layers are not initialized');
            return;
          }

          const imgWidth = imageObj.width;
          const imgHeight = imageObj.height;

          const scaleX = this.stage.width() / imgWidth;
          const scaleY = this.stage.height() / imgHeight;
          const scale = Math.min(scaleX, scaleY);


          const bgImage = new Konva.Image({
            image: imageObj,
            width: imgWidth * scale,
            height: imgHeight * scale,
            x: (this.stage.width() - imgWidth * scale) / 2,
            y: (this.stage.height() - imgHeight * scale) / 2,
          });

          this.backgroundLayer.destroyChildren();

          this.backgroundLayer.add(bgImage);

          this.backgroundLayer.batchDraw();
        };

        imageObj.onerror = (error) => {
          console.error('Error loading image:', error);
          alert('Failed to load image. Please try again.');
        };
      };

      reader.readAsDataURL(input.files[0]);
    } else {
      alert('Please select an image file to upload.');
    }
  }
  removeImage(): void {
    if (this.backgroundLayer) {
      this.backgroundLayer.destroyChildren();
      this.backgroundLayer.batchDraw();
      this.file = null;
    }
  }


  setupEventListeners(): void {
    if (!this.stage) return;
    const canvas = this.stage.container();

    canvas.addEventListener('click', (e) => {
      if (this.eraserEnabled) {
        this.erasePolygon(e);
      } else {
        this.drawPolygon(e);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'n' && this.currentPolygon) {
        this.closePolygon();
      }
    });
  }

  drawPolygon(e: MouseEvent): void {
    if (!this.stage || !this.drawingLayer) return;

    const mousePos = this.stage.getPointerPosition();
    if (!mousePos) return;

    if (!this.currentPolygon) {
      this.currentPolygon = new Konva.Line({
        points: [mousePos.x, mousePos.y],
        stroke: 'blue',
        strokeWidth: 2,
        closed: false,
        lineJoin: 'round',
        fill: 'rgba(0, 0, 255, 0.3)',
      });

      this.drawingLayer.add(this.currentPolygon);
    } else {
      const points = this.currentPolygon.points() || [];
      points.push(mousePos.x, mousePos.y);
      this.currentPolygon.points(points);
    }
    this.drawingLayer.batchDraw();
  }


  closePolygon(): void {
    if (this.currentPolygon) {
      this.currentPolygon.closed(true);
      this.maskPolygons.push(this.currentPolygon);
      this.currentPolygon = null;
    }
  }

  exportAsFile(): void {
    const maskData = this.maskPolygons.map((polygon) => ({
      points: polygon.points(),
      color: polygon.stroke(),
      fill: polygon.fill()
    }));
    if (!maskData?.length) {
      return alert('Nothing to export');
    }
    const maskJson = JSON.stringify(maskData, null, 2);

    const blob = new Blob([maskJson], { type: 'application/json' });

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const filename = 'maskjson' + new Date().getTime();
    a.download = filename + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }


  clearMask(): void {
    if (!this.drawingLayer) return;
    this.drawingLayer.destroyChildren();
    this.maskPolygons = [];
    this.currentPolygon = null;
    this.drawingLayer.batchDraw();
  }

  enableEraser(): void {
    this.eraserEnabled = !this.eraserEnabled;
  }

  erasePolygon(e: MouseEvent): void {
    if (!this.stage || !this.drawingLayer) return;

    const mousePos = this.stage.getPointerPosition();
    if (mousePos) {
      this.maskPolygons.forEach((polygon, index) => {
        if (this.isPointInPolygon(mousePos, polygon)) {
          polygon.destroy();
          this.maskPolygons.splice(index, 1);
        }
      });
      this.drawingLayer.batchDraw();
    }
  }


  isPointInPolygon(point: { x: number; y: number }, polygon: Konva.Line): boolean {
    const points = polygon.points();
    const x = point.x;
    const y = point.y;

    let inside = false;
    for (let i = 0, j = points.length - 2; i < points.length; j = i++) {
      const xi = points[i];
      const yi = points[i + 1];
      const xj = points[j];
      const yj = points[j + 1];

      const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

}
