const IDENTIFIER_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export function sanitizeScriptClassName(name: string): string {
  let cleaned = name.trim().replace(/\.ts$/i, '');
  cleaned = cleaned.replace(/[^a-zA-Z0-9_$]/g, '');
  if (!cleaned) return 'NewScript';
  if (/^[0-9]/.test(cleaned)) cleaned = `Script${cleaned}`;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function isValidScriptClassName(name: string): boolean {
  return IDENTIFIER_PATTERN.test(name);
}

export function scriptFileName(className: string): string {
  return `${className}.ts`;
}

export function createScriptSource(className: string): string {
  const safeName = sanitizeScriptClassName(className);
  if (!isValidScriptClassName(safeName)) {
    throw new Error(`Invalid script class name: ${safeName}`);
  }
  return `export default class ${safeName} extends Behaviour {
  onStart() {
    Debug.log('Script started on', this.gameObject.name);
  }

  onUpdate(deltaTime: number) {
    // Your game logic here
  }
}
`;
}
