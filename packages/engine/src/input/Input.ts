/** Simple keyboard input state — updated by the editor during play mode. */
export class Input {
  private static keys = new Map<string, boolean>();

  static getKey(key: string): boolean {
    return Input.keys.get(key) ?? false;
  }

  static getAxis(axis: 'Horizontal' | 'Vertical'): number {
    if (axis === 'Horizontal') {
      const right = Input.getKey('ArrowRight') || Input.getKey('d') || Input.getKey('D') ? 1 : 0;
      const left = Input.getKey('ArrowLeft') || Input.getKey('a') || Input.getKey('A') ? 1 : 0;
      return right - left;
    }
    const up = Input.getKey('ArrowUp') || Input.getKey('w') || Input.getKey('W') ? 1 : 0;
    const down = Input.getKey('ArrowDown') || Input.getKey('s') || Input.getKey('S') ? 1 : 0;
    return up - down;
  }

  static _setKey(key: string, down: boolean): void {
    Input.keys.set(key, down);
  }

  static _clear(): void {
    Input.keys.clear();
  }
}

export class Time {
  static deltaTime = 0;
}

export type LogCallback = (level: 'log' | 'warn' | 'error', message: string) => void;

export class Debug {
  private static logCallback: LogCallback | null = null;

  static setLogCallback(callback: LogCallback | null): void {
    Debug.logCallback = callback;
  }

  static log(...args: unknown[]): void {
    Debug.emit('log', args);
  }

  static warn(...args: unknown[]): void {
    Debug.emit('warn', args);
  }

  static error(...args: unknown[]): void {
    Debug.emit('error', args);
  }

  private static emit(level: 'log' | 'warn' | 'error', args: unknown[]): void {
    const message = args.map(formatLogArg).join(' ');
    Debug.logCallback?.(level, message);
  }
}

function formatLogArg(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
