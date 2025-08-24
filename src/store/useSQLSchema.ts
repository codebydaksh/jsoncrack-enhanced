import { create } from "zustand";

export enum DatabaseType {
  PostgreSQL = "postgresql",
  MySQL = "mysql", 
  SQLServer = "sqlserver",
  SQLite = "sqlite",
}

export enum NormalizationLevel {
  First = "1NF",
  Second = "2NF", 
  Third = "3NF",
  Denormalized = "denormalized",
}

export enum NamingConvention {
  CamelCase = "camelCase",
  SnakeCase = "snake_case",
  PascalCase = "PascalCase",
  KebabCase = "kebab-case",
}

export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  primaryKey?: string;
  foreignKeys?: ForeignKeySchema[];
  indexes?: IndexSchema[];
}

export interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  constraints?: string[];
  comment?: string;
}

export interface ForeignKeySchema {
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
  onDelete?: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
  onUpdate?: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
}

export interface IndexSchema {
  name: string;
  columns: string[];
  unique: boolean;
  type?: "BTREE" | "HASH" | "GIN" | "GIST";
}

export interface SchemaAnalysisResult {
  tables: TableSchema[];
  relationships: RelationshipInfo[];
  recommendations: SchemaRecommendation[];
  migrationScript: string;
  estimatedPerformance: PerformanceMetrics;
}

export interface RelationshipInfo {
  sourceTable: string;
  targetTable: string;
  relationshipType: "ONE_TO_ONE" | "ONE_TO_MANY" | "MANY_TO_MANY";
  foreignKeyColumn: string;
  junctionTable?: string;
  onDelete?: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
  onUpdate?: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
}

export interface SchemaRecommendation {
  type: "INDEX" | "CONSTRAINT" | "NORMALIZATION" | "PERFORMANCE";
  severity: "LOW" | "MEDIUM" | "HIGH";
  message: string;
  suggestedAction: string;
  impact: string;
}

export interface PerformanceMetrics {
  estimatedSize: string;
  queryComplexity: "LOW" | "MEDIUM" | "HIGH";
  indexEfficiency: number;
  normalizationScore: number;
}

export interface SQLSchemaConfig {
  databaseType: DatabaseType;
  normalizationLevel: NormalizationLevel;
  namingConvention: NamingConvention;
  includeIndexes: boolean;
  includeForeignKeys: boolean;
  includeConstraints: boolean;
  tablePrefix: string;
  generateMigration: boolean;
  optimizeForPerformance: boolean;
}

interface SQLSchemaState {
  config: SQLSchemaConfig;
  analysisResult: SchemaAnalysisResult | null;
  generatedSQL: string;
  isGenerating: boolean;
  error: string | null;
  previewMode: "TABLES" | "RELATIONSHIPS" | "SQL";
  selectedTable: string | null;
}

interface SQLSchemaActions {
  setConfig: (config: Partial<SQLSchemaConfig>) => void;
  setAnalysisResult: (result: SchemaAnalysisResult) => void;
  setGeneratedSQL: (sql: string) => void;
  setIsGenerating: (generating: boolean) => void;
  setError: (error: string | null) => void;
  setPreviewMode: (mode: "TABLES" | "RELATIONSHIPS" | "SQL") => void;
  setSelectedTable: (table: string | null) => void;
  generateSchema: (jsonData: string) => Promise<void>;
  exportSQL: () => void;
  clear: () => void;
}

const initialConfig: SQLSchemaConfig = {
  databaseType: DatabaseType.PostgreSQL,
  normalizationLevel: NormalizationLevel.Third,
  namingConvention: NamingConvention.SnakeCase,
  includeIndexes: true,
  includeForeignKeys: true,
  includeConstraints: true,
  tablePrefix: "",
  generateMigration: true,
  optimizeForPerformance: true,
};

const initialState: SQLSchemaState = {
  config: initialConfig,
  analysisResult: null,
  generatedSQL: "",
  isGenerating: false,
  error: null,
  previewMode: "TABLES",
  selectedTable: null,
};

const useSQLSchema = create<SQLSchemaState & SQLSchemaActions>()((set, get) => ({
  ...initialState,
  
  setConfig: (configUpdate) =>
    set((state) => ({
      config: { ...state.config, ...configUpdate },
      error: null, // Clear errors when config changes
    })),

  setAnalysisResult: (result) =>
    set({ analysisResult: result, error: null }),

  setGeneratedSQL: (sql) =>
    set({ generatedSQL: sql, error: null }),

  setIsGenerating: (generating) =>
    set({ isGenerating: generating }),

  setError: (error) =>
    set({ error, isGenerating: false }),

  setPreviewMode: (mode) =>
    set({ previewMode: mode }),

  setSelectedTable: (table) =>
    set({ selectedTable: table }),

  generateSchema: async (jsonData: string) => {
    const { config, setIsGenerating, setError, setAnalysisResult, setGeneratedSQL } = get();
    
    setIsGenerating(true);
    setError(null);

    try {
      // Import the schema analysis utilities
      const { analyzeJSONStructure } = await import("../lib/utils/sqlSchemaAnalysis");
      const { generateSQLSchema } = await import("../lib/utils/sqlSchemaGeneration");
      
      // Parse JSON data
      const parsedData = JSON.parse(jsonData);
      
      // Analyze the JSON structure
      const analysisResult = await analyzeJSONStructure(parsedData, config);
      
      // Generate SQL schema
      const sql = await generateSQLSchema(analysisResult, config);
      
      setAnalysisResult(analysisResult);
      setGeneratedSQL(sql);
    } catch (error) {
      console.error("Schema generation failed:", error);
      setError(error instanceof Error ? error.message : "Schema generation failed");
    } finally {
      setIsGenerating(false);
    }
  },

  exportSQL: () => {
    const { generatedSQL, config } = get();
    if (!generatedSQL) return;

    const blob = new Blob([generatedSQL], { type: "text/sql" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `schema_${config.databaseType}.sql`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  clear: () =>
    set({
      analysisResult: null,
      generatedSQL: "",
      error: null,
      selectedTable: null,
      isGenerating: false,
    }),
}));

export default useSQLSchema;