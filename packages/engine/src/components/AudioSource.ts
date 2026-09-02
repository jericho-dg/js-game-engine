import { Component } from '../core/Component';
import { AudioSystem } from '../audio/AudioSystem';

export class AudioSource extends Component {
  static override readonly editorDisplayName = 'Audio Source';

  audioAssetId: string | null = null;
  /** Runtime-only decoded clip; hydrated from project assets. */
  clip: AudioBuffer | null = null;

  volume = 1;
  loop = false;
  playOnAwake = true;

  private playbackId: string | null = null;

  onStart(): void {
    if (this.playOnAwake && this.clip) {
      this.play();
    }
  }

  onDestroy(): void {
    this.stop();
  }

  play(): void {
    if (!this.enabled || !this.clip) return;

    this.stop();
    this.playbackId = AudioSystem.playBuffer(this.clip, {
      volume: this.volume,
      loop: this.loop,
    });
  }

  /** Play the clip without stopping other one-shot instances. */
  playOneShot(): void {
    if (!this.enabled || !this.clip) return;

    AudioSystem.playBuffer(this.clip, {
      volume: this.volume,
      loop: false,
    });
  }

  stop(): void {
    if (!this.playbackId) return;
    AudioSystem.stop(this.playbackId);
    this.playbackId = null;
  }

  get isPlaying(): boolean {
    return this.playbackId !== null;
  }
}
