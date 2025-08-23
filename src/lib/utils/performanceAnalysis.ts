import type {
  PerformanceAnalysis,
  LargeArrayInfo,
  DeepNestingInfo,
  DuplicateDataInfo,
  OptimizationSuggestion,
} from "../../types/schema";
import { OptimizationType, ImpactLevel, JSONType } from "../../types/schema";

export class PerformanceAnalysisEngine {
  private largeArrayThreshold: number;
  private deepNestingThreshold: number;
  private memoryWarningThreshold: number;

  constructor(
    largeArrayThreshold = 1000,
    deepNestingThreshold = 8,
    memoryWarningThreshold = 10 * 1024 * 1024 // 10MB
  ) {
    this.largeArrayThreshold = largeArrayThreshold;
    this.deepNestingThreshold = deepNestingThreshold;
    this.memoryWarningThreshold = memoryWarningThreshold;
  }

  /**
   * Performs comprehensive performance analysis of JSON data
   */
  public analyze(data: any): PerformanceAnalysis {
    const memoryEstimate = this.estimateMemoryUsage(data);
    const largeArrays = this.findLargeArrays(data);
    const deepNesting = this.findDeepNesting(data);
    const duplicateData = this.findDuplicateData(data);
    const optimizationOpportunities = this.generateOptimizationSuggestions({
      memoryEstimate,
      largeArrays,
      deepNesting,
      duplicateData,
    });

    return {
      memoryEstimate,
      largeArrays,
      deepNesting,
      duplicateData,
      optimizationOpportunities,
    };
  }

  /**
   * Estimates memory usage of JSON data structure
   */
  private estimateMemoryUsage(data: any): number {
    return this.calculateMemorySize(data);
  }

  /**
   * Recursively calculates estimated memory size
   */
  private calculateMemorySize(obj: any): number {
    if (obj === null || obj === undefined) {
      return 8; // Reference size
    }

    if (typeof obj === "string") {
      return 24 + obj.length * 2; // String overhead + UTF-16 characters
    }

    if (typeof obj === "number") {
      return 8; // 64-bit number
    }

    if (typeof obj === "boolean") {
      return 4; // Boolean
    }

    if (Array.isArray(obj)) {
      let size = 24; // Array overhead
      obj.forEach(item => {
        size += 8 + this.calculateMemorySize(item); // Reference + item size
      });
      return size;
    }

    if (typeof obj === "object") {
      let size = 32; // Object overhead
      Object.keys(obj).forEach(key => {
        size += 24 + key.length * 2; // Key string
        size += 8 + this.calculateMemorySize(obj[key]); // Reference + value
      });
      return size;
    }

    return 8; // Fallback
  }

  /**
   * Finds arrays that exceed the large array threshold
   */
  private findLargeArrays(data: any, path = "$"): LargeArrayInfo[] {
    const largeArrays: LargeArrayInfo[] = [];

    const traverse = (obj: any, currentPath: string) => {
      if (Array.isArray(obj)) {
        if (obj.length >= this.largeArrayThreshold) {
          const itemType = this.inferArrayItemType(obj);
          const memoryImpact = this.calculateMemorySize(obj);

          largeArrays.push({
            path: currentPath,
            size: obj.length,
            itemType,
            memoryImpact,
            suggestion: this.generateArrayOptimizationSuggestion(obj.length),
          });
        }

        obj.forEach((item, index) => {
          if (typeof item === "object" && item !== null) {
            traverse(item, `${currentPath}[${index}]`);
          }
        });
      } else if (typeof obj === "object" && obj !== null) {
        Object.keys(obj).forEach(key => {
          const value = obj[key];
          if (typeof value === "object" && value !== null) {
            traverse(value, `${currentPath}.${key}`);
          }
        });
      }
    };

    traverse(data, path);
    return largeArrays;
  }

  /**
   * Finds deeply nested structures
   */
  private findDeepNesting(data: any, path = "$"): DeepNestingInfo[] {
    const deepNesting: DeepNestingInfo[] = [];

    const traverse = (obj: any, currentPath: string, depth: number) => {
      if (depth >= this.deepNestingThreshold) {
        const complexity = this.calculateComplexity(obj);

        deepNesting.push({
          path: currentPath,
          depth,
          complexity,
          suggestion: this.generateNestingOptimizationSuggestion(depth, complexity),
        });
      }

      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          if (typeof item === "object" && item !== null) {
            traverse(item, `${currentPath}[${index}]`, depth + 1);
          }
        });
      } else if (typeof obj === "object" && obj !== null) {
        Object.keys(obj).forEach(key => {
          const value = obj[key];
          if (typeof value === "object" && value !== null) {
            traverse(value, `${currentPath}.${key}`, depth + 1);
          }
        });
      }
    };

    traverse(data, path, 0);
    return deepNesting;
  }

  /**
   * Finds duplicate data structures
   */
  private findDuplicateData(data: any): DuplicateDataInfo[] {
    const duplicates: DuplicateDataInfo[] = [];
    const valueMap = new Map<string, { paths: string[]; value: any; size: number }>();

    const traverse = (obj: any, path: string) => {
      if (obj === null || obj === undefined || typeof obj !== "object") {
        return;
      }

      // Create a normalized string representation for comparison
      const normalized = this.normalizeForComparison(obj);
      const size = this.calculateMemorySize(obj);

      // Only consider objects/arrays above a certain size threshold
      if (size > 1000) {
        if (valueMap.has(normalized)) {
          const existing = valueMap.get(normalized)!;
          existing.paths.push(path);
        } else {
          valueMap.set(normalized, {
            paths: [path],
            value: obj,
            size,
          });
        }
      }

      // Continue traversing
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          if (typeof item === "object" && item !== null) {
            traverse(item, `${path}[${index}]`);
          }
        });
      } else {
        Object.keys(obj).forEach(key => {
          const value = obj[key];
          if (typeof value === "object" && value !== null) {
            traverse(value, `${path}.${key}`);
          }
        });
      }
    };

    traverse(data, "$");

    // Find actual duplicates
    valueMap.forEach(info => {
      if (info.paths.length > 1) {
        const memoryWaste = info.size * (info.paths.length - 1);
        duplicates.push({
          paths: info.paths,
          value: info.value,
          occurrences: info.paths.length,
          memoryWaste,
          suggestion: this.generateDuplicationOptimizationSuggestion(
            info.paths.length,
            memoryWaste
          ),
        });
      }
    });

    return duplicates.sort((a, b) => b.memoryWaste - a.memoryWaste);
  }

  /**
   * Generates optimization suggestions based on analysis results
   */
  private generateOptimizationSuggestions(analysis: {
    memoryEstimate: number;
    largeArrays: LargeArrayInfo[];
    deepNesting: DeepNestingInfo[];
    duplicateData: DuplicateDataInfo[];
  }): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Memory usage suggestions
    if (analysis.memoryEstimate > this.memoryWarningThreshold) {
      suggestions.push({
        type: OptimizationType.REDUCE_DUPLICATION,
        description: `Large memory footprint (${this.formatBytes(analysis.memoryEstimate)}). Consider optimizing data structure.`,
        impact: ImpactLevel.HIGH,
        implementation:
          "Remove duplicate data, optimize array structures, consider data compression",
      });
    }

    // Large array suggestions
    if (analysis.largeArrays.length > 0) {
      const totalLargeArrayItems = analysis.largeArrays.reduce((sum, arr) => sum + arr.size, 0);
      suggestions.push({
        type: OptimizationType.OPTIMIZE_ARRAYS,
        description: `Found ${analysis.largeArrays.length} large arrays with ${totalLargeArrayItems.toLocaleString()} total items`,
        impact: ImpactLevel.MEDIUM,
        implementation: "Consider pagination, lazy loading, or data chunking for large arrays",
      });
    }

    // Deep nesting suggestions
    if (analysis.deepNesting.length > 0) {
      const maxDepth = Math.max(...analysis.deepNesting.map(d => d.depth));
      suggestions.push({
        type: OptimizationType.FLATTEN_OBJECT,
        description: `Deep nesting detected (max depth: ${maxDepth}). This can impact performance and readability.`,
        impact: ImpactLevel.MEDIUM,
        implementation: "Consider flattening object structure or using references",
      });
    }

    // Duplication suggestions
    if (analysis.duplicateData.length > 0) {
      const totalWaste = analysis.duplicateData.reduce((sum, dup) => sum + dup.memoryWaste, 0);
      suggestions.push({
        type: OptimizationType.REDUCE_DUPLICATION,
        description: `Found ${analysis.duplicateData.length} duplicate data structures wasting ${this.formatBytes(totalWaste)}`,
        impact: ImpactLevel.HIGH,
        implementation: "Extract duplicate objects into references or use normalization",
      });
    }

    return suggestions;
  }

  /**
   * Infers the type of items in an array
   */
  private inferArrayItemType(array: any[]): JSONType {
    if (array.length === 0) return JSONType.UNDEFINED;

    const firstItem = array[0];
    if (firstItem === null) return JSONType.NULL;
    if (Array.isArray(firstItem)) return JSONType.ARRAY;
    if (typeof firstItem === "object") return JSONType.OBJECT;
    if (typeof firstItem === "string") return JSONType.STRING;
    if (typeof firstItem === "number") return JSONType.NUMBER;
    if (typeof firstItem === "boolean") return JSONType.BOOLEAN;

    return JSONType.STRING;
  }

  /**
   * Calculates complexity score for nested structures
   */
  private calculateComplexity(obj: any): number {
    let complexity = 1;

    if (Array.isArray(obj)) {
      complexity += obj.length * 0.1;
      obj.forEach(item => {
        if (typeof item === "object" && item !== null) {
          complexity += this.calculateComplexity(item) * 0.5;
        }
      });
    } else if (typeof obj === "object" && obj !== null) {
      const keys = Object.keys(obj);
      complexity += keys.length * 0.2;
      keys.forEach(key => {
        const value = obj[key];
        if (typeof value === "object" && value !== null) {
          complexity += this.calculateComplexity(value) * 0.7;
        }
      });
    }

    return Math.round(complexity * 100) / 100;
  }

  /**
   * Normalizes an object for duplicate comparison
   */
  private normalizeForComparison(obj: any): string {
    try {
      return JSON.stringify(obj, Object.keys(obj).sort());
    } catch {
      return String(obj);
    }
  }

  /**
   * Formats bytes into human-readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Generates array optimization suggestion
   */
  private generateArrayOptimizationSuggestion(size: number): string {
    if (size > 10000) {
      return `Very large array (${size.toLocaleString()} items). Consider pagination or virtual scrolling.`;
    } else if (size > 5000) {
      return `Large array (${size.toLocaleString()} items). Consider chunking or lazy loading.`;
    } else {
      return `Large array (${size.toLocaleString()} items). Monitor performance impact.`;
    }
  }

  /**
   * Generates nesting optimization suggestion
   */
  private generateNestingOptimizationSuggestion(depth: number, complexity: number): string {
    if (depth > 12) {
      return `Very deep nesting (${depth} levels, complexity: ${complexity}). Consider major restructuring.`;
    } else if (depth > 10) {
      return `Deep nesting (${depth} levels, complexity: ${complexity}). Consider flattening structure.`;
    } else {
      return `Deep nesting detected (${depth} levels, complexity: ${complexity}). Monitor readability.`;
    }
  }

  /**
   * Generates duplication optimization suggestion
   */
  private generateDuplicationOptimizationSuggestion(
    occurrences: number,
    memoryWaste: number
  ): string {
    return `Duplicated ${occurrences} times, wasting ${this.formatBytes(memoryWaste)}. Extract to shared reference.`;
  }
}
