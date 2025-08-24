import { detectDataType } from "./dataTypeInference";
import { 
  TableSchema, 
  ColumnSchema, 
  ForeignKeySchema,
  IndexSchema,
  SchemaAnalysisResult, 
  SQLSchemaConfig,
  RelationshipInfo,
  SchemaRecommendation,
  PerformanceMetrics,
  NormalizationLevel,
  NamingConvention
} from "../../store/useSQLSchema";

export interface JSONFieldAnalysis {
  name: string;
  type: string;
  sqlType: string;
  nullable: boolean;
  samples: any[];
  isArray: boolean;
  isObject: boolean;
  arrayItemType?: string;
  objectSchema?: JSONFieldAnalysis[];
  constraints: string[];
  isUnique: boolean;
  isPrimaryKeyCandidate: boolean;
  isForeignKeyCandidate: boolean;
  referencedTable?: string;
  estimatedLength?: number;
  patterns: string[];
}

export interface TableDefinition {
  name: string;
  fields: JSONFieldAnalysis[];
  source: "root" | "nested" | "array";
  parentTable?: string;
  relationshipType?: "ONE_TO_ONE" | "ONE_TO_MANY" | "MANY_TO_MANY";
}

/**
 * Analyzes JSON structure and generates SQL schema
 */
export async function analyzeJSONStructure(
  data: any,
  config: SQLSchemaConfig
): Promise<SchemaAnalysisResult> {
  try {
    // Step 1: Parse and analyze the JSON structure
    const tableDefinitions = await parseJSONStructure(data, config);
    
    // Step 2: Convert to SQL schema
    const tables = await generateTableSchemas(tableDefinitions, config);
    
    // Step 3: Detect relationships
    const relationships = await detectRelationships(tableDefinitions, config);
    
    // Step 4: Generate recommendations
    const recommendations = await generateRecommendations(tables, relationships, config);
    
    // Step 5: Estimate performance metrics
    const estimatedPerformance = await calculatePerformanceMetrics(tables, relationships);
    
    // Step 6: Generate migration script
    const migrationScript = await generateMigrationScript(tables, relationships, config);

    return {
      tables,
      relationships,
      recommendations,
      migrationScript,
      estimatedPerformance
    };
  } catch (error) {
    console.error("JSON structure analysis failed:", error);
    throw new Error(`Failed to analyze JSON structure: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Recursively parses JSON structure and extracts table definitions
 */
async function parseJSONStructure(
  data: any,
  config: SQLSchemaConfig,
  tableName = "main_table",
  depth = 0
): Promise<TableDefinition[]> {
  const tables: TableDefinition[] = [];
  
  if (Array.isArray(data)) {
    // Handle array at root level
    if (data.length === 0) {
      return [{
        name: tableName,
        fields: [],
        source: "root"
      }];
    }
    
    // Analyze array items to infer structure
    const arrayItemStructure = analyzeArrayItems(data);
    const fields = await analyzeFields(arrayItemStructure, config);
    
    tables.push({
      name: tableName,
      fields,
      source: "root"
    });
  } else if (typeof data === "object" && data !== null) {
    // Handle object structure
    const fields = await analyzeFields(data, config);
    
    tables.push({
      name: tableName,
      fields,
      source: "root"
    });
    
    // Process nested objects and arrays
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value) && value.length > 0) {
        const nestedTableName = formatTableName(`${tableName}_${key}`, config.namingConvention);
        const nestedTables = await parseJSONStructure(value, config, nestedTableName, depth + 1);
        
        // Add relationship information
        nestedTables.forEach(table => {
          table.parentTable = tableName;
          table.relationshipType = "ONE_TO_MANY";
          table.source = "array";
        });
        
        tables.push(...nestedTables);
      } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        if (config.normalizationLevel !== NormalizationLevel.Denormalized && depth < 3) {
          const nestedTableName = formatTableName(`${tableName}_${key}`, config.namingConvention);
          const nestedTables = await parseJSONStructure(value, config, nestedTableName, depth + 1);
          
          nestedTables.forEach(table => {
            table.parentTable = tableName;
            table.relationshipType = "ONE_TO_ONE";
            table.source = "nested";
          });
          
          tables.push(...nestedTables);
        }
      }
    }
  }
  
  return tables;
}

/**
 * Analyzes array items to infer consistent structure
 */
function analyzeArrayItems(array: any[]): any {
  if (array.length === 0) return {};
  
  // Take first item as base structure
  const baseStructure = array[0];
  
  if (typeof baseStructure !== "object" || baseStructure === null) {
    return { value: array[0] };
  }
  
  // Merge all object keys to get complete structure
  const mergedStructure: any = {};
  
  array.forEach(item => {
    if (typeof item === "object" && item !== null) {
      Object.keys(item).forEach(key => {
        if (!(key in mergedStructure)) {
          mergedStructure[key] = item[key];
        }
      });
    }
  });
  
  return mergedStructure;
}

/**
 * Analyzes individual fields to determine their characteristics
 */
async function analyzeFields(obj: any, config: SQLSchemaConfig): Promise<JSONFieldAnalysis[]> {
  const fields: JSONFieldAnalysis[] = [];
  
  if (typeof obj !== "object" || obj === null) {
    // Handle primitive values
    return [{
      name: "value",
      type: typeof obj,
      sqlType: inferSQLType(obj, typeof obj),
      nullable: obj === null,
      samples: [obj],
      isArray: false,
      isObject: false,
      constraints: [],
      isUnique: false,
      isPrimaryKeyCandidate: false,
      isForeignKeyCandidate: false,
      patterns: detectPatterns(obj)
    }];
  }
  
  for (const [key, value] of Object.entries(obj)) {
    const fieldName = formatColumnName(key, config.namingConvention);
    const analysis = await analyzeField(key, value, config);
    fields.push({
      ...analysis,
      name: fieldName
    });
  }
  
  return fields;
}

/**
 * Analyzes a single field to determine its type and characteristics
 */
async function analyzeField(key: string, value: any, config: SQLSchemaConfig): Promise<JSONFieldAnalysis> {
  const baseType = typeof value;
  const isArray = Array.isArray(value);
  const isObject = typeof value === "object" && value !== null && !isArray;
  
  let samples = [value];
  let arrayItemType: string | undefined;
  let objectSchema: JSONFieldAnalysis[] | undefined;
  
  if (isArray) {
    samples = value.slice(0, 10); // Sample first 10 items
    if (value.length > 0) {
      arrayItemType = detectDataType(value[0]);
    }
  } else if (isObject) {
    objectSchema = await analyzeFields(value, config);
  }
  
  const detectedType = detectDataType(value);
  const sqlType = inferSQLType(value, detectedType);
  const patterns = detectPatterns(value);
  
  // Enhanced nullable detection for arrays
  const nullable = analyzeNullability(samples, isArray);
  
  return {
    name: key,
    type: detectedType,
    sqlType,
    nullable,
    samples,
    isArray,
    isObject,
    arrayItemType,
    objectSchema,
    constraints: generateAdvancedConstraints(value, detectedType, key, samples),
    isUnique: detectUniqueness(key, value),
    isPrimaryKeyCandidate: detectPrimaryKeyCandidate(key, value, detectedType),
    isForeignKeyCandidate: detectForeignKeyCandidate(key, value, detectedType),
    estimatedLength: estimateFieldLength(value, detectedType),
    patterns
  };
}

/**
 * Infers SQL data type from JSON value and detected type
 */
function inferSQLType(value: any, detectedType: string): string {
  switch (detectedType) {
    case "string":
      if (typeof value === "string") {
        if (value.length <= 50) return "VARCHAR(50)";
        if (value.length <= 255) return "VARCHAR(255)";
        return "TEXT";
      }
      return "TEXT";
    
    case "number":
      if (Number.isInteger(value)) {
        if (value >= -2147483648 && value <= 2147483647) return "INTEGER";
        return "BIGINT";
      }
      return "DECIMAL(10,2)";
    
    case "boolean":
      return "BOOLEAN";
    
    case "date":
      return "TIMESTAMP";
    
    case "uuid":
      return "UUID";
    
    case "email":
      return "VARCHAR(255)";
    
    case "url":
      return "VARCHAR(500)";
    
    case "json":
      return "JSON";
    
    case "array":
      return "JSON";
    
    case "object":
      return "JSON";
    
    default:
      return "TEXT";
  }
}

/**
 * Detects patterns in field values
 */
function detectPatterns(value: any): string[] {
  const patterns: string[] = [];
  
  if (typeof value === "string") {
    // Email pattern
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      patterns.push("email");
    }
    
    // URL pattern
    if (/^https?:\/\/.+/.test(value)) {
      patterns.push("url");
    }
    
    // UUID pattern
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
      patterns.push("uuid");
    }
    
    // Date patterns
    if (!isNaN(Date.parse(value))) {
      patterns.push("date");
    }
    
    // Phone number pattern
    if (/^\+?[\d\s\-\(\)]+$/.test(value) && value.length >= 10) {
      patterns.push("phone");
    }
  }
  
  return patterns;
}

/**
 * Analyzes nullability patterns in data samples
 */
function analyzeNullability(samples: any[], isArray: boolean): boolean {
  if (samples.length === 0) return true;
  
  // If any sample is null/undefined, field is nullable
  const hasNulls = samples.some(sample => sample === null || sample === undefined);
  
  if (isArray) {
    // For arrays, also check if any array items are null
    const hasNullItems = samples.some(arr => {
      if (Array.isArray(arr)) {
        return arr.some(item => item === null || item === undefined);
      }
      return false;
    });
    
    return hasNulls || hasNullItems;
  }
  
  // Additional heuristics for nullable detection
  // If we have multiple samples and some are empty strings, might be nullable
  if (samples.length > 1) {
    const hasEmptyStrings = samples.some(sample => sample === "");
    const hasUndefined = samples.some(sample => sample === undefined);
    
    if (hasEmptyStrings || hasUndefined) {
      return true;
    }
  }
  
  return hasNulls;
}

/**
 * Generates advanced constraints for a field based on comprehensive analysis
 */
function generateAdvancedConstraints(value: any, detectedType: string, fieldName: string, samples: any[]): string[] {
  const constraints: string[] = [];
  
  // Analyze nullability from samples
  const isNullable = analyzeNullability(samples, Array.isArray(value));
  
  if (!isNullable) {
    constraints.push("NOT NULL");
  }
  
  // Add specific constraints based on field name and type
  const fieldLower = fieldName.toLowerCase();
  
  // Email constraints
  if (detectedType === "email" || fieldLower.includes("email")) {
    constraints.push("CHECK (value LIKE '%@%.%' AND value NOT LIKE '%@%@%')");
  }
  
  // URL constraints
  if (detectedType === "url" || fieldLower.includes("url") || fieldLower.includes("link")) {
    constraints.push("CHECK (value LIKE 'http%://%')");
  }
  
  // Positive number constraints for financial fields
  if (detectedType === "number" && 
      (fieldLower.includes("price") || fieldLower.includes("amount") || 
       fieldLower.includes("cost") || fieldLower.includes("fee"))) {
    constraints.push("CHECK (value >= 0)");
  }
  
  // Age constraints
  if (fieldLower.includes("age") && detectedType === "number") {
    constraints.push("CHECK (value >= 0 AND value <= 150)");
  }
  
  // Status/enum constraints
  if (fieldLower.includes("status") || fieldLower.includes("state")) {
    const uniqueValues = Array.from(new Set(samples.filter(s => s !== null && s !== undefined)));
    if (uniqueValues.length <= 10 && uniqueValues.length > 1) {
      const valueList = uniqueValues.map(v => `'${v}'`).join(", ");
      constraints.push(`CHECK (value IN (${valueList}))`);
    }
  }
  
  // Length constraints for strings
  if (typeof value === "string" && detectedType === "string") {
    const maxLength = Math.max(...samples
      .filter(s => typeof s === "string")
      .map(s => s.length));
    
    if (maxLength > 0) {
      // Ensure minimum reasonable length for certain fields
      if (fieldLower.includes("name") && maxLength < 2) {
        constraints.push("CHECK (LENGTH(value) >= 1)");
      }
      if (fieldLower.includes("description") && maxLength < 10) {
        constraints.push("CHECK (LENGTH(value) >= 5)");
      }
    }
  }
  
  // UUID format validation
  if (detectedType === "uuid") {
    constraints.push("CHECK (value ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')");
  }
  
  // Date range constraints
  if (detectedType === "date" || fieldLower.includes("date") || fieldLower.includes("time")) {
    if (fieldLower.includes("birth") || fieldLower.includes("born")) {
      constraints.push("CHECK (value <= CURRENT_DATE)");
    }
    if (fieldLower.includes("created") || fieldLower.includes("updated")) {
      constraints.push("CHECK (value <= CURRENT_TIMESTAMP)");
    }
  }
  
  return constraints;
}

/**
 * Detects if a field is likely to be unique
 */
function detectUniqueness(key: string, value: any): boolean {
  const uniqueIndicators = ["id", "email", "username", "slug", "uuid"];
  const keyLower = key.toLowerCase();
  
  return uniqueIndicators.some(indicator => 
    keyLower.includes(indicator) || keyLower.endsWith("_id")
  );
}

/**
 * Detects if a field is a primary key candidate
 */
function detectPrimaryKeyCandidate(key: string, value: any, detectedType: string): boolean {
  const keyLower = key.toLowerCase();
  
  // Common primary key patterns
  if (keyLower === "id" || keyLower === "pk" || keyLower.endsWith("_id")) {
    return true;
  }
  
  // UUID fields are often primary keys
  if (detectedType === "uuid") {
    return true;
  }
  
  // Auto-incrementing integers
  if (detectedType === "number" && Number.isInteger(value) && value > 0) {
    return keyLower.includes("id");
  }
  
  return false;
}

/**
 * Detects if a field is a foreign key candidate
 */
function detectForeignKeyCandidate(key: string, value: any, detectedType: string): boolean {
  const keyLower = key.toLowerCase();
  
  // Foreign key patterns
  if (keyLower.endsWith("_id") && keyLower !== "id") {
    return true;
  }
  
  // UUID references
  if (detectedType === "uuid" && !keyLower.startsWith("id")) {
    return true;
  }
  
  return false;
}

/**
 * Estimates the required field length for VARCHAR fields
 */
function estimateFieldLength(value: any, detectedType: string): number | undefined {
  if (detectedType === "string" && typeof value === "string") {
    const length = value.length;
    
    // Round up to common VARCHAR lengths
    if (length <= 50) return 50;
    if (length <= 100) return 100;
    if (length <= 255) return 255;
    if (length <= 500) return 500;
    return 1000;
  }
  
  return undefined;
}

/**
 * Formats table name according to naming convention
 */
function formatTableName(name: string, convention: NamingConvention): string {
  switch (convention) {
    case NamingConvention.CamelCase:
      return toCamelCase(name);
    case NamingConvention.PascalCase:
      return toPascalCase(name);
    case NamingConvention.SnakeCase:
      return toSnakeCase(name);
    case NamingConvention.KebabCase:
      return toKebabCase(name);
    default:
      return name;
  }
}

/**
 * Formats column name according to naming convention
 */
function formatColumnName(name: string, convention: NamingConvention): string {
  return formatTableName(name, convention);
}

// Utility functions for naming conventions
function toCamelCase(str: string): string {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
    return index === 0 ? word.toLowerCase() : word.toUpperCase();
  }).replace(/\s+/g, '');
}

function toPascalCase(str: string): string {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => {
    return word.toUpperCase();
  }).replace(/\s+/g, '');
}

function toSnakeCase(str: string): string {
  return str.replace(/\W+/g, ' ')
    .split(/ |\B(?=[A-Z])/)
    .map(word => word.toLowerCase())
    .join('_');
}

function toKebabCase(str: string): string {
  return str.replace(/\W+/g, ' ')
    .split(/ |\B(?=[A-Z])/)
    .map(word => word.toLowerCase())
    .join('-');
}

/**
 * Generates table schemas from table definitions
 */
async function generateTableSchemas(
  tableDefinitions: TableDefinition[],
  config: SQLSchemaConfig
): Promise<TableSchema[]> {
  const tables: TableSchema[] = [];
  
  for (const tableDef of tableDefinitions) {
    const columns: ColumnSchema[] = [];
    
    // Convert fields to columns with enhanced analysis
    for (const field of tableDef.fields) {
      // Skip nested objects that should be separate tables
      if (field.isObject && config.normalizationLevel !== NormalizationLevel.Denormalized) {
        continue;
      }
      
      const column: ColumnSchema = {
        name: field.name,
        type: field.sqlType,
        nullable: field.nullable,
        isPrimaryKey: field.isPrimaryKeyCandidate,
        isForeignKey: field.isForeignKeyCandidate,
        constraints: field.constraints,
        comment: generateColumnComment(field)
      };
      
      // Add default values for certain types
      if (!field.nullable && !field.isPrimaryKeyCandidate) {
        const defaultValue = generateDefaultValue(field.sqlType, field.type);
        if (defaultValue) {
          column.defaultValue = defaultValue;
        }
      }
      
      columns.push(column);
    }
    
    // Ensure at least one primary key
    const primaryKeyColumn = columns.find(col => col.isPrimaryKey);
    if (!primaryKeyColumn && columns.length > 0) {
      // Add an auto-generated ID column
      columns.unshift({
        name: formatColumnName("id", config.namingConvention),
        type: "SERIAL",
        nullable: false,
        isPrimaryKey: true,
        constraints: ["NOT NULL"],
        comment: "Auto-generated primary key"
      });
    }
    
    // Add foreign key column for child tables
    if (tableDef.parentTable) {
      const parentIdColumn = formatColumnName(
        `${tableDef.parentTable}_id`,
        config.namingConvention
      );
      
      columns.push({
        name: parentIdColumn,
        type: "INTEGER",
        nullable: false,
        isForeignKey: true,
        constraints: ["NOT NULL"]
      });
    }
    
    const table: TableSchema = {
      name: config.tablePrefix ? `${config.tablePrefix}${tableDef.name}` : tableDef.name,
      columns,
      primaryKey: columns.find(col => col.isPrimaryKey)?.name,
      foreignKeys: generateForeignKeys(tableDef, columns, config),
      indexes: generateTableIndexes(columns, tableDef)
    };
    
    tables.push(table);
  }
  
  return tables;
}

/**
 * Generates a descriptive comment for a field
 */
function generateFieldComment(field: JSONFieldAnalysis): string {
  const parts: string[] = [];
  
  if (field.patterns.length > 0) {
    parts.push(`Detected patterns: ${field.patterns.join(", ")}`);
  }
  
  if (field.isArray) {
    parts.push(`Array of ${field.arrayItemType || "mixed"} values`);
  }
  
  if (field.estimatedLength) {
    parts.push(`Estimated max length: ${field.estimatedLength}`);
  }
  
  return parts.join(". ");
}

/**
 * Enhanced version that includes constraint information
 */
function generateColumnComment(field: JSONFieldAnalysis): string {
  const parts: string[] = [];
  
  if (field.patterns.length > 0) {
    parts.push(`Patterns: ${field.patterns.join(", ")}`);
  }
  
  if (field.isArray) {
    parts.push(`Array of ${field.arrayItemType || "mixed"} values`);
  }
  
  if (field.estimatedLength) {
    parts.push(`Max length: ${field.estimatedLength}`);
  }
  
  if (field.isUnique) {
    parts.push("Unique values detected");
  }
  
  if (field.constraints.length > 0) {
    parts.push(`Constraints: ${field.constraints.join(", ")}`);
  }
  
  return parts.join(". ") || "Generated from JSON analysis";
}

/**
 * Generates appropriate default values for columns
 */
function generateDefaultValue(sqlType: string, detectedType: string): string | undefined {
  // Only set defaults for certain types to avoid issues
  if (sqlType.includes("BOOLEAN")) {
    return "FALSE";
  }
  
  if (sqlType.includes("TIMESTAMP") && detectedType === "date") {
    return "CURRENT_TIMESTAMP";
  }
  
  // Don't set defaults for most other types to maintain data integrity
  return undefined;
}

/**
 * Detects relationships between tables
 */
async function detectRelationships(
  tableDefinitions: TableDefinition[],
  config: SQLSchemaConfig
): Promise<RelationshipInfo[]> {
  const relationships: RelationshipInfo[] = [];
  
  for (const tableDef of tableDefinitions) {
    if (tableDef.parentTable && tableDef.relationshipType) {
      relationships.push({
        sourceTable: tableDef.parentTable,
        targetTable: tableDef.name,
        relationshipType: tableDef.relationshipType,
        foreignKeyColumn: formatColumnName(`${tableDef.parentTable}_id`, config.namingConvention)
      });
    }
  }
  
  return relationships;
}

/**
 * Generates foreign key constraints for a table
 */
function generateForeignKeys(
  tableDef: TableDefinition,
  columns: ColumnSchema[],
  config: SQLSchemaConfig
): ForeignKeySchema[] {
  const foreignKeys: ForeignKeySchema[] = [];
  
  // Add foreign key for parent table relationship
  if (tableDef.parentTable) {
    const parentIdColumn = formatColumnName(
      `${tableDef.parentTable}_id`,
      config.namingConvention
    );
    
    foreignKeys.push({
      columnName: parentIdColumn,
      referencedTable: tableDef.parentTable,
      referencedColumn: "id",
      onDelete: "CASCADE",
      onUpdate: "CASCADE"
    });
  }
  
  // Add foreign keys for detected foreign key columns
  for (const column of columns) {
    if (column.isForeignKey && column.name.endsWith("_id") && column.name !== "id") {
      const referencedTable = column.name.replace("_id", "");
      
      foreignKeys.push({
        columnName: column.name,
        referencedTable: formatTableName(referencedTable, config.namingConvention),
        referencedColumn: "id",
        onDelete: "RESTRICT",
        onUpdate: "CASCADE"
      });
    }
  }
  
  return foreignKeys;
}

/**
 * Generates indexes for a table based on column analysis
 */
function generateTableIndexes(
  columns: ColumnSchema[],
  tableDef: TableDefinition
): IndexSchema[] {
  const indexes: IndexSchema[] = [];
  
  // Index foreign key columns
  const foreignKeyColumns = columns.filter(col => col.isForeignKey);
  for (const col of foreignKeyColumns) {
    indexes.push({
      name: `idx_${tableDef.name}_${col.name}`,
      columns: [col.name],
      unique: false,
      type: "BTREE"
    });
  }
  
  // Index unique columns (non-primary key)
  const uniqueColumns = columns.filter(col => 
    col.constraints?.includes("UNIQUE") && !col.isPrimaryKey
  );
  for (const col of uniqueColumns) {
    indexes.push({
      name: `idx_${tableDef.name}_${col.name}_unique`,
      columns: [col.name],
      unique: true,
      type: "BTREE"
    });
  }
  
  // Index commonly searched columns
  const searchableColumns = columns.filter(col => {
    const name = col.name.toLowerCase();
    return name.includes("name") || name.includes("title") || 
           name.includes("email") || name.includes("username") ||
           col.type.includes("VARCHAR");
  });
  
  for (const col of searchableColumns.slice(0, 3)) { // Limit to avoid too many indexes
    indexes.push({
      name: `idx_${tableDef.name}_${col.name}_search`,
      columns: [col.name],
      unique: false,
      type: "BTREE"
    });
  }
  
  return indexes;
}

/**
 * Generates schema recommendations
 */
async function generateRecommendations(
  tables: TableSchema[],
  relationships: RelationshipInfo[],
  config: SQLSchemaConfig
): Promise<SchemaRecommendation[]> {
  const recommendations: SchemaRecommendation[] = [];
  
  // Check for missing indexes
  tables.forEach(table => {
    const foreignKeyColumns = table.columns.filter(col => col.isForeignKey);
    foreignKeyColumns.forEach(col => {
      if (config.includeIndexes) {
        recommendations.push({
          type: "INDEX",
          severity: "MEDIUM",
          message: `Consider adding an index on foreign key column '${col.name}' in table '${table.name}'`,
          suggestedAction: `CREATE INDEX idx_${table.name}_${col.name} ON ${table.name} (${col.name});`,
          impact: "Improves JOIN performance by 10-100x"
        });
      }
    });
  });
  
  // Check for normalization opportunities
  if (config.normalizationLevel === NormalizationLevel.Denormalized) {
    recommendations.push({
      type: "NORMALIZATION",
      severity: "LOW",
      message: "Schema is denormalized. Consider normalizing to reduce data redundancy",
      suggestedAction: "Enable normalization in configuration",
      impact: "Reduces storage requirements and improves data consistency"
    });
  }
  
  return recommendations;
}

/**
 * Calculates performance metrics for the schema
 */
async function calculatePerformanceMetrics(
  tables: TableSchema[],
  relationships: RelationshipInfo[]
): Promise<PerformanceMetrics> {
  const totalColumns = tables.reduce((sum, table) => sum + table.columns.length, 0);
  const avgColumnsPerTable = totalColumns / tables.length;
  
  const queryComplexity = relationships.length > 5 ? "HIGH" : 
                         relationships.length > 2 ? "MEDIUM" : "LOW";
  
  const indexedColumns = tables.reduce((sum, table) => 
    sum + table.columns.filter(col => col.isPrimaryKey || col.isForeignKey).length, 0
  );
  const indexEfficiency = Math.min(100, (indexedColumns / totalColumns) * 100);
  
  const normalizationScore = Math.min(100, (relationships.length / tables.length) * 50);
  
  return {
    estimatedSize: `${tables.length} tables, ${totalColumns} columns`,
    queryComplexity,
    indexEfficiency: Math.round(indexEfficiency),
    normalizationScore: Math.round(normalizationScore)
  };
}

/**
 * Generates migration script
 */
async function generateMigrationScript(
  tables: TableSchema[],
  relationships: RelationshipInfo[],
  config: SQLSchemaConfig
): Promise<string> {
  // For now, return a placeholder - this will be implemented in Phase 3
  return "-- Migration script will be generated here";
}