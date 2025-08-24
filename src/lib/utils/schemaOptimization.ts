import type {
  TableSchema,
  RelationshipInfo,
  SQLSchemaConfig,
  SchemaRecommendation,
} from "../../store/useSQLSchema";
import { DatabaseType } from "../../store/useSQLSchema";

/**
 * Advanced Schema Optimization Engine
 * Provides intelligent performance recommendations, index strategies, and partitioning suggestions
 */

export interface OptimizationRecommendation extends SchemaRecommendation {
  category: "INDEX" | "PARTITION" | "CONSTRAINT" | "NORMALIZATION" | "PERFORMANCE" | "STORAGE";
  priority: number; // 1-10 scale
  estimatedImpact: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  implementationComplexity: "SIMPLE" | "MODERATE" | "COMPLEX";
  resourceCost: "LOW" | "MEDIUM" | "HIGH";
  sqlStatements: string[];
  reasoning: string;
  prerequisites?: string[];
}

export interface PerformanceAnalysis {
  queryComplexity: number; // 1-10 scale
  joinComplexity: number;
  indexCoverage: number; // percentage
  normalizationScore: number;
  dataVolumeScore: number;
  concurrencyScore: number;
  overallScore: number;
  bottlenecks: string[];
}

export interface IndexStrategy {
  tableName: string;
  indexName: string;
  columns: string[];
  indexType: "BTREE" | "HASH" | "GIN" | "GIST" | "BITMAP" | "COVERING";
  unique: boolean;
  partial?: string; // WHERE clause for partial indexes
  reasoning: string;
  estimatedSelectivity: number;
  estimatedCardinality: number;
}

export interface PartitioningStrategy {
  tableName: string;
  partitionType: "RANGE" | "HASH" | "LIST" | "COMPOSITE";
  partitionColumn: string;
  partitionCount?: number;
  partitionRanges?: Array<{ min: any; max: any }>;
  reasoning: string;
  estimatedBenefit: string;
  maintenanceComplexity: "LOW" | "MEDIUM" | "HIGH";
}

/**
 * Main Schema Optimization Engine
 */
export class SchemaOptimizationEngine {
  constructor(
    private tables: TableSchema[],
    private relationships: RelationshipInfo[],
    private config: SQLSchemaConfig
  ) {}

  /**
   * Generate comprehensive optimization recommendations
   */
  async generateOptimizations(): Promise<{
    recommendations: OptimizationRecommendation[];
    performanceAnalysis: PerformanceAnalysis;
    indexStrategies: IndexStrategy[];
    partitioningStrategies: PartitioningStrategy[];
  }> {
    const performanceAnalysis = this.analyzePerformance();
    const indexStrategies = this.generateIndexStrategies();
    const partitioningStrategies = this.generatePartitioningStrategies();
    const recommendations = await this.generateRecommendations(
      performanceAnalysis,
      indexStrategies,
      partitioningStrategies
    );

    return {
      recommendations,
      performanceAnalysis,
      indexStrategies,
      partitioningStrategies,
    };
  }

  /**
   * Analyze overall schema performance characteristics
   */
  private analyzePerformance(): PerformanceAnalysis {
    const queryComplexity = this.calculateQueryComplexity();
    const joinComplexity = this.calculateJoinComplexity();
    const indexCoverage = this.calculateIndexCoverage();
    const normalizationScore = this.calculateNormalizationScore();
    const dataVolumeScore = this.estimateDataVolumeScore();
    const concurrencyScore = this.estimateConcurrencyScore();

    const overallScore = Math.round(
      ((queryComplexity * 0.2 +
        (10 - joinComplexity) * 0.25 +
        indexCoverage * 0.1 +
        normalizationScore * 0.15 +
        dataVolumeScore * 0.15 +
        concurrencyScore * 0.15) /
        6) *
        100
    );

    const bottlenecks = this.identifyBottlenecks(
      queryComplexity,
      joinComplexity,
      indexCoverage,
      normalizationScore
    );

    return {
      queryComplexity,
      joinComplexity,
      indexCoverage,
      normalizationScore,
      dataVolumeScore,
      concurrencyScore,
      overallScore,
      bottlenecks,
    };
  }

  /**
   * Calculate query complexity based on table structure
   */
  private calculateQueryComplexity(): number {
    let complexity = 0;

    for (const table of this.tables) {
      // Factor in column count
      complexity += Math.min(table.columns.length * 0.1, 2);

      // Factor in data types (JSON, TEXT increase complexity)
      const complexTypes = table.columns.filter(col =>
        ["JSON", "TEXT", "NVARCHAR(MAX)"].includes(col.type)
      );
      complexity += complexTypes.length * 0.5;

      // Factor in relationships
      const tableRelationships = this.relationships.filter(
        rel => rel.sourceTable === table.name || rel.targetTable === table.name
      );
      complexity += tableRelationships.length * 0.3;
    }

    return Math.min(Math.round(complexity), 10);
  }

  /**
   * Calculate join complexity based on relationships
   */
  private calculateJoinComplexity(): number {
    let complexity = 0;

    // Count total relationships
    complexity += this.relationships.length * 0.5;

    // Factor in many-to-many relationships (higher complexity)
    const manyToManyCount = this.relationships.filter(
      rel => rel.relationshipType === "MANY_TO_MANY"
    ).length;
    complexity += manyToManyCount * 1.5;

    // Factor in junction tables
    const junctionTables = this.tables.filter(
      table => table.name.includes("_") && table.columns.length <= 4
    );
    complexity += junctionTables.length * 0.8;

    return Math.min(Math.round(complexity), 10);
  }

  /**
   * Calculate current index coverage
   */
  private calculateIndexCoverage(): number {
    let indexedColumns = 0;
    let totalColumns = 0;

    for (const table of this.tables) {
      totalColumns += table.columns.length;

      // Count primary key columns
      indexedColumns += table.columns.filter(col => col.isPrimaryKey).length;

      // Count foreign key columns
      indexedColumns += table.columns.filter(col => col.isForeignKey).length;

      // Count unique columns
      indexedColumns += table.columns.filter(col => col.constraints?.includes("UNIQUE")).length;

      // Count existing indexes
      if (table.indexes) {
        indexedColumns += table.indexes.reduce((sum, idx) => sum + idx.columns.length, 0);
      }
    }

    return totalColumns > 0 ? Math.round((indexedColumns / totalColumns) * 100) : 0;
  }

  /**
   * Calculate normalization score
   */
  private calculateNormalizationScore(): number {
    let score = 8; // Start with good base score

    // Check for potential normalization issues
    for (const table of this.tables) {
      // Deduct for wide tables (potential 1NF violations)
      if (table.columns.length > 15) {
        score -= 1;
      }

      // Deduct for JSON columns (potential normalization opportunities)
      const jsonColumns = table.columns.filter(col => col.type.includes("JSON"));
      score -= jsonColumns.length * 0.5;

      // Deduct for repeated column patterns (potential 2NF violations)
      const columnNames = table.columns.map(col => col.name.toLowerCase());
      const patterns = ["address", "phone", "email"];
      for (const pattern of patterns) {
        const patternCount = columnNames.filter(name => name.includes(pattern)).length;
        if (patternCount > 1) {
          score -= 0.5;
        }
      }
    }

    return Math.max(Math.round(score), 1);
  }

  /**
   * Estimate data volume score based on schema characteristics
   */
  private estimateDataVolumeScore(): number {
    let score = 7; // Default moderate score

    // Factor in table count
    if (this.tables.length > 20) score -= 1;
    if (this.tables.length > 50) score -= 1;

    // Factor in wide tables
    const wideTables = this.tables.filter(table => table.columns.length > 20);
    score -= wideTables.length * 0.5;

    // Factor in TEXT/JSON columns (higher storage overhead)
    let textColumns = 0;
    for (const table of this.tables) {
      textColumns += table.columns.filter(col =>
        ["TEXT", "JSON", "NVARCHAR(MAX)"].includes(col.type)
      ).length;
    }
    score -= textColumns * 0.2;

    return Math.max(Math.round(score), 1);
  }

  /**
   * Estimate concurrency score
   */
  private estimateConcurrencyScore(): number {
    let score = 7; // Default good score

    // Factor in foreign key relationships (can cause locking issues)
    score -= Math.min(this.relationships.length * 0.1, 2);

    // Factor in tables without primary keys (concurrency issues)
    const tablesWithoutPK = this.tables.filter(table => !table.primaryKey);
    score -= tablesWithoutPK.length * 1;

    // Factor in complex constraints (can slow down writes)
    let constraintCount = 0;
    for (const table of this.tables) {
      constraintCount += table.columns.reduce(
        (sum, col) => sum + (col.constraints?.length || 0),
        0
      );
    }
    score -= Math.min(constraintCount * 0.05, 2);

    return Math.max(Math.round(score), 1);
  }

  /**
   * Identify performance bottlenecks
   */
  private identifyBottlenecks(
    queryComplexity: number,
    joinComplexity: number,
    indexCoverage: number,
    normalizationScore: number
  ): string[] {
    const bottlenecks: string[] = [];

    if (queryComplexity > 7) {
      bottlenecks.push("High query complexity due to complex table structures");
    }

    if (joinComplexity > 7) {
      bottlenecks.push("High join complexity due to many relationships");
    }

    if (indexCoverage < 40) {
      bottlenecks.push("Low index coverage may impact query performance");
    }

    if (normalizationScore < 5) {
      bottlenecks.push("Schema normalization issues detected");
    }

    const largeTables = this.tables.filter(table => table.columns.length > 25);
    if (largeTables.length > 0) {
      bottlenecks.push(`Wide tables detected: ${largeTables.map(t => t.name).join(", ")}`);
    }

    const manyToManyCount = this.relationships.filter(
      rel => rel.relationshipType === "MANY_TO_MANY"
    ).length;
    if (manyToManyCount > 5) {
      bottlenecks.push("High number of many-to-many relationships");
    }

    return bottlenecks;
  }

  /**
   * Generate intelligent index strategies
   */
  private generateIndexStrategies(): IndexStrategy[] {
    const strategies: IndexStrategy[] = [];

    for (const table of this.tables) {
      // Strategy 1: Index foreign key columns
      const fkColumns = table.columns.filter(col => col.isForeignKey);
      for (const col of fkColumns) {
        strategies.push({
          tableName: table.name,
          indexName: `idx_${table.name}_${col.name}`,
          columns: [col.name],
          indexType: "BTREE",
          unique: false,
          reasoning: "Foreign key columns are frequently used in JOIN operations",
          estimatedSelectivity: 0.1,
          estimatedCardinality: 1000,
        });
      }

      // Strategy 2: Composite indexes for frequent query patterns
      const dateColumns = table.columns.filter(col =>
        ["DATE", "TIMESTAMP", "DATETIME2"].includes(col.type)
      );
      const statusColumns = table.columns.filter(
        col => col.name.toLowerCase().includes("status") || col.name.toLowerCase().includes("state")
      );

      if (dateColumns.length > 0 && statusColumns.length > 0) {
        strategies.push({
          tableName: table.name,
          indexName: `idx_${table.name}_status_date`,
          columns: [statusColumns[0].name, dateColumns[0].name],
          indexType: "BTREE",
          unique: false,
          reasoning: "Status + date queries are common for reporting and filtering",
          estimatedSelectivity: 0.05,
          estimatedCardinality: 5000,
        });
      }

      // Strategy 3: Unique indexes for business keys
      const uniqueColumns = table.columns.filter(
        col => col.constraints?.includes("UNIQUE") && !col.isPrimaryKey
      );
      for (const col of uniqueColumns) {
        strategies.push({
          tableName: table.name,
          indexName: `idx_${table.name}_${col.name}_unique`,
          columns: [col.name],
          indexType: "BTREE",
          unique: true,
          reasoning: "Unique constraints benefit from dedicated indexes",
          estimatedSelectivity: 1.0,
          estimatedCardinality: 10000,
        });
      }

      // Strategy 4: Covering indexes for frequently accessed columns
      const searchableColumns = table.columns.filter(col => {
        const name = col.name.toLowerCase();
        return (
          name.includes("name") ||
          name.includes("title") ||
          name.includes("email") ||
          name.includes("code")
        );
      });

      if (searchableColumns.length >= 2) {
        const coveringColumns = [searchableColumns[0].name];
        if (dateColumns.length > 0) {
          coveringColumns.push(dateColumns[0].name);
        }

        strategies.push({
          tableName: table.name,
          indexName: `idx_${table.name}_covering`,
          columns: coveringColumns,
          indexType: "COVERING",
          unique: false,
          reasoning: "Covering index for common lookup patterns",
          estimatedSelectivity: 0.2,
          estimatedCardinality: 2000,
        });
      }

      // Strategy 5: Partial indexes for filtered queries (PostgreSQL/SQL Server)
      if (
        (this.config.databaseType === DatabaseType.PostgreSQL ||
          this.config.databaseType === DatabaseType.SQLServer) &&
        statusColumns.length > 0
      ) {
        strategies.push({
          tableName: table.name,
          indexName: `idx_${table.name}_active_only`,
          columns: [statusColumns[0].name],
          indexType: "BTREE",
          unique: false,
          partial: `${statusColumns[0].name} = 'ACTIVE'`,
          reasoning: "Partial index for active records reduces index size",
          estimatedSelectivity: 0.3,
          estimatedCardinality: 3000,
        });
      }
    }

    return strategies;
  }

  /**
   * Generate partitioning strategies for large tables
   */
  private generatePartitioningStrategies(): PartitioningStrategy[] {
    const strategies: PartitioningStrategy[] = [];

    // Only suggest partitioning for databases that support it well
    if (
      this.config.databaseType !== DatabaseType.PostgreSQL &&
      this.config.databaseType !== DatabaseType.SQLServer
    ) {
      return strategies;
    }

    for (const table of this.tables) {
      // Strategy 1: Date-based partitioning for time-series data
      const dateColumns = table.columns.filter(col =>
        ["DATE", "TIMESTAMP", "DATETIME2"].includes(col.type)
      );

      if (dateColumns.length > 0 && table.columns.length > 10) {
        const dateCol =
          dateColumns.find(col => col.name.toLowerCase().includes("created")) || dateColumns[0];

        strategies.push({
          tableName: table.name,
          partitionType: "RANGE",
          partitionColumn: dateCol.name,
          partitionRanges: [
            { min: "2023-01-01", max: "2023-12-31" },
            { min: "2024-01-01", max: "2024-12-31" },
            { min: "2025-01-01", max: "2025-12-31" },
          ],
          reasoning: "Date-based partitioning improves query performance for time-range queries",
          estimatedBenefit: "30-70% improvement for date-range queries",
          maintenanceComplexity: "MEDIUM",
        });
      }

      // Strategy 2: Hash partitioning for even distribution
      const pkColumn = table.columns.find(col => col.isPrimaryKey);
      if (pkColumn && table.columns.length > 15) {
        strategies.push({
          tableName: table.name,
          partitionType: "HASH",
          partitionColumn: pkColumn.name,
          partitionCount: 4,
          reasoning: "Hash partitioning provides even data distribution for large tables",
          estimatedBenefit: "20-40% improvement for large table scans",
          maintenanceComplexity: "LOW",
        });
      }

      // Strategy 3: List partitioning for status-based queries
      const statusColumns = table.columns.filter(
        col =>
          col.name.toLowerCase().includes("status") || col.name.toLowerCase().includes("category")
      );

      if (statusColumns.length > 0 && table.columns.length > 8) {
        strategies.push({
          tableName: table.name,
          partitionType: "LIST",
          partitionColumn: statusColumns[0].name,
          reasoning: "List partitioning optimizes queries filtered by status/category",
          estimatedBenefit: "40-60% improvement for status-filtered queries",
          maintenanceComplexity: "MEDIUM",
        });
      }
    }

    return strategies;
  }

  /**
   * Generate comprehensive optimization recommendations
   */
  private async generateRecommendations(
    performance: PerformanceAnalysis,
    indexes: IndexStrategy[],
    partitions: PartitioningStrategy[]
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Index recommendations
    for (const index of indexes.slice(0, 10)) {
      // Limit to top 10
      recommendations.push({
        type: "INDEX",
        category: "INDEX",
        severity: "MEDIUM",
        priority: this.calculateIndexPriority(index),
        estimatedImpact: this.estimateIndexImpact(index),
        implementationComplexity: "SIMPLE",
        resourceCost: "LOW",
        message: `Create ${index.indexType} index on ${index.tableName}.${index.columns.join(", ")}`,
        suggestedAction: this.generateIndexSQL(index),
        impact: `Estimated ${this.estimatePerformanceGain(index)}% performance improvement`,
        sqlStatements: [this.generateIndexSQL(index)],
        reasoning: index.reasoning,
      });
    }

    // Partitioning recommendations
    for (const partition of partitions.slice(0, 5)) {
      // Limit to top 5
      recommendations.push({
        type: "PERFORMANCE",
        category: "PARTITION",
        severity: "HIGH",
        priority: 8,
        estimatedImpact: "HIGH",
        implementationComplexity: "COMPLEX",
        resourceCost: "HIGH",
        message: `Consider ${partition.partitionType} partitioning for table ${partition.tableName}`,
        suggestedAction: `Implement ${partition.partitionType} partitioning on ${partition.partitionColumn}`,
        impact: partition.estimatedBenefit,
        sqlStatements: [this.generatePartitionSQL(partition)],
        reasoning: partition.reasoning,
        prerequisites: [
          "Backup table data",
          "Plan maintenance windows",
          "Test in staging environment",
        ],
      });
    }

    // Performance-based recommendations
    if (performance.overallScore < 60) {
      recommendations.push({
        type: "PERFORMANCE",
        category: "PERFORMANCE",
        severity: "HIGH",
        priority: 9,
        estimatedImpact: "CRITICAL",
        implementationComplexity: "MODERATE",
        resourceCost: "MEDIUM",
        message: "Schema performance score is below optimal (< 60%)",
        suggestedAction: "Review and implement top index and normalization recommendations",
        impact: "Significant improvement in query performance and scalability",
        sqlStatements: [],
        reasoning: "Multiple performance issues detected in schema design",
      });
    }

    if (performance.indexCoverage < 40) {
      recommendations.push({
        type: "INDEX",
        category: "INDEX",
        severity: "HIGH",
        priority: 8,
        estimatedImpact: "HIGH",
        implementationComplexity: "SIMPLE",
        resourceCost: "LOW",
        message: "Low index coverage detected (< 40%)",
        suggestedAction: "Add indexes on frequently queried columns",
        impact: "30-50% improvement in query performance",
        sqlStatements: [],
        reasoning: "Insufficient indexing will lead to full table scans",
      });
    }

    // Normalization recommendations
    if (performance.normalizationScore < 5) {
      recommendations.push({
        type: "NORMALIZATION",
        category: "NORMALIZATION",
        severity: "MEDIUM",
        priority: 6,
        estimatedImpact: "MEDIUM",
        implementationComplexity: "COMPLEX",
        resourceCost: "HIGH",
        message: "Schema normalization issues detected",
        suggestedAction: "Review wide tables and consider normalization",
        impact: "Improved data integrity and reduced storage requirements",
        sqlStatements: [],
        reasoning: "Denormalized schema may lead to data inconsistencies and storage waste",
      });
    }

    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  // Helper methods for recommendation generation
  private calculateIndexPriority(index: IndexStrategy): number {
    let priority = 5; // Base priority

    if (index.unique) priority += 2;
    if (index.columns.length === 1) priority += 1;
    if (index.indexType === "COVERING") priority += 2;
    if (index.partial) priority += 1;

    return Math.min(priority, 10);
  }

  private estimateIndexImpact(index: IndexStrategy): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
    if (index.estimatedSelectivity > 0.8) return "HIGH";
    if (index.estimatedSelectivity > 0.5) return "MEDIUM";
    return "LOW";
  }

  private estimatePerformanceGain(index: IndexStrategy): number {
    const baseGain = index.unique ? 70 : 40;
    const selectivityFactor = index.estimatedSelectivity * 50;
    return Math.round(baseGain + selectivityFactor);
  }

  private generateIndexSQL(index: IndexStrategy): string {
    const uniqueKeyword = index.unique ? "UNIQUE " : "";
    const partialClause = index.partial ? ` WHERE ${index.partial}` : "";

    return `CREATE ${uniqueKeyword}INDEX ${index.indexName} ON ${index.tableName} (${index.columns.join(", ")})${partialClause};`;
  }

  private generatePartitionSQL(partition: PartitioningStrategy): string {
    // This is a simplified example - actual partitioning SQL varies by database
    switch (partition.partitionType) {
      case "RANGE":
        return `-- Example range partitioning for ${partition.tableName}
ALTER TABLE ${partition.tableName} PARTITION BY RANGE (${partition.partitionColumn});`;

      case "HASH":
        return `-- Example hash partitioning for ${partition.tableName}
ALTER TABLE ${partition.tableName} PARTITION BY HASH (${partition.partitionColumn}) PARTITIONS ${partition.partitionCount};`;

      case "LIST":
        return `-- Example list partitioning for ${partition.tableName}
ALTER TABLE ${partition.tableName} PARTITION BY LIST (${partition.partitionColumn});`;

      default:
        return `-- Partitioning strategy for ${partition.tableName}`;
    }
  }
}

/**
 * Utility function to create and run schema optimization
 */
export async function optimizeSchema(
  tables: TableSchema[],
  relationships: RelationshipInfo[],
  config: SQLSchemaConfig
) {
  const engine = new SchemaOptimizationEngine(tables, relationships, config);
  return await engine.generateOptimizations();
}
