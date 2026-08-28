export class Color {
  constructor(
    public r = 1,
    public g = 1,
    public b = 1,
    public a = 1,
  ) {}

  toCss(): string {
    const r = Math.round(this.r * 255);
    const g = Math.round(this.g * 255);
    const b = Math.round(this.b * 255);
    return this.a < 1 ? `rgba(${r}, ${g}, ${b}, ${this.a})` : `rgb(${r}, ${g}, ${b})`;
  }

  static fromHex(hex: string): Color {
    const normalized = hex.replace('#', '');
    const value =
      normalized.length === 3
        ? normalized
            .split('')
            .map((c) => c + c)
            .join('')
        : normalized;
    const num = parseInt(value, 16);
    return new Color(
      ((num >> 16) & 255) / 255,
      ((num >> 8) & 255) / 255,
      (num & 255) / 255,
      1,
    );
  }

  static white(): Color {
    return new Color(1, 1, 1, 1);
  }
}
