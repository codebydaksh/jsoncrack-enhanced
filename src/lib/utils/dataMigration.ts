import type { TableSchema, RelationshipInfo, SQLSchemaConfig } from "../../store/useSQLSchema";
import { DatabaseType } from "../../store/useSQLSchema";

/**
 * Advanced Data Migration Engine
 * Converts JSON data to SQL INSERT statements with comprehensive data transformation
 */

export interface MigrationConfig {
  batchSize: number;
  includeSchema: boolean;
  handleDuplicates: "SKIP" | "UPDATE" | "ERROR";
  dateFormat: string;
  nullHandling: "NULL" | "EMPTY_STRING" | "DEFAULT_VALUE";
  escapeStrategy: "STANDARD" | "AGGRESSIVE";
  validateData: boolean;
  generateTransactionBlocks: boolean;
}

export interface MigrationResult {
  totalRecords: number;
  processedRecords: number;
  insertStatements: string[];
  errors: MigrationError[];
  statistics: MigrationStatistics;
  warnings: string[];
}

export interface MigrationError {
  recordIndex: number;
  tableName: string;
  columnName?: string;
  errorType: "TYPE_MISMATCH" | "NULL_CONSTRAINT" | "FOREIGN_KEY" | "VALIDATION" | "FORMAT";
  message: string;
  originalValue: any;
  suggestedFix?: string;
}

export interface MigrationStatistics {
  processingTimeMs: number;
  recordsPerSecond: number;
  tableStatistics: Record<
    string,
    {
      totalRecords: number;
      successfulInserts: number;
      errors: number;
      avgRecordSize: number;
    }
  >;
  dataTypeDistribution: Record<string, number>;
  nullValueCount: number;
  transformationCount: number;
}

/**
 * Utility function to create and use the migration engine
 */
export async function migrateJSONToSQL(
  jsonData: any,
  tables: TableSchema[],
  relationships: RelationshipInfo[],
  dbConfig: SQLSchemaConfig,
  migrationConfig?: Partial<MigrationConfig>,
  progressCallback?: (progress: number) => void
): Promise<MigrationResult> {
  const config: MigrationConfig = {
    batchSize: 1000,
    includeSchema: true,
    handleDuplicates: "SKIP",
    dateFormat: "YYYY-MM-DD HH:mm:ss",
    nullHandling: "NULL",
    escapeStrategy: "STANDARD",
    validateData: true,
    generateTransactionBlocks: true,
    ...migrationConfig,
  };

  const startTime = Date.now();
  const result: MigrationResult = {
    totalRecords: 0,
    processedRecords: 0,
    insertStatements: [],
    errors: [],
    statistics: {
      processingTimeMs: 0,
      recordsPerSecond: 0,
      tableStatistics: {},
      dataTypeDistribution: {},
      nullValueCount: 0,
      transformationCount: 0,
    },
    warnings: [],
  };

  try {
    // Simple implementation for now
    if (Array.isArray(jsonData)) {
      result.totalRecords = jsonData.length;

      for (const table of tables) {
        const insertStatement = generateInsertStatement(table, jsonData, config, dbConfig);
        if (insertStatement) {
          result.insertStatements.push(insertStatement);
          result.processedRecords += jsonData.length;
        }
      }
    } else {
      result.totalRecords = 1;

      for (const table of tables) {
        const insertStatement = generateInsertStatement(table, [jsonData], config, dbConfig);
        if (insertStatement) {
          result.insertStatements.push(insertStatement);
          result.processedRecords += 1;
        }
      }
    }

    // Update progress
    progressCallback?.(100);

    // Finalize statistics
    const endTime = Date.now();
    result.statistics.processingTimeMs = endTime - startTime;
    result.statistics.recordsPerSecond =
      result.processedRecords / (result.statistics.processingTimeMs / 1000);
  } catch (error) {
    result.errors.push({
      recordIndex: -1,
      tableName: "MIGRATION_ENGINE",
      errorType: "VALIDATION",
      message: `Migration failed: ${error instanceof Error ? error.message : String(error)}`,
      originalValue: null,
    });
  }

  return result;
}

function generateInsertStatement(
  table: TableSchema,
  data: any[],
  config: MigrationConfig,
  dbConfig: SQLSchemaConfig
): string | null {
  if (!data.length) return null;

  const columns = table.columns.map(col => escapeColumnName(col.name, dbConfig.databaseType));
  const columnList = columns.join(", ");

  const valueRows = data.map(record => {
    const values = table.columns.map(col => {
      const value = record[col.name];
      return formatSQLValue(value, col.type);
    });
    return `(${values.join(", ")})`;
  });

  const tableName = escapeTableName(table.name, dbConfig.databaseType);
  let statement = `INSERT INTO ${tableName} (${columnList}) VALUES\n${valueRows.join(",\n")};`;

  if (config.generateTransactionBlocks) {
    statement = `BEGIN TRANSACTION;\n${statement}\nCOMMIT;`;
  }

  return statement;
}

function formatSQLValue(value: any, columnType: string): string {
  if (value === null || value === undefined) {
    return "NULL";
  }

  const type = columnType.toUpperCase();

  // String types need quotes
  if (
    type.includes("VARCHAR") ||
    type.includes("TEXT") ||
    type.includes("CHAR") ||
    type.includes("DATE") ||
    type.includes("TIMESTAMP") ||
    type.includes("UUID")
  ) {
    return `'${String(value).replace(/'/g, "''")}'`;
  }

  // JSON types need quotes
  if (type.includes("JSON")) {
    return `'${JSON.stringify(value)}'`;
  }

  // Numeric and boolean types don't need quotes
  return String(value);
}

function escapeTableName(tableName: string, databaseType: DatabaseType): string {
  switch (databaseType) {
    case DatabaseType.PostgreSQL:
      return `"${tableName}"`;
    case DatabaseType.MySQL:
      return `\`${tableName}\``;
    case DatabaseType.SQLServer:
      return `[${tableName}]`;
    case DatabaseType.SQLite:
      return `"${tableName}"`;
    default:
      return tableName;
  }
}

function escapeColumnName(columnName: string, databaseType: DatabaseType): string {
  return escapeTableName(columnName, databaseType);
}
