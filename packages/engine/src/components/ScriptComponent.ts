import { Component } from '../core/Component';
import { Debug } from '../input/Input';
import type { Behaviour } from '../scripting/Behaviour';

function runBehaviourMethod(
  component: ScriptComponent,
  scriptName: string,
  phase: string,
  fn: () => void,
): void {
  try {
    fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    Debug.error(`${component.gameObject.name} / ${scriptName} (${phase}): ${message}`);
  }
}

export class ScriptComponent extends Component {
  scriptAssetId: string | null = null;
  private behaviour: Behaviour | null = null;
  runtimeScriptName = 'Script';

  setBehaviour(behaviour: Behaviour, scriptName = 'Script'): void {
    if (typeof behaviour.bind === 'function') {
      behaviour.bind(this.gameObject);
    } else {
      behaviour.gameObject = this.gameObject;
      behaviour.transform = this.gameObject.transform;
    }
    this.behaviour = behaviour;
    this.runtimeScriptName = scriptName;
  }

  clearBehaviour(): void {
    if (this.behaviour) {
      runBehaviourMethod(this, this.runtimeScriptName, 'onDestroy', () => {
        this.behaviour?.onDestroy();
      });
    }
    this.behaviour = null;
  }

  onAwake(): void {
    if (!this.behaviour) return;
    runBehaviourMethod(this, this.runtimeScriptName, 'onAwake', () => {
      this.behaviour?.onAwake();
    });
  }

  onStart(): void {
    if (!this.behaviour) return;
    runBehaviourMethod(this, this.runtimeScriptName, 'onStart', () => {
      this.behaviour?.onStart();
    });
  }

  onUpdate(deltaTime: number): void {
    if (!this.behaviour) return;
    runBehaviourMethod(this, this.runtimeScriptName, 'onUpdate', () => {
      this.behaviour?.onUpdate(deltaTime);
    });
  }

  onFixedUpdate(fixedDeltaTime: number): void {
    if (!this.behaviour) return;
    runBehaviourMethod(this, this.runtimeScriptName, 'onFixedUpdate', () => {
      this.behaviour?.onFixedUpdate(fixedDeltaTime);
    });
  }

  onDestroy(): void {
    this.clearBehaviour();
  }
}
