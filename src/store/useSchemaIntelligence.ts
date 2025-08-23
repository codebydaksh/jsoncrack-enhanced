import debounce from "lodash.debounce";
import { create } from "zustand";
import { SchemaAnalysisEngine } from "../lib/utils/schemaAnalysis";
import type { SchemaAnalysisResult, SchemaAnalysisConfig } from "../types/schema";
import { DEFAULT_SCHEMA_CONFIG } from "../types/schema";

interface SchemaIntelligenceState {
  // Analysis Results
  currentAnalysis: SchemaAnalysisResult | null;
  isAnalyzing: boolean;
  analysisError: string | null;
  lastAnalyzedData: string | null; // Track last analyzed data for optimization

  // Configuration
  config: SchemaAnalysisConfig;

  // UI State
  showInsights: boolean;
  selectedSuggestionId: string | null;
  appliedSuggestions: string[];
  dismissedSuggestions: string[];
  realTimeEnabled: boolean; // Control real-time analysis

  // Analysis Engine
  engine: SchemaAnalysisEngine;

  // Actions
  analyzeData: (data: any) => Promise<void>;
  analyzeDataDebounced: (data: any) => void;
  updateConfig: (config: Partial<SchemaAnalysisConfig>) => void;
  toggleInsights: () => void;
  toggleRealTime: () => void;
  selectSuggestion: (id: string | null) => void;
  applySuggestion: (id: string) => void;
  dismissSuggestion: (id: string) => void;
  clearAnalysis: () => void;
  resetSuggestionActions: () => void;
}

const useSchemaIntelligence = create<SchemaIntelligenceState>((set, get) => ({
  // Initial State
  currentAnalysis: null,
  isAnalyzing: false,
  analysisError: null,
  lastAnalyzedData: null,
  config: DEFAULT_SCHEMA_CONFIG,
  showInsights: false,
  selectedSuggestionId: null,
  appliedSuggestions: [],
  dismissedSuggestions: [],
  realTimeEnabled: true,
  engine: new SchemaAnalysisEngine(DEFAULT_SCHEMA_CONFIG),

  // Actions
  analyzeData: async (data: any) => {
    const currentDataString = JSON.stringify(data);

    // Skip analysis if data hasn't changed (optimization)
    if (get().lastAnalyzedData === currentDataString) {
      return;
    }

    // Skip analysis if data is too large (performance optimization)
    if (currentDataString.length > 500000) {
      // 500KB limit
      set({
        analysisError:
          "Data too large for real-time analysis (>500KB). Analysis skipped for performance.",
        isAnalyzing: false,
      });
      return;
    }

    set({ isAnalyzing: true, analysisError: null, lastAnalyzedData: currentDataString });

    try {
      const { engine } = get();
      const partialResult = engine.analyze(data);

      // The analysis result now includes the generated schema
      const result: SchemaAnalysisResult = {
        structure: partialResult.structure!,
        patterns: partialResult.patterns || [],
        performance: partialResult.performance || {
          memoryEstimate: 0,
          largeArrays: [],
          deepNesting: [],
          duplicateData: [],
          optimizationOpportunities: [],
        },
        suggestions: partialResult.suggestions || [],
        generatedSchema: partialResult.generatedSchema || {
          $schema: "http://json-schema.org/draft-07/schema#",
          type: "object",
        },
        timestamp: partialResult.timestamp!,
        confidence: partialResult.confidence!,
      };

      set({
        currentAnalysis: result,
        isAnalyzing: false,
        analysisError: null,
      });
    } catch (error) {
      console.error("Schema analysis failed:", error);
      set({
        isAnalyzing: false,
        analysisError: error instanceof Error ? error.message : "Analysis failed",
      });
    }
  },

  analyzeDataDebounced: debounce((data: any) => {
    const state = get();
    if (state.realTimeEnabled && state.showInsights) {
      state.analyzeData(data).catch(console.warn);
    }
  }, 1000), // 1 second debounce for real-time analysis

  updateConfig: (newConfig: Partial<SchemaAnalysisConfig>) => {
    const updatedConfig = { ...get().config, ...newConfig };
    const newEngine = new SchemaAnalysisEngine(updatedConfig);

    set({
      config: updatedConfig,
      engine: newEngine,
      // Clear last analyzed data to force re-analysis with new config
      lastAnalyzedData: null,
    });
  },

  toggleInsights: () => {
    const newShowInsights = !get().showInsights;
    set({ showInsights: newShowInsights });

    // If insights are turned off, clear the analysis to free memory
    if (!newShowInsights) {
      set({ currentAnalysis: null, lastAnalyzedData: null });
    }
  },

  toggleRealTime: () => {
    set(state => ({ realTimeEnabled: !state.realTimeEnabled }));
  },

  selectSuggestion: (id: string | null) => {
    set({ selectedSuggestionId: id });
  },

  applySuggestion: (id: string) => {
    set(state => ({
      appliedSuggestions: [...state.appliedSuggestions, id],
      selectedSuggestionId: null,
    }));
  },

  dismissSuggestion: (id: string) => {
    set(state => ({
      dismissedSuggestions: [...state.dismissedSuggestions, id],
      selectedSuggestionId: null,
    }));
  },

  clearAnalysis: () => {
    set({
      currentAnalysis: null,
      analysisError: null,
      selectedSuggestionId: null,
      lastAnalyzedData: null, // Clear cache when manually clearing
    });
  },

  resetSuggestionActions: () => {
    set({
      appliedSuggestions: [],
      dismissedSuggestions: [],
      selectedSuggestionId: null,
    });
  },
}));

export default useSchemaIntelligence;
