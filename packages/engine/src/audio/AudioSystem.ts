let context: AudioContext | null = null;

interface ActivePlayback {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

const activePlaybacks = new Map<string, ActivePlayback>();

export const AudioSystem = {
  async ensureContext(): Promise<AudioContext> {
    if (!context) {
      context = new AudioContext();
    }
    if (context.state === 'suspended') {
      await context.resume();
    }
    return context;
  },

  async decodeBlob(blob: Blob): Promise<AudioBuffer> {
    const audioContext = await this.ensureContext();
    const arrayBuffer = await blob.arrayBuffer();
    return audioContext.decodeAudioData(arrayBuffer);
  },

  playBuffer(
    buffer: AudioBuffer,
    options: { volume: number; loop: boolean },
  ): string {
    if (!context) {
      throw new Error('AudioContext is not initialized. Call ensureContext() first.');
    }

    const id = crypto.randomUUID();
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = options.loop;

    const gain = context.createGain();
    gain.gain.value = Math.max(0, options.volume);

    source.connect(gain);
    gain.connect(context.destination);

    source.onended = () => {
      activePlaybacks.delete(id);
    };

    source.start();
    activePlaybacks.set(id, { source, gain });
    return id;
  },

  stop(playbackId: string): void {
    const playback = activePlaybacks.get(playbackId);
    if (!playback) return;

    try {
      playback.source.stop();
    } catch {
      // Already stopped.
    }
    playback.source.disconnect();
    playback.gain.disconnect();
    activePlaybacks.delete(playbackId);
  },

  stopAll(): void {
    for (const id of [...activePlaybacks.keys()]) {
      this.stop(id);
    }
  },

  /** @internal Test helper */
  reset(): void {
    this.stopAll();
    if (context) {
      void context.close();
      context = null;
    }
  },
};
