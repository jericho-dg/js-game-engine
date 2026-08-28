import { create } from 'zustand';
import type { ScriptRecord } from '@js-game-engine/shared';

interface ScriptState {
  scripts: ScriptRecord[];
  activeScriptId: string | null;
  setScripts: (scripts: ScriptRecord[]) => void;
  openScript: (id: string) => void;
  createScript: () => ScriptRecord;
  updateScriptSource: (id: string, source: string) => void;
  deleteScript: (id: string) => ScriptRecord[];
  getScript: (id: string) => ScriptRecord | undefined;
}

const DEFAULT_SCRIPT_SOURCE = `export default class NewScript extends Behaviour {
  onStart() {
    Debug.log('Script started on', this.gameObject.name);
  }

  onUpdate(deltaTime: number) {
    // Your game logic here
  }
}
`;

export const useScriptStore = create<ScriptState>((set, get) => ({
  scripts: [],
  activeScriptId: null,

  setScripts: (scripts) => set({ scripts }),

  openScript: (id) => set({ activeScriptId: id }),

  createScript: () => {
    const script: ScriptRecord = {
      id: crypto.randomUUID(),
      name: 'NewScript.ts',
      source: DEFAULT_SCRIPT_SOURCE,
    };
    set((state) => ({
      scripts: [...state.scripts, script],
      activeScriptId: script.id,
    }));
    return script;
  },

  updateScriptSource: (id, source) => {
    set((state) => ({
      scripts: state.scripts.map((script) =>
        script.id === id ? { ...script, source } : script,
      ),
    }));
  },

  deleteScript: (id) => {
    const nextScripts = get().scripts.filter((script) => script.id !== id);
    set({
      scripts: nextScripts,
      activeScriptId: get().activeScriptId === id ? null : get().activeScriptId,
    });
    return nextScripts;
  },

  getScript: (id) => get().scripts.find((script) => script.id === id),
}));

export function createDefaultSpinScript(): ScriptRecord {
  return {
    id: 'script-spin-demo',
    name: 'Spin.ts',
    source: `export default class Spin extends Behaviour {
  speed = 1.5;

  onUpdate(deltaTime: number) {
    this.transform.localRotation += this.speed * deltaTime;
  }
}
`,
  };
}
