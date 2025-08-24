import type {
  TableSchema,
  ColumnSchema,
  ForeignKeySchema,
  IndexSchema,
  SchemaAnalysisResult,
  SQLSchemaConfig,
  RelationshipInfo,
  SchemaRecommendation,
  PerformanceMetrics,
} from "../../store/useSQLSchema";
import { NormalizationLevel, NamingConvention } from "../../store/useSQLSchema";
import { detectDataType } from "./dataTypeInference";

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
  source: "root" | "nested" | "array" | "junction";
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

    // Step 2: Generate junction tables for many-to-many relationships
    const junctionTables = generateJunctionTables(tableDefinitions, config);
    const allTableDefinitions = [...tableDefinitions, ...junctionTables];

    // Step 3: Convert to SQL schema
    const tables = await generateTableSchemas(allTableDefinitions, config);

    // Step 4: Detect relationships (including junction table relationships)
    const relationships = await detectRelationships(allTableDefinitions, config);

    // Step 5: Generate recommendations
    const recommendations = await generateRecommendations(tables, relationships, config);

    // Step 6: Estimate performance metrics
    const estimatedPerformance = await calculatePerformanceMetrics(tables, relationships);

    // Step 7: Generate migration script
    const migrationScript = await generateMigrationScript();

    return {
      tables,
      relationships,
      recommendations,
      migrationScript,
      estimatedPerformance,
    };
  } catch (error) {
    console.error("JSON structure analysis failed:", error);
    throw new Error(
      `Failed to analyze JSON structure: ${error instanceof Error ? error.message : "Unknown error"}`
    );
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
      return [
        {
          name: tableName,
          fields: [],
          source: "root",
        },
      ];
    }

    // Analyze array items to infer structure
    const arrayItemStructure = analyzeArrayItems(data);
    const fields = await analyzeFields(arrayItemStructure, config);

    tables.push({
      name: tableName,
      fields,
      source: "root",
    });
  } else if (typeof data === "object" && data !== null) {
    // Handle object structure with normalization rules
    const { mainFields, nestedTables } = await analyzeObjectStructure(
      data,
      config,
      tableName,
      depth
    );

    tables.push({
      name: tableName,
      fields: mainFields,
      source: "root",
    });

    // Add normalized tables based on normalization level
    tables.push(...nestedTables);
  }

  return tables;
}

/**
 * Analyzes object structure and applies normalization rules
 */
async function analyzeObjectStructure(
  obj: any,
  config: SQLSchemaConfig,
  tableName: string,
  depth: number
): Promise<{ mainFields: JSONFieldAnalysis[]; nestedTables: TableDefinition[] }> {
  const mainFields: JSONFieldAnalysis[] = [];
  const nestedTables: TableDefinition[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const fieldName = formatColumnName(key, config.namingConvention);

    if (Array.isArray(value)) {
      // Handle arrays based on normalization level
      const arrayResult = await analyzeArrayField(key, value, config, tableName, depth);

      if (arrayResult.shouldNormalize) {
        nestedTables.push(...arrayResult.tables);
        // Add foreign key field to main table
        if (arrayResult.tables.length > 0) {
          // The relationship is handled in the nested table
        }
      } else {
        // Store as JSON column (denormalized)
        const analysis = await analyzeField(key, value, config);
        mainFields.push({ ...analysis, name: fieldName });
      }
    } else if (typeof value === "object" && value !== null) {
      // Handle nested objects based on normalization level
      const objectResult = await analyzeNestedObject(key, value, config, tableName, depth);

      if (objectResult.shouldNormalize) {
        nestedTables.push(...objectResult.tables);
        // Add foreign key field for one-to-one relationship
        if (objectResult.tables.length > 0) {
          const fkFieldName = formatColumnName(`${key}_id`, config.namingConvention);
          mainFields.push({
            name: fkFieldName,
            type: "integer",
            sqlType: "INTEGER",
            nullable: true,
            samples: [],
            isArray: false,
            isObject: false,
            constraints: [],
            isUnique: false,
            isPrimaryKeyCandidate: false,
            isForeignKeyCandidate: true,
            referencedTable: objectResult.tables[0].name,
            patterns: [],
          });
        }
      } else {
        // Store as JSON column or flatten (denormalized)
        if (config.normalizationLevel === NormalizationLevel.Denormalized) {
          // Flatten the object into the main table
          const flattenedFields = await flattenObject(key, value, config);
          mainFields.push(...flattenedFields);
        } else {
          // Store as JSON
          const analysis = await analyzeField(key, value, config);
          mainFields.push({ ...analysis, name: fieldName });
        }
      }
    } else {
      // Handle primitive fields
      const analysis = await analyzeField(key, value, config);
      mainFields.push({ ...analysis, name: fieldName });
    }
  }

  return { mainFields, nestedTables };
}

/**
 * Analyzes array fields and determines normalization approach
 */
async function analyzeArrayField(
  key: string,
  array: any[],
  config: SQLSchemaConfig,
  parentTable: string,
  depth: number
): Promise<{ shouldNormalize: boolean; tables: TableDefinition[] }> {
  if (array.length === 0) {
    return { shouldNormalize: false, tables: [] };
  }

  const shouldNormalize = shouldNormalizeArray(array, config, depth);

  if (!shouldNormalize) {
    return { shouldNormalize: false, tables: [] };
  }

  // Create normalized table for array items
  const nestedTableName = formatTableName(`${parentTable}_${key}`, config.namingConvention);
  const arrayItemStructure = analyzeArrayItems(array);
  const fields = await analyzeFields(arrayItemStructure, config);

  const table: TableDefinition = {
    name: nestedTableName,
    fields,
    source: "array",
    parentTable,
    relationshipType: "ONE_TO_MANY",
  };

  return { shouldNormalize: true, tables: [table] };
}

/**
 * Analyzes nested objects and determines normalization approach
 */
async function analyzeNestedObject(
  key: string,
  obj: any,
  config: SQLSchemaConfig,
  parentTable: string,
  depth: number
): Promise<{ shouldNormalize: boolean; tables: TableDefinition[] }> {
  const shouldNormalize = shouldNormalizeObject(obj, config, depth);

  if (!shouldNormalize) {
    return { shouldNormalize: false, tables: [] };
  }

  // Create normalized table for nested object
  const nestedTableName = formatTableName(`${parentTable}_${key}`, config.namingConvention);
  const nestedResult = await analyzeObjectStructure(obj, config, nestedTableName, depth + 1);

  const table: TableDefinition = {
    name: nestedTableName,
    fields: nestedResult.mainFields,
    source: "nested",
    parentTable,
    relationshipType: "ONE_TO_ONE",
  };

  return {
    shouldNormalize: true,
    tables: [table, ...nestedResult.nestedTables],
  };
}

/**
 * Determines if an array should be normalized based on rules
 */
function shouldNormalizeArray(array: any[], config: SQLSchemaConfig, depth: number): boolean {
  // Don't normalize if denormalized mode or too deep
  if (config.normalizationLevel === NormalizationLevel.Denormalized || depth >= 3) {
    return false;
  }

  // Always normalize arrays for 1NF (First Normal Form)
  if (config.normalizationLevel === NormalizationLevel.First) {
    return true;
  }

  // For 2NF/3NF, consider array complexity
  const firstItem = array[0];

  // Normalize if array contains objects with multiple properties
  if (typeof firstItem === "object" && firstItem !== null && !Array.isArray(firstItem)) {
    const propertyCount = Object.keys(firstItem).length;
    return propertyCount > 2; // More than 2 properties suggests a separate entity
  }

  // Normalize if array is large
  return array.length > 5;
}

/**
 * Determines if an object should be normalized
 */
function shouldNormalizeObject(obj: any, config: SQLSchemaConfig, depth: number): boolean {
  // Don't normalize if denormalized mode or too deep
  if (config.normalizationLevel === NormalizationLevel.Denormalized || depth >= 3) {
    return false;
  }

  const propertyCount = Object.keys(obj).length;

  switch (config.normalizationLevel) {
    case NormalizationLevel.First:
      // 1NF: Normalize if object has more than 1 property
      return propertyCount > 1;

    case NormalizationLevel.Second:
      // 2NF: Normalize if object represents a separate entity (3+ properties)
      return propertyCount >= 3;

    case NormalizationLevel.Third:
      // 3NF: More selective normalization (4+ properties or contains IDs)
      if (propertyCount >= 4) return true;

      // Check if object contains ID fields (suggests separate entity)
      const hasIdField = Object.keys(obj).some(
        key => key.toLowerCase().includes("id") || key.toLowerCase() === "uuid"
      );

      return hasIdField && propertyCount >= 2;

    default:
      return false;
  }
}

/**
 * Flattens nested object into parent table fields (denormalization)
 */
async function flattenObject(
  prefix: string,
  obj: any,
  config: SQLSchemaConfig
): Promise<JSONFieldAnalysis[]> {
  const fields: JSONFieldAnalysis[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const flattenedName = formatColumnName(`${prefix}_${key}`, config.namingConvention);

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      // Recursively flatten nested objects
      const nestedFields = await flattenObject(`${prefix}_${key}`, value, config);
      fields.push(...nestedFields);
    } else {
      // Add flattened field
      const analysis = await analyzeField(key, value, config);
      fields.push({ ...analysis, name: flattenedName });
    }
  }

  return fields;
}

/**
 * Analyzes individual fields to determine their characteristics
 */
async function analyzeFields(obj: any, config: SQLSchemaConfig): Promise<JSONFieldAnalysis[]> {
  const fields: JSONFieldAnalysis[] = [];

  if (typeof obj !== "object" || obj === null) {
    // Handle primitive values
    return [
      {
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
        patterns: detectPatterns(obj),
      },
    ];
  }

  for (const [key, value] of Object.entries(obj)) {
    const fieldName = formatColumnName(key, config.namingConvention);
    const analysis = await analyzeField(key, value, config);
    fields.push({
      ...analysis,
      name: fieldName,
    });
  }

  return fields;
}

/**
 * Analyzes a single field to determine its type and characteristics
 */
async function analyzeField(
  key: string,
  value: any,
  config: SQLSchemaConfig
): Promise<JSONFieldAnalysis> {
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
    isUnique: detectUniqueness(key),
    isPrimaryKeyCandidate: detectPrimaryKeyCandidate(key, value, detectedType),
    isForeignKeyCandidate: detectForeignKeyCandidate(key, value, detectedType),
    estimatedLength: estimateFieldLength(value, detectedType),
    patterns,
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
function generateAdvancedConstraints(
  value: any,
  detectedType: string,
  fieldName: string,
  samples: any[]
): string[] {
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
  if (
    detectedType === "number" &&
    (fieldLower.includes("price") ||
      fieldLower.includes("amount") ||
      fieldLower.includes("cost") ||
      fieldLower.includes("fee"))
  ) {
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
    const maxLength = Math.max(...samples.filter(s => typeof s === "string").map(s => s.length));

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
    constraints.push(
      "CHECK (value ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')"
    );
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
function detectUniqueness(key: string): boolean {
  const uniqueIndicators = ["id", "email", "username", "slug", "uuid"];
  const keyLower = key.toLowerCase();

  return uniqueIndicators.some(
    indicator => keyLower.includes(indicator) || keyLower.endsWith("_id")
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
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, "");
}

function toPascalCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, word => {
      return word.toUpperCase();
    })
    .replace(/\s+/g, "");
}

function toSnakeCase(str: string): string {
  return str
    .replace(/\W+/g, " ")
    .split(/ |\B(?=[A-Z])/)
    .map(word => word.toLowerCase())
    .join("_");
}

function toKebabCase(str: string): string {
  return str
    .replace(/\W+/g, " ")
    .split(/ |\B(?=[A-Z])/)
    .map(word => word.toLowerCase())
    .join("-");
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
 * Generates junction tables for many-to-many relationships
 */
function generateJunctionTables(
  tables: TableDefinition[],
  config: SQLSchemaConfig
): TableDefinition[] {
  const junctionTables: TableDefinition[] = [];

  // Identify potential many-to-many relationships
  const manyToManyRelations = identifyManyToManyRelations(tables);

  for (const relation of manyToManyRelations) {
    const junctionTableName = formatTableName(
      `${relation.table1}_${relation.table2}`,
      config.namingConvention
    );

    const table1IdField = formatColumnName(`${relation.table1}_id`, config.namingConvention);
    const table2IdField = formatColumnName(`${relation.table2}_id`, config.namingConvention);

    const junctionFields: JSONFieldAnalysis[] = [
      {
        name: table1IdField,
        type: "integer",
        sqlType: "INTEGER",
        nullable: false,
        samples: [],
        isArray: false,
        isObject: false,
        constraints: ["NOT NULL"],
        isUnique: false,
        isPrimaryKeyCandidate: true,
        isForeignKeyCandidate: true,
        referencedTable: relation.table1,
        patterns: [],
      },
      {
        name: table2IdField,
        type: "integer",
        sqlType: "INTEGER",
        nullable: false,
        samples: [],
        isArray: false,
        isObject: false,
        constraints: ["NOT NULL"],
        isUnique: false,
        isPrimaryKeyCandidate: true,
        isForeignKeyCandidate: true,
        referencedTable: relation.table2,
        patterns: [],
      },
    ];

    // Add timestamp fields for tracking
    junctionFields.push({
      name: formatColumnName("created_at", config.namingConvention),
      type: "date",
      sqlType: "TIMESTAMP",
      nullable: false,
      samples: [],
      isArray: false,
      isObject: false,
      constraints: ["NOT NULL"],
      isUnique: false,
      isPrimaryKeyCandidate: false,
      isForeignKeyCandidate: false,
      patterns: ["date"],
    });

    const junctionTable: TableDefinition = {
      name: junctionTableName,
      fields: junctionFields,
      source: "junction",
      relationshipType: "MANY_TO_MANY",
    };

    junctionTables.push(junctionTable);
  }

  return junctionTables;
}

/**
 * Identifies potential many-to-many relationships from table structure
 */
function identifyManyToManyRelations(
  tables: TableDefinition[]
): Array<{ table1: string; table2: string }> {
  const relations: Array<{ table1: string; table2: string }> = [];

  // Look for arrays of objects that reference other entities
  for (const table of tables) {
    if (table.source === "array" && table.parentTable) {
      // Check if this array table has references to other tables
      const hasReferencesToOthers = table.fields.some(field => {
        return (
          field.isForeignKeyCandidate &&
          field.referencedTable &&
          field.referencedTable !== table.parentTable
        );
      });

      if (hasReferencesToOthers) {
        // This could be a many-to-many relationship
        const referencedTables = table.fields
          .filter(f => f.isForeignKeyCandidate && f.referencedTable)
          .map(f => f.referencedTable!)
          .filter(t => t !== table.parentTable);

        for (const refTable of referencedTables) {
          const table1 = table.parentTable!;
          const table2 = refTable;

          // Avoid duplicate relations
          const exists = relations.some(
            r =>
              (r.table1 === table1 && r.table2 === table2) ||
              (r.table1 === table2 && r.table2 === table1)
          );

          if (!exists) {
            relations.push({ table1, table2 });
          }
        }
      }
    }
  }

  return relations;
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
        comment: generateColumnComment(field),
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
        comment: "Auto-generated primary key",
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
        constraints: ["NOT NULL"],
      });
    }

    const table: TableSchema = {
      name: config.tablePrefix ? `${config.tablePrefix}${tableDef.name}` : tableDef.name,
      columns,
      primaryKey: columns.find(col => col.isPrimaryKey)?.name,
      foreignKeys: generateForeignKeys(tableDef, columns, config),
      indexes: generateTableIndexes(columns, tableDef),
    };

    tables.push(table);
  }

  return tables;
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
 * Detects relationships between tables (including junction table relationships)
 */
async function detectRelationships(
  tableDefinitions: TableDefinition[],
  config: SQLSchemaConfig
): Promise<RelationshipInfo[]> {
  const relationships: RelationshipInfo[] = [];

  for (const tableDef of tableDefinitions) {
    // Handle direct parent-child relationships
    if (tableDef.parentTable && tableDef.relationshipType) {
      relationships.push({
        sourceTable: tableDef.name,
        targetTable: tableDef.parentTable,
        relationshipType: tableDef.relationshipType,
        foreignKeyColumn: formatColumnName(`${tableDef.parentTable}_id`, config.namingConvention),
      });
    }

    // Handle junction table relationships (many-to-many)
    if (tableDef.source === "junction" && tableDef.relationshipType === "MANY_TO_MANY") {
      // Extract table names from junction table fields
      const foreignKeyFields = tableDef.fields.filter(
        f => f.isForeignKeyCandidate && f.referencedTable
      );

      if (foreignKeyFields.length >= 2) {
        const table1 = foreignKeyFields[0].referencedTable!;
        const table2 = foreignKeyFields[1].referencedTable!;

        // Create many-to-many relationships
        relationships.push({
          sourceTable: table1,
          targetTable: table2,
          relationshipType: "MANY_TO_MANY",
          foreignKeyColumn: foreignKeyFields[1].name,
          junctionTable: tableDef.name,
        });

        relationships.push({
          sourceTable: table2,
          targetTable: table1,
          relationshipType: "MANY_TO_MANY",
          foreignKeyColumn: foreignKeyFields[0].name,
          junctionTable: tableDef.name,
        });
      }
    }

    // Detect additional foreign key relationships from field analysis
    for (const field of tableDef.fields) {
      if (
        field.isForeignKeyCandidate &&
        field.referencedTable &&
        field.referencedTable !== tableDef.parentTable
      ) {
        // Check if this relationship already exists
        const existingRelation = relationships.find(
          rel =>
            rel.sourceTable === tableDef.name &&
            rel.targetTable === field.referencedTable &&
            rel.foreignKeyColumn === field.name
        );

        if (!existingRelation) {
          relationships.push({
            sourceTable: tableDef.name,
            targetTable: field.referencedTable,
            relationshipType: "ONE_TO_MANY",
            foreignKeyColumn: field.name,
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
          });
        }
      }
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
    const parentIdColumn = formatColumnName(`${tableDef.parentTable}_id`, config.namingConvention);

    foreignKeys.push({
      columnName: parentIdColumn,
      referencedTable: tableDef.parentTable,
      referencedColumn: "id",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
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
        onUpdate: "CASCADE",
      });
    }
  }

  return foreignKeys;
}

/**
 * Generates indexes for a table based on column analysis
 */
function generateTableIndexes(columns: ColumnSchema[], tableDef: TableDefinition): IndexSchema[] {
  const indexes: IndexSchema[] = [];

  // Index foreign key columns
  const foreignKeyColumns = columns.filter(col => col.isForeignKey);
  for (const col of foreignKeyColumns) {
    indexes.push({
      name: `idx_${tableDef.name}_${col.name}`,
      columns: [col.name],
      unique: false,
      type: "BTREE",
    });
  }

  // Index unique columns (non-primary key)
  const uniqueColumns = columns.filter(
    col => col.constraints?.includes("UNIQUE") && !col.isPrimaryKey
  );
  for (const col of uniqueColumns) {
    indexes.push({
      name: `idx_${tableDef.name}_${col.name}_unique`,
      columns: [col.name],
      unique: true,
      type: "BTREE",
    });
  }

  // Index commonly searched columns
  const searchableColumns = columns.filter(col => {
    const name = col.name.toLowerCase();
    return (
      name.includes("name") ||
      name.includes("title") ||
      name.includes("email") ||
      name.includes("username") ||
      col.type.includes("VARCHAR")
    );
  });

  for (const col of searchableColumns.slice(0, 3)) {
    // Limit to avoid too many indexes
    indexes.push({
      name: `idx_${tableDef.name}_${col.name}_search`,
      columns: [col.name],
      unique: false,
      type: "BTREE",
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
          message: `Consider adding an index on foreign key column ${col.name} in table ${table.name}`,
          suggestedAction: `CREATE INDEX idx_${table.name}_${col.name} ON ${table.name} (${col.name});`,
          impact: "Improved query performance for joins",
        });
      }
    });
  });

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

  const queryComplexity =
    relationships.length > 5 ? "HIGH" : relationships.length > 2 ? "MEDIUM" : "LOW";

  const indexedColumns = tables.reduce(
    (sum, table) => sum + table.columns.filter(col => col.isPrimaryKey || col.isForeignKey).length,
    0
  );
  const indexEfficiency = Math.min(100, (indexedColumns / totalColumns) * 100);

  const normalizationScore = Math.min(100, (relationships.length / tables.length) * 50);

  return {
    estimatedSize: `${tables.length} tables, ${totalColumns} columns`,
    queryComplexity,
    indexEfficiency: Math.round(indexEfficiency),
    normalizationScore: Math.round(normalizationScore),
  };
}

/**
 * Generates migration script
 */
async function generateMigrationScript(): Promise<string> {
  // For now, return a placeholder - this will be implemented in Phase 3
  return "-- Migration script will be generated here";
}
