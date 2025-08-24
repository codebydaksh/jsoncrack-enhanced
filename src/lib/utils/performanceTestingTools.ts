import type { SchemaAnalysisResult } from "../../store/useSQLSchema";
import { DatabaseType } from "../../store/useSQLSchema";

export interface PerformanceTestConfig {
  maxExecutionTime: number;
  memoryThreshold: number;
  iterations: number;
}

export interface PerformanceMetrics {
  executionTime: number;
  memoryUsage: number;
  queryComplexity: number;
  indexEfficiency: number;
  normalizationScore: number;
  scalabilityScore: number;
}

export interface PerformanceTestResult {
  testName: string;
  passed: boolean;
  metrics: PerformanceMetrics;
  score: number;
  recommendations: string[];
  bottlenecks: string[];
}

/**
 * Performance Testing Engine for SQL Schema
 */
export class PerformanceTestingEngine {
  private config: PerformanceTestConfig;

  constructor(config: Partial<PerformanceTestConfig> = {}) {
    this.config = {
      maxExecutionTime: 5000,
      memoryThreshold: 100,
      iterations: 3,
      ...config,
    };
  }

  async runPerformanceTests(
    analysisResult: SchemaAnalysisResult,
    generatedSQL: string,
    databaseType: DatabaseType
  ): Promise<PerformanceTestResult[]> {
    const results: PerformanceTestResult[] = [];

    results.push(await this.testSchemaGeneration(analysisResult));
    results.push(await this.testQueryComplexity(analysisResult));
    results.push(await this.testIndexEfficiency(analysisResult));
    results.push(await this.testMemoryUsage(analysisResult));
    results.push(await this.testScalability(analysisResult));
    results.push(await this.testDatabaseSpecific(analysisResult, databaseType));

    return results;
  }

  private async testSchemaGeneration(
    analysisResult: SchemaAnalysisResult
  ): Promise<PerformanceTestResult> {
    const startTime = performance.now();

    // Simulate schema processing
    for (let i = 0; i < this.config.iterations; i++) {
      this.simulateProcessing(analysisResult);
    }

    const executionTime = (performance.now() - startTime) / this.config.iterations;
    const complexity = this.calculateComplexity(analysisResult);

    const metrics: PerformanceMetrics = {
      executionTime,
      memoryUsage: this.estimateMemory(analysisResult),
      queryComplexity: complexity,
      indexEfficiency: this.calculateIndexEfficiency(analysisResult),
      normalizationScore: this.calculateNormalization(analysisResult),
      scalabilityScore: this.calculateScalability(analysisResult),
    };

    const score = Math.max(0, 100 - executionTime / 100 - complexity / 10);
    const passed = executionTime < this.config.maxExecutionTime && score >= 70;

    return {
      testName: "Schema Generation Performance",
      passed,
      metrics,
      score,
      recommendations: this.getGenerationRecommendations(metrics),
      bottlenecks: this.getGenerationBottlenecks(metrics),
    };
  }

  private async testQueryComplexity(
    analysisResult: SchemaAnalysisResult
  ): Promise<PerformanceTestResult> {
    const complexity = this.calculateComplexity(analysisResult);
    const joinComplexity = this.calculateJoinComplexity(analysisResult);

    const metrics: PerformanceMetrics = {
      executionTime: 0,
      memoryUsage: 0,
      queryComplexity: complexity + joinComplexity,
      indexEfficiency: 0,
      normalizationScore: 0,
      scalabilityScore: 0,
    };

    const score = Math.max(0, 100 - metrics.queryComplexity);
    const passed = metrics.queryComplexity <= 50;

    return {
      testName: "Query Complexity Analysis",
      passed,
      metrics,
      score,
      recommendations: this.getComplexityRecommendations(metrics),
      bottlenecks: this.getComplexityBottlenecks(metrics),
    };
  }

  private async testIndexEfficiency(
    analysisResult: SchemaAnalysisResult
  ): Promise<PerformanceTestResult> {
    const efficiency = this.calculateIndexEfficiency(analysisResult);
    const coverage = this.calculateIndexCoverage(analysisResult);

    const metrics: PerformanceMetrics = {
      executionTime: 0,
      memoryUsage: 0,
      queryComplexity: 0,
      indexEfficiency: efficiency,
      normalizationScore: 0,
      scalabilityScore: 0,
    };

    const score = efficiency * coverage * 100;
    const passed = score >= 70;

    return {
      testName: "Index Efficiency Test",
      passed,
      metrics,
      score,
      recommendations: this.getIndexRecommendations(analysisResult),
      bottlenecks: this.getIndexBottlenecks(analysisResult),
    };
  }

  private async testMemoryUsage(
    analysisResult: SchemaAnalysisResult
  ): Promise<PerformanceTestResult> {
    const memoryUsage = this.estimateMemory(analysisResult);

    const metrics: PerformanceMetrics = {
      executionTime: 0,
      memoryUsage,
      queryComplexity: 0,
      indexEfficiency: 0,
      normalizationScore: 0,
      scalabilityScore: 0,
    };

    const score = Math.max(0, 100 - (memoryUsage / this.config.memoryThreshold) * 100);
    const passed = memoryUsage < this.config.memoryThreshold;

    return {
      testName: "Memory Usage Analysis",
      passed,
      metrics,
      score,
      recommendations: this.getMemoryRecommendations(analysisResult),
      bottlenecks: this.getMemoryBottlenecks(analysisResult),
    };
  }

  private async testScalability(
    analysisResult: SchemaAnalysisResult
  ): Promise<PerformanceTestResult> {
    const scalabilityScore = this.calculateScalability(analysisResult);

    const metrics: PerformanceMetrics = {
      executionTime: 0,
      memoryUsage: 0,
      queryComplexity: 0,
      indexEfficiency: 0,
      normalizationScore: 0,
      scalabilityScore,
    };

    const passed = scalabilityScore >= 60;

    return {
      testName: "Scalability Testing",
      passed,
      metrics,
      score: scalabilityScore,
      recommendations: this.getScalabilityRecommendations(analysisResult),
      bottlenecks: this.getScalabilityBottlenecks(analysisResult),
    };
  }

  private async testDatabaseSpecific(
    analysisResult: SchemaAnalysisResult,
    databaseType: DatabaseType
  ): Promise<PerformanceTestResult> {
    const dbScore = this.calculateDatabaseScore(analysisResult, databaseType);

    const metrics: PerformanceMetrics = {
      executionTime: 0,
      memoryUsage: 0,
      queryComplexity: 0,
      indexEfficiency: 0,
      normalizationScore: 0,
      scalabilityScore: 0,
    };

    const passed = dbScore >= 70;

    return {
      testName: `${databaseType} Optimization`,
      passed,
      metrics,
      score: dbScore,
      recommendations: this.getDatabaseRecommendations(databaseType),
      bottlenecks: this.getDatabaseBottlenecks(databaseType, analysisResult),
    };
  }

  // Helper calculation methods
  private simulateProcessing(analysisResult: SchemaAnalysisResult): void {
    for (const table of analysisResult.tables) {
      for (const column of table.columns) {
        JSON.stringify(column);
      }
    }
  }

  private calculateComplexity(analysisResult: SchemaAnalysisResult): number {
    const tableCount = analysisResult.tables.length;
    const relationshipCount = analysisResult.relationships?.length || 0;
    const totalColumns = analysisResult.tables.reduce(
      (sum, table) => sum + table.columns.length,
      0
    );
    return tableCount * 2 + relationshipCount * 3 + totalColumns * 0.5;
  }

  private calculateJoinComplexity(analysisResult: SchemaAnalysisResult): number {
    return (analysisResult.relationships?.length || 0) * 2;
  }

  private calculateIndexEfficiency(analysisResult: SchemaAnalysisResult): number {
    let totalIndexes = 0;
    let totalColumns = 0;

    for (const table of analysisResult.tables) {
      totalColumns += table.columns.length;
      totalIndexes += table.indexes?.length || 0;
    }

    return totalColumns > 0 ? Math.min(1, totalIndexes / totalColumns) : 0;
  }

  private calculateIndexCoverage(analysisResult: SchemaAnalysisResult): number {
    // Simplified coverage calculation
    const tablesWithIndexes = analysisResult.tables.filter(
      table => table.indexes && table.indexes.length > 0
    ).length;
    return analysisResult.tables.length > 0 ? tablesWithIndexes / analysisResult.tables.length : 0;
  }

  private calculateNormalization(analysisResult: SchemaAnalysisResult): number {
    const avgColumnsPerTable =
      analysisResult.tables.reduce((sum, table) => sum + table.columns.length, 0) /
      analysisResult.tables.length;

    if (avgColumnsPerTable >= 5 && avgColumnsPerTable <= 15) return 100;
    if (avgColumnsPerTable < 5) return 60;
    return Math.max(20, 100 - (avgColumnsPerTable - 15) * 5);
  }

  private calculateScalability(analysisResult: SchemaAnalysisResult): number {
    const tableCount = analysisResult.tables.length;
    const relationshipCount = analysisResult.relationships?.length || 0;

    // Simple scalability heuristic
    if (tableCount <= 10 && relationshipCount <= 15) return 90;
    if (tableCount <= 25 && relationshipCount <= 50) return 70;
    if (tableCount <= 50 && relationshipCount <= 100) return 50;
    return 30;
  }

  private estimateMemory(analysisResult: SchemaAnalysisResult): number {
    let totalSize = 0;

    for (const table of analysisResult.tables) {
      let tableSize = 0;
      for (const column of table.columns) {
        if (column.type.includes("INT")) tableSize += 4;
        else if (column.type.includes("VARCHAR")) tableSize += 100;
        else if (column.type.includes("TEXT")) tableSize += 500;
        else tableSize += 50;
      }
      totalSize += tableSize;
    }

    return totalSize / 1024; // KB to MB
  }

  private calculateDatabaseScore(
    analysisResult: SchemaAnalysisResult,
    databaseType: DatabaseType
  ): number {
    let score = 70;

    switch (databaseType) {
      case DatabaseType.PostgreSQL:
        // Bonus for JSON columns
        const hasJsonColumns = analysisResult.tables.some(table =>
          table.columns.some(col => col.type.includes("JSON"))
        );
        if (hasJsonColumns) score += 10;
        break;

      case DatabaseType.MySQL:
        // Bonus for proper indexing
        const hasIndexes = analysisResult.tables.every(
          table => table.indexes && table.indexes.length > 0
        );
        if (hasIndexes) score += 15;
        break;
    }

    return Math.min(100, score);
  }

  // Recommendation methods
  private getGenerationRecommendations(metrics: PerformanceMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.executionTime > 2000) {
      recommendations.push("Consider reducing schema complexity");
      recommendations.push("Optimize JSON structure before generation");
    }

    return recommendations;
  }

  private getGenerationBottlenecks(metrics: PerformanceMetrics): string[] {
    const bottlenecks: string[] = [];

    if (metrics.executionTime > 3000) bottlenecks.push("High execution time");
    if (metrics.memoryUsage > 50) bottlenecks.push("High memory usage");

    return bottlenecks;
  }

  private getComplexityRecommendations(metrics: PerformanceMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.queryComplexity > 30) {
      recommendations.push("Consider denormalizing some relationships");
      recommendations.push("Add appropriate indexes for complex queries");
    }

    return recommendations;
  }

  private getComplexityBottlenecks(metrics: PerformanceMetrics): string[] {
    const bottlenecks: string[] = [];

    if (metrics.queryComplexity > 40) {
      bottlenecks.push("Complex query patterns detected");
    }

    return bottlenecks;
  }

  private getIndexRecommendations(analysisResult: SchemaAnalysisResult): string[] {
    const recommendations: string[] = [];

    for (const table of analysisResult.tables) {
      const fkColumns = table.columns.filter(col => col.isForeignKey);
      if (fkColumns.length > 0 && (!table.indexes || table.indexes.length === 0)) {
        recommendations.push(`Add indexes for foreign keys in table ${table.name}`);
      }
    }

    return recommendations;
  }

  private getIndexBottlenecks(analysisResult: SchemaAnalysisResult): string[] {
    const bottlenecks: string[] = [];

    const tablesWithoutIndexes = analysisResult.tables.filter(
      table => !table.indexes || table.indexes.length === 0
    );

    if (tablesWithoutIndexes.length > 0) {
      bottlenecks.push(`${tablesWithoutIndexes.length} tables without indexes`);
    }

    return bottlenecks;
  }

  private getMemoryRecommendations(analysisResult: SchemaAnalysisResult): string[] {
    const recommendations: string[] = [];

    const largeTableCount = analysisResult.tables.filter(table => table.columns.length > 20).length;

    if (largeTableCount > 0) {
      recommendations.push("Consider normalizing large tables");
      recommendations.push("Use appropriate data types to reduce memory usage");
    }

    return recommendations;
  }

  private getMemoryBottlenecks(analysisResult: SchemaAnalysisResult): string[] {
    const bottlenecks: string[] = [];

    for (const table of analysisResult.tables) {
      if (table.columns.length > 30) {
        bottlenecks.push(`Table ${table.name} has ${table.columns.length} columns`);
      }
    }

    return bottlenecks;
  }

  private getScalabilityRecommendations(analysisResult: SchemaAnalysisResult): string[] {
    const recommendations: string[] = [];

    if (analysisResult.tables.length > 25) {
      recommendations.push("Consider microservice architecture for large schemas");
      recommendations.push("Implement database sharding strategies");
    }

    return recommendations;
  }

  private getScalabilityBottlenecks(analysisResult: SchemaAnalysisResult): string[] {
    const bottlenecks: string[] = [];

    if (analysisResult.tables.length > 50) {
      bottlenecks.push("Large number of tables may impact scalability");
    }

    const relationshipCount = analysisResult.relationships?.length || 0;
    if (relationshipCount > 100) {
      bottlenecks.push("High number of relationships may impact performance");
    }

    return bottlenecks;
  }

  private getDatabaseRecommendations(databaseType: DatabaseType): string[] {
    const recommendations: string[] = [];

    switch (databaseType) {
      case DatabaseType.PostgreSQL:
        recommendations.push("Use JSONB for JSON columns");
        recommendations.push("Consider partial indexes");
        break;

      case DatabaseType.MySQL:
        recommendations.push("Use InnoDB storage engine");
        recommendations.push("Optimize buffer pool size");
        break;

      case DatabaseType.SQLServer:
        recommendations.push("Use columnstore indexes for analytics");
        recommendations.push("Enable query store");
        break;

      case DatabaseType.SQLite:
        recommendations.push("Use WAL mode for better concurrency");
        recommendations.push("Run ANALYZE regularly");
        break;
    }

    return recommendations;
  }

  private getDatabaseBottlenecks(
    databaseType: DatabaseType,
    analysisResult: SchemaAnalysisResult
  ): string[] {
    const bottlenecks: string[] = [];

    const tableCount = analysisResult.tables.length;

    switch (databaseType) {
      case DatabaseType.SQLite:
        if (tableCount > 20) {
          bottlenecks.push("SQLite may not be optimal for large schemas");
        }
        break;

      default:
        if (tableCount > 100) {
          bottlenecks.push("Very large schema may require optimization");
        }
    }

    return bottlenecks;
  }
}

/**
 * Performance benchmark utilities
 */
export class PerformanceBenchmarkUtils {
  static createPerformanceReport(results: PerformanceTestResult[]): {
    overallScore: number;
    passedTests: number;
    totalTests: number;
    summary: string;
  } {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const overallScore = results.reduce((sum, r) => sum + r.score, 0) / totalTests;

    let summary = `Performance Tests: ${passedTests}/${totalTests} passed (${Math.round(overallScore)}% overall score)`;

    const failedTests = results.filter(r => !r.passed);
    if (failedTests.length > 0) {
      summary += `\nFailed tests: ${failedTests.map(t => t.testName).join(", ")}`;
    }

    return {
      overallScore: Math.round(overallScore),
      passedTests,
      totalTests,
      summary,
    };
  }

  static getTopRecommendations(results: PerformanceTestResult[], limit: number = 5): string[] {
    const allRecommendations = results.flatMap(r => r.recommendations);
    const uniqueRecommendations = [...new Set(allRecommendations)];
    return uniqueRecommendations.slice(0, limit);
  }

  static getCriticalBottlenecks(results: PerformanceTestResult[]): string[] {
    return results
      .filter(r => !r.passed)
      .flatMap(r => r.bottlenecks)
      .filter((bottleneck, index, arr) => arr.indexOf(bottleneck) === index);
  }
}
