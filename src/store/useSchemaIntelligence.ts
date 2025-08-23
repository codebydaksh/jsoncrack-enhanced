import { create } from "zustand";
import { SchemaAnalysisEngine } from "../lib/utils/schemaAnalysis";
import type { SchemaAnalysisResult, SchemaAnalysisConfig } from "../types/schema";
import { DEFAULT_SCHEMA_CONFIG } from "../types/schema";

interface SchemaIntelligenceState {
  // Analysis Results
  currentAnalysis: SchemaAnalysisResult | null;
  isAnalyzing: boolean;
  analysisError: string | null;

  // Configuration
  config: SchemaAnalysisConfig;

  // UI State
  showInsights: boolean;
  selectedSuggestionId: string | null;
  appliedSuggestions: string[];
  dismissedSuggestions: string[];

  // Analysis Engine
  engine: SchemaAnalysisEngine;

  // Actions
  analyzeData: (data: any) => Promise<void>;
  updateConfig: (config: Partial<SchemaAnalysisConfig>) => void;
  toggleInsights: () => void;
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
  config: DEFAULT_SCHEMA_CONFIG,
  showInsights: false,
  selectedSuggestionId: null,
  appliedSuggestions: [],
  dismissedSuggestions: [],
  engine: new SchemaAnalysisEngine(DEFAULT_SCHEMA_CONFIG),

  // Actions
  analyzeData: async (data: any) => {
    set({ isAnalyzing: true, analysisError: null });

    try {
      const { engine } = get();
      const partialResult = engine.analyze(data);

      // Now we have complete analysis including suggestions
      const result: SchemaAnalysisResult = {
        structure: partialResult.structure!,
        patterns: partialResult.patterns || [], // Populated from pattern detection
        performance: partialResult.performance || {
          // Populated from performance analysis
          memoryEstimate: 0,
          largeArrays: [],
          deepNesting: [],
          duplicateData: [],
          optimizationOpportunities: [],
        },
        suggestions: partialResult.suggestions || [], // Populated from suggestion generation
        generatedSchema: {
          // Will be enhanced in Task 7
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

  updateConfig: (newConfig: Partial<SchemaAnalysisConfig>) => {
    const updatedConfig = { ...get().config, ...newConfig };
    const newEngine = new SchemaAnalysisEngine(updatedConfig);

    set({
      config: updatedConfig,
      engine: newEngine,
    });
  },

  toggleInsights: () => {
    set(state => ({ showInsights: !state.showInsights }));
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
