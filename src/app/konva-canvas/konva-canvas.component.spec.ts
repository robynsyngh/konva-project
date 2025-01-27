import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KonvaCanvasComponent } from './konva-canvas.component';

describe('KonvaCanvasComponent', () => {
  let component: KonvaCanvasComponent;
  let fixture: ComponentFixture<KonvaCanvasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KonvaCanvasComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(KonvaCanvasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
