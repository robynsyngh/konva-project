import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnInit } from '@angular/core';
import Konva from 'konva';

@Component({
  selector: 'app-konva-canvas',
  standalone: true,
  imports: [CommonModule],
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
  error_msg: string | null = null;
  constructor() { }

  ngOnInit(): void {
    this.updateStageSize();
    window.addEventListener('resize', this.updateStageSize.bind(this)); // Update canvas on window resize
  }

  updateStageSize(): void {
    if (!this.stage || !this.drawingLayer || !this.backgroundLayer) return;
    // Resize stage and layers based on window size
    this.stage.width(window.innerWidth);
    this.stage.height(window.innerHeight);
    this.backgroundLayer.batchDraw();
    this.drawingLayer.batchDraw();
  }

  ngAfterViewInit(): void {
    this.initializeCanvas(); // Initialize Konva canvas after view is loaded
  }

  initializeCanvas(): void {
    // Initialize stage and layers for the canvas
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

    // Ensure the drawing layer is on top and the background is below it
    this.drawingLayer.zIndex(1);  // Make drawing layer appear on top
    this.backgroundLayer.zIndex(0); // Keep background below the drawing layer
    this.stage.batchDraw(); // Redraw the stage to apply layer order changes

    this.setupEventListeners(); // Set up event listeners
  }

  // Handle image upload and display it on the canvas
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

          // Scale image to fit canvas and add to background layer
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

          this.backgroundLayer.destroyChildren(); // Clear existing background
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
      this.backgroundLayer.destroyChildren(); // Remove background image
      this.backgroundLayer.batchDraw();
      this.file = null;
    }
  }

  setupEventListeners(): void {
    if (!this.stage) return;
    const canvas = this.stage.container();

    // Handle click events for drawing or erasing polygons
    canvas.addEventListener('click', (e) => {
      if (this.eraserEnabled) {
        this.erasePolygon(e); // Erase polygon if eraser is enabled
      } else {
        this.drawPolygon(e); // Draw new polygon
      }
    });

    // Close polygon on pressing "n" key
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
      // Start new polygon
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
      // Add points to existing polygon
      const points = this.currentPolygon.points() || [];
      points.push(mousePos.x, mousePos.y);
      this.currentPolygon.points(points);
    }
    this.drawingLayer.batchDraw();
  }

  closePolygon(): void {
    if (this.currentPolygon) {
      this.currentPolygon.closed(true); // Close the polygon
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
      this.error_msg = 'Nothing to export'
      // return alert('Nothing to export');
      return;
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
    this.drawingLayer.destroyChildren(); // Clear the drawing layer
    this.maskPolygons = [];
    this.currentPolygon = null;
    this.eraserEnabled = false;
    this.drawingLayer.batchDraw();
  }

  enableEraser(): void {
    this.eraserEnabled = !this.eraserEnabled; // Toggle eraser mode
  }

  erasePolygon(e: MouseEvent): void {
    if (!this.stage || !this.drawingLayer) return;

    const mousePos = this.stage.getPointerPosition();
    if (mousePos) {
      this.maskPolygons.forEach((polygon, index) => {
        if (this.isPointInPolygon(mousePos, polygon)) {
          polygon.destroy(); // Remove polygon if point is inside it
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

  saveCanvasAsBinary(): void {
    if (!this.stage || !this.drawingLayer) {
      console.error('Stage or layers are not initialized.');
      return;
    }

    // Create a new canvas for the binary mask
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = this.stage.width();
    canvas.height = this.stage.height();

    // Fill the canvas with white background (0)
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Loop through all polygons and draw them in black (1)
    this.maskPolygons.forEach(polygon => {
      const points = polygon.points();
      if (points.length < 6) return; // Skip if the polygon is too small (not a valid polygon)

      ctx.beginPath();
      ctx.moveTo(points[0], points[1]);

      for (let i = 2; i < points.length; i += 2) {
        ctx.lineTo(points[i], points[i + 1]);
      }

      ctx.closePath();
      ctx.fillStyle = 'black';  // Draw polygon as black (1)
      ctx.fill();
    });

    // Convert the canvas content to a data URL and download it as PNG
    const dataURL = canvas.toDataURL('image/png');
    this.downloadURI(dataURL, 'binary_mask.png');
  }

  downloadURI(uri: string, name: string): void {
    const link = document.createElement('a');
    link.download = name;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }




}
