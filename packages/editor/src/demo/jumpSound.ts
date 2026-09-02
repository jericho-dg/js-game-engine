/** Generates a short synthesized jump sound as a WAV blob. */
export function createJumpSoundWav(): Blob {
  const sampleRate = 44100;
  const durationSeconds = 0.18;
  const sampleCount = Math.floor(sampleRate * durationSeconds);
  const dataSize = sampleCount * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / sampleRate;
    const frequency = 520 * Math.exp(-t * 18);
    const envelope = Math.exp(-t * 14);
    const sample = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.45;
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 2, clamped * 32767, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export const JUMP_SFX_ASSET_ID = 'asset-jump-sfx-demo';
