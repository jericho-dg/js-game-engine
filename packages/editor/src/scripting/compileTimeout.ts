const COMPILE_TIMEOUT_MS = 15000;

export class CompileTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CompileTimeoutError';
  }
}

export function isCompileTimeoutError(error: unknown): boolean {
  return error instanceof CompileTimeoutError;
}

export async function withCompileTimeout<T>(
  task: () => Promise<T>,
  message = 'Script compilation timed out.',
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      task(),
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new CompileTimeoutError(message)),
          COMPILE_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}
