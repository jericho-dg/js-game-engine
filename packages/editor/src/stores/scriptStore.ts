import { create } from 'zustand';
import type { ScriptRecord } from '@js-game-engine/shared';
import {
  createScriptSource,
  scriptFileName,
  sanitizeScriptClassName,
} from '../scripting/scriptNaming';
import { validateAndCompileScript, collectSceneScriptIds } from '../scripting/validateScripts';
import {
  clearCompiledScripts,
  getPlayReadyScriptClass,
  unregisterCompiledScript,
} from '../scripting/scriptCompileRegistry';
import { useConsoleStore } from './consoleStore';

interface ScriptState {
  scripts: ScriptRecord[];
  drafts: Record<string, string>;
  scriptErrors: Record<string, string | null>;
  activeScriptId: string | null;
  isNewScriptDialogOpen: boolean;
  isSavingScript: boolean;
  isCompilingScripts: boolean;
  setScripts: (scripts: ScriptRecord[]) => void;
  openScript: (id: string) => void;
  openNewScriptDialog: () => void;
  closeNewScriptDialog: () => void;
  createScript: (className: string) => ScriptRecord;
  setDraft: (id: string, source: string) => void;
  getEditorSource: (id: string) => string;
  isDirty: (id: string) => boolean;
  hasUnsavedScripts: () => boolean;
  isScriptPlayReady: (script: ScriptRecord) => boolean;
  saveScript: (id: string) => Promise<boolean>;
  compileAllSavedScripts: () => Promise<void>;
  ensureScriptsCompiledForScene: (scene: import('@js-game-engine/engine').Scene) => Promise<void>;
  deleteScript: (id: string) => ScriptRecord[];
  getScript: (id: string) => ScriptRecord | undefined;
}

export const useScriptStore = create<ScriptState>((set, get) => ({
  scripts: [],
  drafts: {},
  scriptErrors: {},
  activeScriptId: null,
  isNewScriptDialogOpen: false,
  isSavingScript: false,
  isCompilingScripts: false,

  setScripts: (scripts) => {
    clearCompiledScripts();
    set({
      scripts,
      drafts: {},
      scriptErrors: Object.fromEntries(scripts.map((script) => [script.id, null])),
    });
  },

  openScript: (id) => set({ activeScriptId: id }),

  openNewScriptDialog: () => set({ isNewScriptDialogOpen: true }),

  closeNewScriptDialog: () => set({ isNewScriptDialogOpen: false }),

  createScript: (className) => {
    const safeName = sanitizeScriptClassName(className);
    const script: ScriptRecord = {
      id: crypto.randomUUID(),
      name: scriptFileName(safeName),
      source: createScriptSource(safeName),
    };
    set((state) => ({
      scripts: [...state.scripts, script],
      activeScriptId: script.id,
      isNewScriptDialogOpen: false,
      scriptErrors: { ...state.scriptErrors, [script.id]: null },
    }));
    void validateAndCompileScript(script).then((error) => {
      set((state) => ({
        scriptErrors: { ...state.scriptErrors, [script.id]: error },
      }));
    });
    return script;
  },

  setDraft: (id, source) => {
    set((state) => ({
      drafts: { ...state.drafts, [id]: source },
    }));
  },

  getEditorSource: (id) => {
    const script = get().scripts.find((entry) => entry.id === id);
    if (!script) return '';
    return get().drafts[id] ?? script.source;
  },

  isDirty: (id) => {
    const script = get().scripts.find((entry) => entry.id === id);
    if (!script) return false;
    return get().getEditorSource(id) !== script.source;
  },

  hasUnsavedScripts: () => get().scripts.some((script) => get().isDirty(script.id)),

  isScriptPlayReady: (script) =>
    getPlayReadyScriptClass(script.id, script.source) !== null,

  saveScript: async (id) => {
    const script = get().scripts.find((entry) => entry.id === id);
    if (!script) return false;

    const source = get().getEditorSource(id);
    const record: ScriptRecord = { ...script, source };

    set({ isSavingScript: true });
    try {
      const error = await validateAndCompileScript(record);
      if (error) {
        set((state) => ({
          scriptErrors: { ...state.scriptErrors, [id]: error },
        }));
        useConsoleStore.getState().log('error', `[Compile] ${script.name}: ${error}`);
        return false;
      }

      set((state) => {
        const { [id]: _removed, ...remainingDrafts } = state.drafts;
        return {
          scripts: state.scripts.map((entry) =>
            entry.id === id ? { ...entry, source } : entry,
          ),
          drafts: remainingDrafts,
          scriptErrors: { ...state.scriptErrors, [id]: null },
        };
      });
      useConsoleStore.getState().log('log', `Saved ${script.name}`);
      return true;
    } finally {
      set({ isSavingScript: false });
    }
  },

  compileAllSavedScripts: async () => {
    if (get().isCompilingScripts) return;

    set({ isCompilingScripts: true });
    const scripts = get().scripts;
    const errors: Record<string, string | null> = { ...get().scriptErrors };

    try {
      for (const script of scripts) {
        const error = await validateAndCompileScript(script);
        errors[script.id] = error;
        if (error) {
          useConsoleStore.getState().log('error', `[Compile] ${script.name}: ${error}`);
        }
      }
      set({ scriptErrors: errors });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      useConsoleStore.getState().log('error', `[Compile] ${message}`);
    } finally {
      set({ isCompilingScripts: false });
    }
  },

  ensureScriptsCompiledForScene: async (scene) => {
    if (get().isCompilingScripts) {
      await new Promise<void>((resolve) => {
        if (!useScriptStore.getState().isCompilingScripts) {
          resolve();
          return;
        }

        const unsubscribe = useScriptStore.subscribe((state) => {
          if (!state.isCompilingScripts) {
            unsubscribe();
            resolve();
          }
        });
      });
    }

    const scripts = get().scripts;
    const scriptMap = new Map(scripts.map((script) => [script.id, script]));
    const pending = collectSceneScriptIds(scene)
      .map((scriptId) => scriptMap.get(scriptId))
      .filter((script): script is ScriptRecord => {
        if (!script) return false;
        if (get().isDirty(script.id)) return false;
        return !get().isScriptPlayReady(script);
      });

    if (pending.length === 0) return;

    set({ isCompilingScripts: true });
    const errors: Record<string, string | null> = { ...get().scriptErrors };

    try {
      for (const script of pending) {
        const error = await validateAndCompileScript(script);
        errors[script.id] = error;
        if (error) {
          useConsoleStore.getState().log('error', `[Compile] ${script.name}: ${error}`);
        }
      }
      set({ scriptErrors: errors });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      useConsoleStore.getState().log('error', `[Compile] ${message}`);
    } finally {
      set({ isCompilingScripts: false });
    }
  },

  deleteScript: (id) => {
    unregisterCompiledScript(id);
    const nextScripts = get().scripts.filter((script) => script.id !== id);
    set((state) => {
      const { [id]: _draft, ...drafts } = state.drafts;
      const { [id]: _error, ...scriptErrors } = state.scriptErrors;
      return {
        scripts: nextScripts,
        drafts,
        scriptErrors,
        activeScriptId: state.activeScriptId === id ? null : state.activeScriptId,
      };
    });
    return nextScripts;
  },

  getScript: (id) => get().scripts.find((script) => script.id === id),
}));

export function createDefaultPlayerMoveScript(): ScriptRecord {
  return {
    id: 'script-player-move-demo',
    name: scriptFileName('PlayerMove'),
    source: `export default class PlayerMove extends Behaviour {
  moveSpeed = 200;
  jumpSpeed = 350;
  body = null;

  onStart() {
    this.body = this.getRigidbody2D();
  }

  onFixedUpdate() {
    if (!this.body) return;
    this.body.velocity.x = Input.getAxis('Horizontal') * this.moveSpeed;

    if (Input.getKey(' ') && Math.abs(this.body.velocity.y) < 1) {
      this.body.velocity.y = this.jumpSpeed;
    }
  }

  onCollisionEnter(collision) {
    Debug.log('Collided with', collision.gameObject.name);
  }

  onTriggerEnter(collision) {
    Debug.log('Trigger entered', collision.gameObject.name);
  }
}
`,
  };
}

/** @deprecated Use createDefaultPlayerMoveScript */
export function createDefaultSpinScript(): ScriptRecord {
  return createDefaultPlayerMoveScript();
}
