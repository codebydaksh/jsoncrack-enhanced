import { create } from "zustand";
import useGraph from "../features/editor/views/GraphView/stores/useGraph";
import useValidation from "./useValidation";
import usePerformanceAnalytics from "./usePerformanceAnalytics";

interface JsonActions {
  setJson: (json: string) => void;
  getJson: () => string;
  clear: () => void;
}

const initialStates = {
  json: "{}",
  loading: true,
};

export type JsonStates = typeof initialStates;

const useJson = create<JsonStates & JsonActions>()((set, get) => ({
  ...initialStates,
  getJson: () => get().json,
  setJson: json => {
    set({ json, loading: false });
    useGraph.getState().setGraph(json);
    
    // Track performance for JSON operations
    const { trackOperation } = usePerformanceAnalytics.getState();
    if (json.trim()) {
      trackOperation("setJson", json).catch(console.warn);
    }
    
    // Trigger validation if enabled
    const { isValidationEnabled, validateData } = useValidation.getState();
    if (isValidationEnabled && json.trim()) {
      validateData(json).catch(console.warn);
    }
  },
  clear: () => {
    set({ json: "", loading: false });
    useGraph.getState().clearGraph();
    
    // Clear validation when JSON is cleared
    const { clearValidation } = useValidation.getState();
    clearValidation();
  },
}));

export default useJson;
