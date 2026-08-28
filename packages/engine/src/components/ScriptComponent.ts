import { Component } from '../core/Component';
import type { Behaviour } from '../scripting/Behaviour';

export class ScriptComponent extends Component {
  scriptAssetId: string | null = null;
  private behaviour: Behaviour | null = null;

  setBehaviour(behaviour: Behaviour): void {
    behaviour.bind(this.gameObject);
    this.behaviour = behaviour;
  }

  clearBehaviour(): void {
    this.behaviour?.onDestroy();
    this.behaviour = null;
  }

  onAwake(): void {
    this.behaviour?.onAwake();
  }

  onStart(): void {
    this.behaviour?.onStart();
  }

  onUpdate(deltaTime: number): void {
    this.behaviour?.onUpdate(deltaTime);
  }

  onFixedUpdate(fixedDeltaTime: number): void {
    this.behaviour?.onFixedUpdate(fixedDeltaTime);
  }

  onDestroy(): void {
    this.behaviour?.onDestroy();
    this.behaviour = null;
  }
}
