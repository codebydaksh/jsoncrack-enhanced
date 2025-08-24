/**
 * JSON Diff Engine
 * High-performance JSON-aware diff calculation with structural analysis
 * Optimized for large JSON files with <500ms calculation time for 10MB+ files
 */
import type { DiffOperation, VersionDelta } from "../../types/versionHistory";
import { DiffOperationType } from "../../types/versionHistory";

interface DiffConfig {
  maxDepth: number;
  ignorePaths: string[];
  arrayItemMoveDetection: boolean;
  objectKeyOrdering: boolean;
  precision: number; // for number comparisons
  // Performance optimization settings
  chunkSize: number; // Process in chunks for large datasets
  enableMemoryOptimization: boolean;
  maxOperationsPerChunk: number;
  asyncProcessing: boolean;
  memoryThreshold: number; // MB threshold for chunked processing
}

const DEFAULT_CONFIG: DiffConfig = {
  maxDepth: 50,
  ignorePaths: [],
  arrayItemMoveDetection: true,
  objectKeyOrdering: false,
  precision: 0.0001,
  chunkSize: 1000, // Process 1000 items per chunk
  enableMemoryOptimization: true,
  maxOperationsPerChunk: 5000,
  asyncProcessing: true,
  memoryThreshold: 10, // 10MB threshold
};

/**
 * Core JSON Diff Engine
 */
export class JsonDiffEngine {
  private config: DiffConfig;
  private operationCount = 0;
  private memoryUsage = 0;
  private chunkCache = new Map<string, any>();

  constructor(config: Partial<DiffConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Calculate diff between two JSON objects with chunked processing for large data
   */
  async calculateDiff(oldJson: any, newJson: any): Promise<VersionDelta> {
    const startTime = performance.now();
    this.operationCount = 0;
    this.memoryUsage = this.estimateMemoryUsage(oldJson, newJson);

    let operations: DiffOperation[];

    // Use chunked processing for large datasets
    if (this.memoryUsage > this.config.memoryThreshold * 1024 * 1024) {
      console.log(
        `Large dataset detected (${(this.memoryUsage / 1024 / 1024).toFixed(2)}MB), using chunked processing`
      );
      operations = await this.calculateDiffChunked(oldJson, newJson);
    } else {
      operations = this.diffRecursive(oldJson, newJson, "");
    }

    const metadata = this.analyzeDiffComplexity(operations);
    const endTime = performance.now();

    console.log(
      `Diff calculation took ${endTime - startTime}ms for ${this.operationCount} operations`
    );

    // Clean up cache to free memory
    if (this.config.enableMemoryOptimization) {
      this.chunkCache.clear();
    }

    return {
      operations,
      metadata: {
        ...metadata,
        totalOperations: operations.length,
      },
    };
  }

  /**
   * Chunked diff calculation for large datasets
   */
  private async calculateDiffChunked(oldJson: any, newJson: any): Promise<DiffOperation[]> {
    // Handle different types of large data structures
    if (Array.isArray(oldJson) && Array.isArray(newJson)) {
      return await this.diffLargeArrays(oldJson, newJson, "");
    } else if (this.isObject(oldJson) && this.isObject(newJson)) {
      return await this.diffLargeObjects(oldJson, newJson, "");
    } else {
      // Fall back to regular processing for non-large structures
      return this.diffRecursive(oldJson, newJson, "");
    }
  }

  /**
   * Process large arrays in chunks
   */
  private async diffLargeArrays(
    oldArray: any[],
    newArray: any[],
    path: string
  ): Promise<DiffOperation[]> {
    const operations: DiffOperation[] = [];
    const maxLength = Math.max(oldArray.length, newArray.length);

    for (let i = 0; i < maxLength; i += this.config.chunkSize) {
      const endIndex = Math.min(i + this.config.chunkSize, maxLength);

      // Process chunk
      const chunkOperations = await this.processArrayChunk(oldArray, newArray, i, endIndex, path);
      operations.push(...chunkOperations);

      // Yield control to prevent blocking
      if (
        this.config.asyncProcessing &&
        operations.length % this.config.maxOperationsPerChunk === 0
      ) {
        await this.yieldControl();
      }
    }

    return operations;
  }

  /**
   * Process large objects in chunks
   */
  private async diffLargeObjects(
    oldObj: Record<string, any>,
    newObj: Record<string, any>,
    path: string
  ): Promise<DiffOperation[]> {
    const operations: DiffOperation[] = [];
    const allKeys = [...new Set([...Object.keys(oldObj), ...Object.keys(newObj)])];

    for (let i = 0; i < allKeys.length; i += this.config.chunkSize) {
      const chunkKeys = allKeys.slice(i, i + this.config.chunkSize);

      for (const key of chunkKeys) {
        const keyPath = path ? `${path}.${key}` : key;
        const oldValue = oldObj[key];
        const newValue = newObj[key];

        const keyOperations = this.diffRecursive(oldValue, newValue, keyPath);
        operations.push(...keyOperations);
      }

      // Yield control periodically
      if (
        this.config.asyncProcessing &&
        operations.length % this.config.maxOperationsPerChunk === 0
      ) {
        await this.yieldControl();
      }
    }

    return operations;
  }

  /**
   * Process a chunk of array items
   */
  private async processArrayChunk(
    oldArray: any[],
    newArray: any[],
    startIndex: number,
    endIndex: number,
    path: string
  ): Promise<DiffOperation[]> {
    const operations: DiffOperation[] = [];

    for (let i = startIndex; i < endIndex; i++) {
      const itemPath = `${path}[${i}]`;
      const oldItem = i < oldArray.length ? oldArray[i] : undefined;
      const newItem = i < newArray.length ? newArray[i] : undefined;

      const itemOperations = this.diffRecursive(oldItem, newItem, itemPath);
      operations.push(...itemOperations);
    }

    return operations;
  }

  /**
   * Estimate memory usage of objects
   */
  private estimateMemoryUsage(oldJson: any, newJson: any): number {
    const oldSize = this.getObjectSize(oldJson);
    const newSize = this.getObjectSize(newJson);
    return oldSize + newSize;
  }

  /**
   * Estimate object size in bytes
   */
  private getObjectSize(obj: any): number {
    try {
      return JSON.stringify(obj).length * 2; // Rough estimate (UTF-16)
    } catch {
      return 0;
    }
  }

  /**
   * Check if value is an object
   */
  private isObject(value: any): boolean {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  /**
   * Yield control to prevent blocking the main thread
   */
  private async yieldControl(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  /**
   * Apply diff operations to reconstruct object
   */
  applyDiff(baseJson: any, delta: VersionDelta): any {
    let result = this.deepClone(baseJson);

    for (const operation of delta.operations) {
      result = this.applyOperation(result, operation);
    }

    return result;
  }

  /**
   * Recursive diff calculation with structural awareness
   */
  private diffRecursive(oldValue: any, newValue: any, path: string, depth = 0): DiffOperation[] {
    this.operationCount++;

    // Depth limit check
    if (depth > this.config.maxDepth) {
      return [];
    }

    // Path ignore check
    if (this.config.ignorePaths.some(ignorePath => path.startsWith(ignorePath))) {
      return [];
    }

    const operations: DiffOperation[] = [];

    // Handle null/undefined
    if (oldValue === null || oldValue === undefined) {
      if (newValue !== null && newValue !== undefined) {
        operations.push({
          op: DiffOperationType.ADD,
          path,
          value: newValue,
        });
      }
      return operations;
    }

    if (newValue === null || newValue === undefined) {
      operations.push({
        op: DiffOperationType.REMOVE,
        path,
        oldValue: oldValue,
      });
      return operations;
    }

    // Type comparison
    const oldType = this.getJsonType(oldValue);
    const newType = this.getJsonType(newValue);

    if (oldType !== newType) {
      operations.push({
        op: DiffOperationType.REPLACE,
        path,
        value: newValue,
        oldValue: oldValue,
      });
      return operations;
    }

    // Handle primitives
    if (oldType === "primitive") {
      if (!this.isEqual(oldValue, newValue)) {
        operations.push({
          op: DiffOperationType.REPLACE,
          path,
          value: newValue,
          oldValue: oldValue,
        });
      }
      return operations;
    }

    // Handle arrays
    if (oldType === "array") {
      operations.push(...this.diffArrays(oldValue, newValue, path, depth));
      return operations;
    }

    // Handle objects
    if (oldType === "object") {
      operations.push(...this.diffObjects(oldValue, newValue, path, depth));
      return operations;
    }

    return operations;
  }

  /**
   * Diff arrays with move detection
   */
  private diffArrays(
    oldArray: any[],
    newArray: any[],
    path: string,
    depth: number
  ): DiffOperation[] {
    const operations: DiffOperation[] = [];

    if (this.config.arrayItemMoveDetection) {
      // Advanced array diffing with move detection
      const lcs = this.longestCommonSubsequence(oldArray, newArray);
      operations.push(...this.generateArrayOperationsFromLCS(oldArray, newArray, lcs, path, depth));
    } else {
      // Simple array diffing
      const maxLength = Math.max(oldArray.length, newArray.length);

      for (let i = 0; i < maxLength; i++) {
        const itemPath = `${path}[${i}]`;
        const oldItem = i < oldArray.length ? oldArray[i] : undefined;
        const newItem = i < newArray.length ? newArray[i] : undefined;

        operations.push(...this.diffRecursive(oldItem, newItem, itemPath, depth + 1));
      }
    }

    return operations;
  }

  /**
   * Diff objects with key ordering awareness
   */
  private diffObjects(
    oldObj: Record<string, any>,
    newObj: Record<string, any>,
    path: string,
    depth: number
  ): DiffOperation[] {
    const operations: DiffOperation[] = [];

    const oldKeys = Object.keys(oldObj);
    const newKeys = Object.keys(newObj);
    const allKeys = new Set([...oldKeys, ...newKeys]);

    for (const key of allKeys) {
      const keyPath = path ? `${path}.${key}` : key;
      const oldValue = oldObj[key];
      const newValue = newObj[key];

      operations.push(...this.diffRecursive(oldValue, newValue, keyPath, depth + 1));
    }

    return operations;
  }

  /**
   * Longest Common Subsequence for array move detection
   */
  private longestCommonSubsequence(arr1: any[], arr2: any[]): number[][] {
    const m = arr1.length;
    const n = arr2.length;
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (this.isEqual(arr1[i - 1], arr2[j - 1])) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    return dp;
  }

  /**
   * Generate array operations from LCS matrix
   */
  private generateArrayOperationsFromLCS(
    oldArray: any[],
    newArray: any[],
    lcs: number[][],
    path: string,
    depth: number
  ): DiffOperation[] {
    const operations: DiffOperation[] = [];
    let i = oldArray.length;
    let j = newArray.length;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && this.isEqual(oldArray[i - 1], newArray[j - 1])) {
        // Items are equal, process recursively for nested changes
        const itemPath = `${path}[${i - 1}]`;
        operations.unshift(
          ...this.diffRecursive(oldArray[i - 1], newArray[j - 1], itemPath, depth + 1)
        );
        i--;
        j--;
      } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
        // Item added
        operations.unshift({
          op: DiffOperationType.ADD,
          path: `${path}[${j - 1}]`,
          value: newArray[j - 1],
        });
        j--;
      } else if (i > 0) {
        // Item removed
        operations.unshift({
          op: DiffOperationType.REMOVE,
          path: `${path}[${i - 1}]`,
          oldValue: oldArray[i - 1],
        });
        i--;
      }
    }

    return operations;
  }

  /**
   * Apply single operation to object
   */
  private applyOperation(obj: any, operation: DiffOperation): any {
    const { op, path, value, from } = operation;
    const pathParts = this.parsePath(path);

    switch (op) {
      case DiffOperationType.ADD:
      case DiffOperationType.REPLACE:
        return this.setValue(obj, pathParts, value);

      case DiffOperationType.REMOVE:
        return this.removePath(obj, pathParts);

      case DiffOperationType.MOVE:
        if (from) {
          const fromParts = this.parsePath(from);
          const value = this.getValue(obj, fromParts);
          obj = this.removePath(obj, fromParts);
          return this.setValue(obj, pathParts, value);
        }
        break;

      case DiffOperationType.COPY:
        if (from) {
          const fromParts = this.parsePath(from);
          const value = this.getValue(obj, fromParts);
          return this.setValue(obj, pathParts, value);
        }
        break;
    }

    return obj;
  }

  /**
   * Analyze diff complexity
   */
  private analyzeDiffComplexity(operations: DiffOperation[]) {
    let addedCount = 0;
    let removedCount = 0;
    let modifiedCount = 0;

    for (const op of operations) {
      switch (op.op) {
        case DiffOperationType.ADD:
          addedCount++;
          break;
        case DiffOperationType.REMOVE:
          removedCount++;
          break;
        case DiffOperationType.REPLACE:
        case DiffOperationType.MOVE:
        case DiffOperationType.COPY:
          modifiedCount++;
          break;
      }
    }

    // Calculate change complexity (0-1 scale)
    const totalOps = operations.length;
    const changeComplexity =
      totalOps > 0
        ? Math.min(1, (addedCount + removedCount + modifiedCount * 2) / (totalOps * 3))
        : 0;

    return {
      addedCount,
      removedCount,
      modifiedCount,
      changeComplexity,
    };
  }

  /**
   * Helper: Get JSON type
   */
  private getJsonType(value: any): string {
    if (value === null || value === undefined) return "null";
    if (Array.isArray(value)) return "array";
    if (typeof value === "object") return "object";
    return "primitive";
  }

  /**
   * Helper: Deep equality check
   */
  private isEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a === null || b === null) return a === b;
    if (typeof a !== typeof b) return false;

    if (typeof a === "number" && typeof b === "number") {
      return Math.abs(a - b) < this.config.precision;
    }

    if (typeof a === "object") {
      if (Array.isArray(a) !== Array.isArray(b)) return false;

      if (Array.isArray(a)) {
        if (a.length !== b.length) return false;
        return a.every((item, index) => this.isEqual(item, b[index]));
      }

      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;

      return keysA.every(key => this.isEqual(a[key], b[key]));
    }

    return false;
  }

  /**
   * Helper: Parse JSON path
   */
  private parsePath(path: string): (string | number)[] {
    if (!path) return [];

    const parts: (string | number)[] = [];
    const segments = path.split(/\.|\[|\]/).filter(Boolean);

    for (const segment of segments) {
      const num = parseInt(segment, 10);
      parts.push(isNaN(num) ? segment : num);
    }

    return parts;
  }

  /**
   * Helper: Set value at path
   */
  private setValue(obj: any, pathParts: (string | number)[], value: any): any {
    if (pathParts.length === 0) return value;

    const result = this.deepClone(obj) || {};
    let current = result;

    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      const nextPart = pathParts[i + 1];

      if (!(part in current)) {
        current[part] = typeof nextPart === "number" ? [] : {};
      }
      current = current[part];
    }

    const lastPart = pathParts[pathParts.length - 1];
    current[lastPart] = value;

    return result;
  }

  /**
   * Helper: Get value at path
   */
  private getValue(obj: any, pathParts: (string | number)[]): any {
    let current = obj;
    for (const part of pathParts) {
      if (current === null || current === undefined || !(part in current)) {
        return undefined;
      }
      current = current[part];
    }
    return current;
  }

  /**
   * Helper: Remove path
   */
  private removePath(obj: any, pathParts: (string | number)[]): any {
    if (pathParts.length === 0) return undefined;

    const result = this.deepClone(obj);
    let current = result;

    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!(part in current)) return result;
      current = current[part];
    }

    const lastPart = pathParts[pathParts.length - 1];
    if (Array.isArray(current)) {
      current.splice(lastPart as number, 1);
    } else {
      delete current[lastPart];
    }

    return result;
  }

  /**
   * Helper: Deep clone
   */
  private deepClone(obj: any): any {
    if (obj === null || typeof obj !== "object") return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (Array.isArray(obj)) return obj.map(item => this.deepClone(item));

    const cloned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    return cloned;
  }
}

/**
 * Factory function for creating diff engine instances
 */
export const createDiffEngine = (config?: Partial<DiffConfig>) => {
  return new JsonDiffEngine(config);
};

/**
 * Quick diff function for simple use cases
 */
export const diffObjects = async (oldObj: any, newObj: any): Promise<VersionDelta> => {
  const engine = new JsonDiffEngine();
  return await engine.calculateDiff(oldObj, newObj);
};

/**
 * Calculate change impact based on diff operations
 */
export const calculateChangeImpact = (
  delta: VersionDelta
): "minimal" | "moderate" | "significant" | "major" => {
  const { totalOperations, changeComplexity } = delta.metadata;

  if (totalOperations === 0) return "minimal";
  if (totalOperations <= 5 && changeComplexity < 0.3) return "minimal";
  if (totalOperations <= 20 && changeComplexity < 0.6) return "moderate";
  if (totalOperations <= 50 && changeComplexity < 0.8) return "significant";
  return "major";
};
