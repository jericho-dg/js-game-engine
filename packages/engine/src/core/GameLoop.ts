export const FIXED_DELTA_TIME = 1 / 60;

export type UpdateCallback = (deltaTime: number) => void;
export type FixedUpdateCallback = (fixedDeltaTime: number) => void;
export type RenderCallback = (alpha: number) => void;

export class GameLoop {
  private running = false;
  private lastTime = 0;
  private accumulator = 0;
  private rafId = 0;

  constructor(
    private readonly onUpdate: UpdateCallback,
    private readonly onFixedUpdate: FixedUpdateCallback,
    private readonly onRender: RenderCallback,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.tick(this.lastTime);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  get isRunning(): boolean {
    return this.running;
  }

  private tick = (now: number): void => {
    if (!this.running) return;

    let deltaTime = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // Avoid spiral of death after tab backgrounding.
    if (deltaTime > 0.25) deltaTime = 0.25;

    this.accumulator += deltaTime;

    while (this.accumulator >= FIXED_DELTA_TIME) {
      this.onFixedUpdate(FIXED_DELTA_TIME);
      this.accumulator -= FIXED_DELTA_TIME;
    }

    const alpha = this.accumulator / FIXED_DELTA_TIME;
    this.onUpdate(deltaTime);
    this.onRender(alpha);

    this.rafId = requestAnimationFrame(this.tick);
  };
}
