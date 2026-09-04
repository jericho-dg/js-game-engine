function createWavBlob(
  sampleRate: number,
  durationSeconds: number,
  sampleAt: (t: number) => number,
): Blob {
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
    const sample = sampleAt(t);
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 2, clamped * 32767, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export function createFlapSoundWav(): Blob {
  return createWavBlob(44100, 0.12, (t) => {
    const frequency = 640 * Math.exp(-t * 22);
    const envelope = Math.exp(-t * 20);
    return Math.sin(2 * Math.PI * frequency * t) * envelope * 0.35;
  });
}

export function createScoreSoundWav(): Blob {
  return createWavBlob(44100, 0.1, (t) => {
    const frequency = 880;
    const envelope = Math.exp(-t * 28);
    return Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
  });
}

export function createHitSoundWav(): Blob {
  return createWavBlob(44100, 0.25, (t) => {
    const noise = Math.sin(t * 9400) * Math.sin(t * 6200);
    const envelope = Math.exp(-t * 10);
    return noise * envelope * 0.55;
  });
}

export interface FlappySoundAssetIds {
  flap: string;
  score: string;
  hit: string;
}

export function createFlappySoundAssetIds(): FlappySoundAssetIds {
  return {
    flap: crypto.randomUUID(),
    score: crypto.randomUUID(),
    hit: crypto.randomUUID(),
  };
}
