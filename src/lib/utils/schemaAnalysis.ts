import type {
  SchemaAnalysisResult,
  StructureAnalysis,
  FieldTypeInfo,
  TypeInconsistency,
  PatternAnalysis,
  PerformanceAnalysis,
  SchemaSuggestion,
  SchemaAnalysisConfig,
} from "../../types/schema";
import { JSONType, DEFAULT_SCHEMA_CONFIG } from "../../types/schema";
import { PatternDetectionEngine } from "./patternDetection";
import { PerformanceAnalysisEngine } from "./performanceAnalysis";
import { SchemaGenerationEngine } from "./schemaGeneration";
import { SuggestionGenerationEngine } from "./suggestionGeneration";

export class SchemaAnalysisEngine {
  private config: SchemaAnalysisConfig;
  private patternEngine: PatternDetectionEngine;
  private performanceEngine: PerformanceAnalysisEngine;
  private suggestionEngine: SuggestionGenerationEngine;
  private schemaEngine: SchemaGenerationEngine;

  constructor(config: Partial<SchemaAnalysisConfig> = {}) {
    this.config = { ...DEFAULT_SCHEMA_CONFIG, ...config };
    this.patternEngine = new PatternDetectionEngine();
    this.performanceEngine = new PerformanceAnalysisEngine(
      this.config.largeArrayThreshold,
      this.config.maxDepthWarning,
      this.config.memoryWarningThreshold
    );
    this.suggestionEngine = new SuggestionGenerationEngine();
    this.schemaEngine = new SchemaGenerationEngine();
  }

  /**
   * Analyzes JSON data and returns comprehensive schema analysis
   */
  public analyze(data: any): Partial<SchemaAnalysisResult> {
    const startTime = Date.now();

    try {
      const structure = this.analyzeStructure(data);
      let patterns: PatternAnalysis[] = [];
      let performance: PerformanceAnalysis = {
        memoryEstimate: 0,
        largeArrays: [],
        deepNesting: [],
        duplicateData: [],
        optimizationOpportunities: [],
      };
      let suggestions: SchemaSuggestion[] = [];

      // Analyze patterns if enabled
      if (this.config.enablePatternDetection) {
        patterns = this.patternEngine.analyzeAllPatterns(
          data,
          this.config.patternConfidenceThreshold
        );
      }

      // Analyze performance if enabled
      if (this.config.enablePerformanceAnalysis) {
        performance = this.performanceEngine.analyze(data);
      }

      // Generate suggestions if enabled
      if (this.config.enableSuggestions) {
        suggestions = this.suggestionEngine.generateSuggestions(structure, patterns, performance);
      }

      // Generate comprehensive JSON Schema
      const generatedSchema = this.schemaEngine.generateSchema(
        data,
        structure,
        patterns,
        performance
      );

      return {
        structure,
        patterns,
        performance,
        suggestions,
        generatedSchema,
        timestamp: startTime,
        confidence: this.calculateOverallConfidence(structure, patterns),
      };
    } catch (error) {
      console.error("Schema analysis failed:", error);
      return {
        timestamp: startTime,
        confidence: 0,
      };
    }
  }

  /**
   * Analyzes the structure of JSON data
   */
  private analyzeStructure(data: any, path = "$"): StructureAnalysis {
    const fieldTypes: Record<string, FieldTypeInfo> = {};
    const duplicateKeys: string[] = [];
    const inconsistentTypes: TypeInconsistency[] = [];

    let totalNodes = 0;
    let maxDepth = 0;

    const analyze = (obj: any, currentPath: string, depth: number) => {
      maxDepth = Math.max(maxDepth, depth);
      totalNodes++;

      if (obj === null || obj === undefined) {
        this.recordFieldType(fieldTypes, currentPath, obj);
        return;
      }

      const type = this.getJSONType(obj);

      if (type === JSONType.OBJECT && obj !== null) {
        this.recordFieldType(fieldTypes, currentPath, obj);

        const keys = Object.keys(obj);
        const keyCount: Record<string, number> = {};

        keys.forEach(key => {
          keyCount[key] = (keyCount[key] || 0) + 1;
          if (keyCount[key] > 1) {
            duplicateKeys.push(key);
          }

          const childPath = `${currentPath}.${key}`;
          analyze(obj[key], childPath, depth + 1);
        });
      } else if (type === JSONType.ARRAY) {
        this.recordFieldType(fieldTypes, currentPath, obj);

        obj.forEach((item: any, index: number) => {
          const childPath = `${currentPath}[${index}]`;
          analyze(item, childPath, depth + 1);
        });

        // Check for type inconsistencies in array items
        const arrayTypes = this.analyzeArrayTypeConsistency(obj);
        if (arrayTypes.length > 1) {
          inconsistentTypes.push({
            field: currentPath,
            types: arrayTypes,
            occurrences: this.countTypeOccurrences(obj),
            examples: this.getTypeExamples(obj),
          });
        }
      } else {
        this.recordFieldType(fieldTypes, currentPath, obj);
      }
    };

    analyze(data, path, 0);

    // Detect missing fields and type inconsistencies
    const missingFields = this.detectMissingFields();
    const additionalInconsistencies = this.detectTypeInconsistencies(fieldTypes);

    return {
      totalNodes,
      maxDepth,
      fieldTypes,
      duplicateKeys: [...new Set(duplicateKeys)],
      missingFields,
      inconsistentTypes: [...inconsistentTypes, ...additionalInconsistencies],
    };
  }

  /**
   * Records field type information
   */
  private recordFieldType(fieldTypes: Record<string, FieldTypeInfo>, path: string, value: any) {
    const type = this.getJSONType(value);

    if (!fieldTypes[path]) {
      fieldTypes[path] = {
        path,
        detectedType: type,
        occurrences: 0,
        examples: [],
        patterns: [],
        nullable: false,
        optional: false,
      };
    }

    const fieldInfo = fieldTypes[path];
    fieldInfo.occurrences++;

    // Store examples (max 5)
    if (fieldInfo.examples.length < 5) {
      fieldInfo.examples.push(value);
    }

    // Check for nullable values
    if (value === null || value === undefined) {
      fieldInfo.nullable = true;
    }

    // Update type if inconsistent
    if (fieldInfo.detectedType !== type) {
      // Handle type evolution (e.g., number -> string)
      fieldInfo.detectedType = this.mergeTypes(fieldInfo.detectedType, type);
    }
  }

  /**
   * Determines the JSON type of a value
   */
  private getJSONType(value: any): JSONType {
    if (value === null) return JSONType.NULL;
    if (value === undefined) return JSONType.UNDEFINED;
    if (Array.isArray(value)) return JSONType.ARRAY;
    if (typeof value === "object") return JSONType.OBJECT;
    if (typeof value === "string") return JSONType.STRING;
    if (typeof value === "number") return JSONType.NUMBER;
    if (typeof value === "boolean") return JSONType.BOOLEAN;

    return JSONType.STRING; // fallback
  }

  /**
   * Analyzes type consistency in arrays
   */
  private analyzeArrayTypeConsistency(array: any[]): JSONType[] {
    const types = new Set<JSONType>();

    array.forEach(item => {
      types.add(this.getJSONType(item));
    });

    return Array.from(types);
  }

  /**
   * Counts occurrences of each type in an array
   */
  private countTypeOccurrences(array: any[]): Record<JSONType, number> {
    const counts: Record<JSONType, number> = {} as Record<JSONType, number>;

    array.forEach(item => {
      const type = this.getJSONType(item);
      counts[type] = (counts[type] || 0) + 1;
    });

    return counts;
  }

  /**
   * Gets examples for each type in an array
   */
  private getTypeExamples(array: any[]): Record<JSONType, any[]> {
    const examples: Record<JSONType, any[]> = {} as Record<JSONType, any[]>;

    array.forEach(item => {
      const type = this.getJSONType(item);
      if (!examples[type]) {
        examples[type] = [];
      }
      if (examples[type].length < 3) {
        examples[type].push(item);
      }
    });

    return examples;
  }

  /**
   * Detects missing fields across similar objects
   */
  private detectMissingFields(): string[] {
    // This is a simplified implementation
    // In a real scenario, we'd compare similar object structures
    const missingFields: string[] = [];

    // For now, return empty array - this would need more sophisticated logic
    return missingFields;
  }

  /**
   * Detects type inconsistencies across fields
   */
  private detectTypeInconsistencies(
    fieldTypes: Record<string, FieldTypeInfo>
  ): TypeInconsistency[] {
    const inconsistencies: TypeInconsistency[] = [];

    // Group fields by base path to find inconsistencies
    const pathGroups: Record<string, FieldTypeInfo[]> = {};

    Object.values(fieldTypes).forEach(field => {
      const basePath = this.getBasePath(field.path);
      if (!pathGroups[basePath]) {
        pathGroups[basePath] = [];
      }
      pathGroups[basePath].push(field);
    });

    // Check for type inconsistencies within groups
    Object.entries(pathGroups).forEach(([basePath, fields]) => {
      const typeMap = new Map<JSONType, FieldTypeInfo[]>();

      fields.forEach(field => {
        if (!typeMap.has(field.detectedType)) {
          typeMap.set(field.detectedType, []);
        }
        typeMap.get(field.detectedType)!.push(field);
      });

      if (typeMap.size > 1) {
        const types = Array.from(typeMap.keys());
        const occurrences: Record<JSONType, number> = {} as Record<JSONType, number>;
        const examples: Record<JSONType, any[]> = {} as Record<JSONType, any[]>;

        types.forEach(type => {
          const fieldsOfType = typeMap.get(type)!;
          occurrences[type] = fieldsOfType.reduce((sum, f) => sum + f.occurrences, 0);
          examples[type] = fieldsOfType.flatMap(f => f.examples.slice(0, 2));
        });

        inconsistencies.push({
          field: basePath,
          types,
          occurrences,
          examples,
        });
      }
    });

    return inconsistencies;
  }

  /**
   * Gets the base path for a field (removes array indices and specific object keys)
   */
  private getBasePath(path: string): string {
    return path
      .replace(/\[\d+\]/g, "[]") // Replace array indices with []
      .replace(/\.\w+$/g, ".*"); // Replace specific keys with wildcard
  }

  /**
   * Merges two types when inconsistency is detected
   */
  private mergeTypes(type1: JSONType, type2: JSONType): JSONType {
    // If one is null/undefined, prefer the other
    if (type1 === JSONType.NULL || type1 === JSONType.UNDEFINED) return type2;
    if (type2 === JSONType.NULL || type2 === JSONType.UNDEFINED) return type1;

    // If both are primitive but different, default to string
    if (this.isPrimitive(type1) && this.isPrimitive(type2) && type1 !== type2) {
      return JSONType.STRING;
    }

    return type1; // Default to first type
  }

  /**
   * Checks if a type is primitive
   */
  private isPrimitive(type: JSONType): boolean {
    return [JSONType.STRING, JSONType.NUMBER, JSONType.BOOLEAN].includes(type);
  }

  /**
   * Calculates overall confidence score for the analysis
   */
  private calculateOverallConfidence(
    structure: StructureAnalysis,
    patterns: PatternAnalysis[] = []
  ): number {
    let confidence = 0.9; // Base confidence

    // Reduce confidence for inconsistencies
    if (structure.inconsistentTypes.length > 0) {
      confidence -= Math.min(0.3, structure.inconsistentTypes.length * 0.1);
    }

    // Reduce confidence for missing fields
    if (structure.missingFields.length > 0) {
      confidence -= Math.min(0.2, structure.missingFields.length * 0.05);
    }

    // Reduce confidence for duplicate keys
    if (structure.duplicateKeys.length > 0) {
      confidence -= Math.min(0.1, structure.duplicateKeys.length * 0.02);
    }

    // Boost confidence for detected patterns
    if (patterns.length > 0) {
      const avgPatternConfidence =
        patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
      confidence += Math.min(0.1, avgPatternConfidence * 0.1);
    }

    return Math.max(0.1, Math.min(0.99, confidence));
  }
}
