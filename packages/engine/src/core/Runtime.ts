import { Scene } from './Scene';
import { GameLoop } from './GameLoop';
import { Canvas2DRenderer } from '../rendering/Canvas2DRenderer';

export interface RuntimeOptions {
  scene: Scene;
  canvas: HTMLCanvasElement;
  showGrid?: boolean;
}

export class Runtime {
  readonly scene: Scene;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly renderer: Canvas2DRenderer;
  private readonly loop: GameLoop;
  private width = 0;
  private height = 0;
  private dpr = 1;

  constructor(options: RuntimeOptions) {
    this.scene = options.scene;
    this.canvas = options.canvas;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Could not acquire 2D canvas context.');
    this.ctx = ctx;
    this.renderer = new Canvas2DRenderer({ showGrid: options.showGrid ?? true });

    this.loop = new GameLoop(
      (dt) => this.scene.update(dt),
      (fixedDt) => this.scene.fixedUpdate(fixedDt),
      () => this.renderFrame(),
    );
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  start(): void {
    this.scene.start();
    this.loop.start();
  }

  stop(): void {
    this.loop.stop();
    this.scene.stop();
  }

  /** Render a single frame without running the game loop (edit mode). */
  renderOnce(): void {
    this.renderFrame();
  }

  private renderFrame(): void {
    if (this.width <= 0 || this.height <= 0) return;
    this.renderer.render(this.ctx, this.scene, this.width, this.height);
  }
}
