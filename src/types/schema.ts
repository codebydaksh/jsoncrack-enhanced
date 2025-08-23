// Schema Intelligence Types

export interface SchemaAnalysisResult {
  structure: StructureAnalysis;
  patterns: PatternAnalysis[];
  performance: PerformanceAnalysis;
  suggestions: SchemaSuggestion[];
  generatedSchema: JSONSchema;
  timestamp: number;
  confidence: number;
}

export interface StructureAnalysis {
  totalNodes: number;
  maxDepth: number;
  fieldTypes: Record<string, FieldTypeInfo>;
  duplicateKeys: string[];
  missingFields: string[];
  inconsistentTypes: TypeInconsistency[];
}

export interface FieldTypeInfo {
  path: string;
  detectedType: JSONType;
  occurrences: number;
  examples: any[];
  patterns: string[];
  nullable: boolean;
  optional: boolean;
}

export interface PatternAnalysis {
  field: string;
  pattern: PatternType;
  confidence: number;
  examples: string[];
  suggestion: string;
  validationRule?: string;
}

export interface PerformanceAnalysis {
  memoryEstimate: number;
  largeArrays: LargeArrayInfo[];
  deepNesting: DeepNestingInfo[];
  duplicateData: DuplicateDataInfo[];
  optimizationOpportunities: OptimizationSuggestion[];
}

export interface SchemaSuggestion {
  id: string;
  category: SuggestionCategory;
  severity: SuggestionSeverity;
  title: string;
  description: string;
  field?: string;
  currentValue?: any;
  suggestedValue?: any;
  action: SuggestionAction;
  confidence: number;
  impact: ImpactLevel;
}

export interface JSONSchema {
  $schema: string;
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  additionalProperties?: boolean;
  items?: JSONSchema;
  format?: string;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  enum?: any[];
}

export interface TypeInconsistency {
  field: string;
  types: JSONType[];
  occurrences: Record<JSONType, number>;
  examples: Record<JSONType, any[]>;
}

export interface LargeArrayInfo {
  path: string;
  size: number;
  itemType: JSONType;
  memoryImpact: number;
  suggestion: string;
}

export interface DeepNestingInfo {
  path: string;
  depth: number;
  complexity: number;
  suggestion: string;
}

export interface DuplicateDataInfo {
  paths: string[];
  value: any;
  occurrences: number;
  memoryWaste: number;
  suggestion: string;
}

export interface OptimizationSuggestion {
  type: OptimizationType;
  description: string;
  impact: ImpactLevel;
  implementation: string;
}

// Enums
export enum JSONType {
  STRING = "string",
  NUMBER = "number",
  BOOLEAN = "boolean",
  OBJECT = "object",
  ARRAY = "array",
  NULL = "null",
  UNDEFINED = "undefined",
}

export enum PatternType {
  UUID = "uuid",
  EMAIL = "email",
  URL = "url",
  DATE = "date",
  DATETIME = "datetime",
  PHONE = "phone",
  IP_ADDRESS = "ip_address",
  ENUM = "enum",
  REGEX = "regex",
  BASE64 = "base64",
  JSON = "json",
  COORDINATE = "coordinate",
  COLOR = "color",
  CURRENCY = "currency",
}

export enum SuggestionCategory {
  TYPE_SAFETY = "type_safety",
  PERFORMANCE = "performance",
  VALIDATION = "validation",
  STRUCTURE = "structure",
  NAMING = "naming",
  SECURITY = "security",
}

export enum SuggestionSeverity {
  CRITICAL = "critical",
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
  INFO = "info",
}

export enum SuggestionAction {
  APPLY = "apply",
  REVIEW = "review",
  DISMISS = "dismiss",
  LEARN_MORE = "learn_more",
}

export enum ImpactLevel {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

export enum OptimizationType {
  FLATTEN_OBJECT = "flatten_object",
  REDUCE_DUPLICATION = "reduce_duplication",
  OPTIMIZE_ARRAYS = "optimize_arrays",
  IMPROVE_TYPES = "improve_types",
  ADD_VALIDATION = "add_validation",
}

// Configuration
export interface SchemaAnalysisConfig {
  maxDepthWarning: number;
  largeArrayThreshold: number;
  memoryWarningThreshold: number;
  patternConfidenceThreshold: number;
  enablePatternDetection: boolean;
  enablePerformanceAnalysis: boolean;
  enableSuggestions: boolean;
}

export const DEFAULT_SCHEMA_CONFIG: SchemaAnalysisConfig = {
  maxDepthWarning: 8,
  largeArrayThreshold: 1000,
  memoryWarningThreshold: 10 * 1024 * 1024, // 10MB
  patternConfidenceThreshold: 0.8,
  enablePatternDetection: true,
  enablePerformanceAnalysis: true,
  enableSuggestions: true,
};
