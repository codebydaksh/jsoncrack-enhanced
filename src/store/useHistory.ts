import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

interface HistoryState {
  past: string[];
  present: string;
  future: string[];
  maxHistorySize: number;
  canUndo: boolean;
  canRedo: boolean;
}

interface HistoryActions {
  pushToHistory: (newState: string) => void;
  undo: () => string | null;
  redo: () => string | null;
  clearHistory: () => void;
  setMaxHistorySize: (size: number) => void;
  initializeHistory: (initialState: string) => void;
}

const MAX_HISTORY_SIZE = 50;

const useHistory = create<HistoryState & HistoryActions>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    past: [],
    present: "{}",
    future: [],
    maxHistorySize: MAX_HISTORY_SIZE,
    canUndo: false,
    canRedo: false,

    // Actions
    pushToHistory: (newState: string) => {
      const { past, present, maxHistorySize } = get();
      
      // Don't add to history if the new state is the same as current
      if (newState === present) return;
      
      // Don't add empty states or invalid JSON to history
      try {
        JSON.parse(newState);
      } catch {
        return;
      }

      const newPast = [...past, present];
      
      // Limit history size
      if (newPast.length > maxHistorySize) {
        newPast.shift(); // Remove oldest entry
      }

      set({
        past: newPast,
        present: newState,
        future: [], // Clear future when new action is performed
        canUndo: newPast.length > 0,
        canRedo: false,
      });
    },

    undo: () => {
      const { past, present, future } = get();
      
      if (past.length === 0) return null;

      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);
      const newFuture = [present, ...future];

      set({
        past: newPast,
        present: previous,
        future: newFuture,
        canUndo: newPast.length > 0,
        canRedo: true,
      });

      return previous;
    },

    redo: () => {
      const { past, present, future } = get();
      
      if (future.length === 0) return null;

      const next = future[0];
      const newFuture = future.slice(1);
      const newPast = [...past, present];

      set({
        past: newPast,
        present: next,
        future: newFuture,
        canUndo: true,
        canRedo: newFuture.length > 0,
      });

      return next;
    },

    clearHistory: () => {
      set({
        past: [],
        present: "{}",
        future: [],
        canUndo: false,
        canRedo: false,
      });
    },

    setMaxHistorySize: (size: number) => {
      const { past } = get();
      const newPast = past.slice(-size); // Keep only the last 'size' entries
      
      set({
        maxHistorySize: size,
        past: newPast,
        canUndo: newPast.length > 0,
      });
    },

    initializeHistory: (initialState: string) => {
      // Initialize history with the given state without triggering change events
      try {
        JSON.parse(initialState);
        set({
          past: [],
          present: initialState,
          future: [],
          canUndo: false,
          canRedo: false,
        });
      } catch {
        // Invalid JSON, don't initialize
      }
    },
  }))
);

export default useHistory;