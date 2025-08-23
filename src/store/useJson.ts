import { create } from "zustand";
import useGraph from "../features/editor/views/GraphView/stores/useGraph";
import usePerformanceAnalytics from "./usePerformanceAnalytics";
import useSchemaIntelligence from "./useSchemaIntelligence";
import useValidation from "./useValidation";

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

    // Trigger real-time schema analysis if enabled and insights are shown
    const { showInsights, analyzeData } = useSchemaIntelligence.getState();
    if (showInsights && json.trim()) {
      try {
        const parsedData = JSON.parse(json);
        analyzeData(parsedData).catch(console.warn);
      } catch (error) {
        // Invalid JSON - clear analysis
        useSchemaIntelligence.getState().clearAnalysis();
      }
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
