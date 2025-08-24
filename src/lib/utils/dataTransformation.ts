/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ColumnSchema } from "../../store/useSQLSchema";
import { DatabaseType } from "../../store/useSQLSchema";

/**
 * Advanced Data Transformation System
 * Handles complex data type conversions, validation, and normalization
 */

export interface TransformationContext {
  sourcePath: string;
  targetColumn: ColumnSchema;
  databaseType: DatabaseType;
  originalValue: any;
  recordIndex: number;
  tableName: string;
}

export interface TransformationResult {
  value: any;
  warnings: string[];
  transformations: string[];
  confidence: number; // 0-1 scale
}

export interface ValidationRule {
  name: string;
  validate: (value: any, context: TransformationContext) => boolean;
  message: string;
  severity: "ERROR" | "WARNING" | "INFO";
}

export interface TypeConverter {
  sourceType: string;
  targetType: string;
  converter: (value: any, context: TransformationContext) => TransformationResult;
  confidence: number;
}

/**
 * Main Data Transformation Engine
 */
export class DataTransformationEngine {
  private converters: Map<string, TypeConverter[]> = new Map();
  private validationRules: Map<string, ValidationRule[]> = new Map();
  private customTransformers: Map<string, (value: any) => any> = new Map();

  constructor() {
    this.initializeBuiltInConverters();
    this.initializeValidationRules();
  }

  /**
   * Transform a value to match the target column specification
   */
  transform(value: any, context: TransformationContext): TransformationResult {
    const result: TransformationResult = {
      value: value,
      warnings: [],
      transformations: [],
      confidence: 1.0,
    };

    // Handle null/undefined values
    if (value === null || value === undefined) {
      return this.handleNullValue(context);
    }

    // Detect source type
    const sourceType = this.detectValueType(value);
    const targetType = this.normalizeTargetType(context.targetColumn.type);

    // Apply validation rules
    const validationResult = this.validateValue(value, context);
    result.warnings.push(...validationResult.warnings);

    if (validationResult.hasErrors) {
      throw new Error(`Validation failed: ${validationResult.errors.join(", ")}`);
    }

    // Apply type conversion if needed
    if (sourceType !== targetType) {
      const conversionResult = this.convertType(value, sourceType, targetType, context);
      result.value = conversionResult.value;
      result.warnings.push(...conversionResult.warnings);
      result.transformations.push(...conversionResult.transformations);
      result.confidence = Math.min(result.confidence, conversionResult.confidence);
    }

    // Apply column-specific transformations
    const columnResult = this.applyColumnTransformations(result.value, context);
    result.value = columnResult.value;
    result.warnings.push(...columnResult.warnings);
    result.transformations.push(...columnResult.transformations);

    // Apply database-specific formatting
    result.value = this.applyDatabaseFormatting(result.value, context);

    return result;
  }

  /**
   * Handle null values according to column constraints
   */
  private handleNullValue(context: TransformationContext): TransformationResult {
    if (!context.targetColumn.nullable) {
      // Generate default value for non-nullable columns
      const defaultValue = this.generateDefaultValue(context.targetColumn);
      return {
        value: defaultValue,
        warnings: [
          `Column ${context.targetColumn.name} is NOT NULL, using default value: ${defaultValue}`,
        ],
        transformations: ["NULL_TO_DEFAULT"],
        confidence: 0.5,
      };
    }

    return {
      value: null,
      warnings: [],
      transformations: [],
      confidence: 1.0,
    };
  }

  /**
   * Detect the type of a value
   */
  private detectValueType(value: any): string {
    if (typeof value === "string") {
      // Check for special string patterns
      if (this.isUUID(value)) return "UUID";
      if (this.isEmail(value)) return "EMAIL";
      if (this.isURL(value)) return "URL";
      if (this.isPhoneNumber(value)) return "PHONE";
      if (this.isDate(value)) return "DATE_STRING";
      if (this.isTime(value)) return "TIME_STRING";
      if (this.isNumeric(value)) return "NUMERIC_STRING";
      if (this.isBoolean(value)) return "BOOLEAN_STRING";
      if (this.isJSON(value)) return "JSON_STRING";
      return "STRING";
    }

    if (typeof value === "number") {
      return Number.isInteger(value) ? "INTEGER" : "FLOAT";
    }

    if (typeof value === "boolean") {
      return "BOOLEAN";
    }

    if (value instanceof Date) {
      return "DATE_OBJECT";
    }

    if (Array.isArray(value)) {
      return "ARRAY";
    }

    if (typeof value === "object") {
      return "OBJECT";
    }

    return "UNKNOWN";
  }

  /**
   * Normalize target column type for comparison
   */
  private normalizeTargetType(columnType: string): string {
    const type = columnType.toUpperCase();

    if (type.includes("VARCHAR") || type.includes("TEXT") || type.includes("CHAR")) {
      return "STRING";
    }
    if (type.includes("INT") || type.includes("BIGINT") || type.includes("SMALLINT")) {
      return "INTEGER";
    }
    if (
      type.includes("DECIMAL") ||
      type.includes("NUMERIC") ||
      type.includes("FLOAT") ||
      type.includes("DOUBLE")
    ) {
      return "FLOAT";
    }
    if (type.includes("BOOLEAN") || type.includes("BIT")) {
      return "BOOLEAN";
    }
    if (type.includes("DATE")) {
      return "DATE";
    }
    if (type.includes("TIME") || type.includes("TIMESTAMP")) {
      return "DATETIME";
    }
    if (type.includes("UUID")) {
      return "UUID";
    }
    if (type.includes("JSON")) {
      return "JSON";
    }

    return "STRING"; // Default fallback
  }

  /**
   * Convert value from source type to target type
   */
  private convertType(
    value: any,
    sourceType: string,
    targetType: string,
    context: TransformationContext
  ): TransformationResult {
    const converterKey = `${sourceType}_TO_${targetType}`;
    const converters = this.converters.get(converterKey) || [];

    if (converters.length === 0) {
      // Fallback to string conversion
      return {
        value: String(value),
        warnings: [
          `No specific converter found for ${sourceType} to ${targetType}, using string conversion`,
        ],
        transformations: [`TYPE_CONVERSION: ${sourceType} → ${targetType}`],
        confidence: 0.3,
      };
    }

    // Use the highest confidence converter
    const bestConverter = converters.sort((a, b) => b.confidence - a.confidence)[0];
    return bestConverter.converter(value, context);
  }

  /**
   * Apply column-specific transformations
   */
  private applyColumnTransformations(
    value: any,
    context: TransformationContext
  ): TransformationResult {
    const result: TransformationResult = {
      value: value,
      warnings: [],
      transformations: [],
      confidence: 1.0,
    };

    const column = context.targetColumn;

    // Apply length constraints for string types (would need to be added to ColumnSchema)
    // if (typeof value === "string" && column.length && value.length > column.length) {
    //   result.value = value.substring(0, column.length);
    //   result.warnings.push(`String truncated from ${value.length} to ${column.length} characters`);
    //   result.transformations.push("LENGTH_CONSTRAINT");
    //   result.confidence = 0.8;
    // }

    // Apply precision constraints for numeric types (would need to be added to ColumnSchema)
    // if (typeof value === "number" && column.precision) {
    //   const factor = Math.pow(10, column.scale || 0);
    //   result.value = Math.round(value * factor) / factor;
    //   if (result.value !== value) {
    //     result.warnings.push(`Numeric precision adjusted to ${column.precision} digits`);
    //     result.transformations.push("PRECISION_CONSTRAINT");
    //     result.confidence = 0.9;
    //   }
    // }

    // Apply custom transformers if available
    const customTransformer = this.customTransformers.get(column.name);
    if (customTransformer) {
      try {
        result.value = customTransformer(result.value);
        result.transformations.push("CUSTOM_TRANSFORMER");
      } catch (error) {
        result.warnings.push(
          `Custom transformer failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return result;
  }

  /**
   * Apply database-specific formatting
   */
  private applyDatabaseFormatting(value: any, context: TransformationContext): any {
    const dbType = context.databaseType;

    // Date formatting
    if (value instanceof Date) {
      switch (dbType) {
        case DatabaseType.PostgreSQL:
          return value.toISOString();
        case DatabaseType.MySQL:
          return value.toISOString().slice(0, 19).replace("T", " ");
        case DatabaseType.SQLServer:
          return value.toISOString();
        case DatabaseType.SQLite:
          return value.toISOString();
        default:
          return value.toISOString();
      }
    }

    // Boolean formatting
    if (typeof value === "boolean") {
      switch (dbType) {
        case DatabaseType.PostgreSQL:
          return value;
        case DatabaseType.MySQL:
          return value ? 1 : 0;
        case DatabaseType.SQLServer:
          return value ? 1 : 0;
        case DatabaseType.SQLite:
          return value ? 1 : 0;
        default:
          return value;
      }
    }

    return value;
  }

  /**
   * Validate value according to column constraints and rules
   */
  private validateValue(
    value: any,
    context: TransformationContext
  ): { hasErrors: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Get validation rules for the column type
    const targetType = this.normalizeTargetType(context.targetColumn.type);
    const rules = this.validationRules.get(targetType) || [];

    for (const rule of rules) {
      try {
        if (!rule.validate(value, context)) {
          const message = `${rule.name}: ${rule.message}`;

          if (rule.severity === "ERROR") {
            errors.push(message);
          } else if (rule.severity === "WARNING") {
            warnings.push(message);
          }
        }
      } catch (error) {
        warnings.push(
          `Validation rule ${rule.name} failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return {
      hasErrors: errors.length > 0,
      errors,
      warnings,
    };
  }

  /**
   * Generate a default value for a column type
   */
  private generateDefaultValue(column: ColumnSchema): any {
    const type = column.type.toUpperCase();

    if (
      type.includes("INT") ||
      type.includes("DECIMAL") ||
      type.includes("NUMERIC") ||
      type.includes("FLOAT") ||
      type.includes("DOUBLE")
    ) {
      return 0;
    }

    if (type.includes("VARCHAR") || type.includes("TEXT") || type.includes("CHAR")) {
      return "";
    }

    if (type.includes("BOOLEAN") || type.includes("BIT")) {
      return false;
    }

    if (type.includes("DATE") || type.includes("TIMESTAMP") || type.includes("DATETIME")) {
      return new Date();
    }

    if (type.includes("UUID")) {
      return "00000000-0000-0000-0000-000000000000";
    }

    return "";
  }

  /**
   * Initialize built-in type converters
   */
  private initializeBuiltInConverters(): void {
    // String to Integer
    this.converters.set("STRING_TO_INTEGER", [
      {
        sourceType: "STRING",
        targetType: "INTEGER",
        confidence: 0.9,
        converter: (value: string, _context) => {
          const numValue = parseInt(value.trim(), 10);
          if (isNaN(numValue)) {
            throw new Error(`Cannot convert "${value}" to integer`);
          }
          return {
            value: numValue,
            warnings: [],
            transformations: ["STRING_TO_INTEGER"],
            confidence: 0.9,
          };
        },
      },
    ]);

    // String to Float
    this.converters.set("STRING_TO_FLOAT", [
      {
        sourceType: "STRING",
        targetType: "FLOAT",
        confidence: 0.9,
        converter: (value: string, _context) => {
          const numValue = parseFloat(value.trim());
          if (isNaN(numValue)) {
            throw new Error(`Cannot convert "${value}" to float`);
          }
          return {
            value: numValue,
            warnings: [],
            transformations: ["STRING_TO_FLOAT"],
            confidence: 0.9,
          };
        },
      },
    ]);

    // String to Boolean
    this.converters.set("STRING_TO_BOOLEAN", [
      {
        sourceType: "STRING",
        targetType: "BOOLEAN",
        confidence: 0.8,
        converter: (value: string, _context) => {
          const lowerValue = value.toLowerCase().trim();
          if (["true", "1", "yes", "y", "on"].includes(lowerValue)) {
            return {
              value: true,
              warnings: [],
              transformations: ["STRING_TO_BOOLEAN"],
              confidence: 0.9,
            };
          }
          if (["false", "0", "no", "n", "off"].includes(lowerValue)) {
            return {
              value: false,
              warnings: [],
              transformations: ["STRING_TO_BOOLEAN"],
              confidence: 0.9,
            };
          }
          throw new Error(`Cannot convert "${value}" to boolean`);
        },
      },
    ]);

    // String to Date
    this.converters.set("STRING_TO_DATE", [
      {
        sourceType: "STRING",
        targetType: "DATE",
        confidence: 0.8,
        converter: (value: string, _context) => {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            throw new Error(`Cannot convert "${value}" to date`);
          }
          return {
            value: date,
            warnings: [],
            transformations: ["STRING_TO_DATE"],
            confidence: 0.8,
          };
        },
      },
    ]);

    // Object to JSON
    this.converters.set("OBJECT_TO_JSON", [
      {
        sourceType: "OBJECT",
        targetType: "JSON",
        confidence: 1.0,
        converter: (value: any, _context) => {
          try {
            const jsonString = JSON.stringify(value);
            return {
              value: jsonString,
              warnings: [],
              transformations: ["OBJECT_TO_JSON"],
              confidence: 1.0,
            };
          } catch (error) {
            throw new Error(
              `Cannot convert object to JSON: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        },
      },
    ]);

    // Array to JSON
    this.converters.set("ARRAY_TO_JSON", [
      {
        sourceType: "ARRAY",
        targetType: "JSON",
        confidence: 1.0,
        converter: (_value: any[], _context) => {
          try {
            const jsonString = JSON.stringify(_value);
            return {
              value: jsonString,
              warnings: [],
              transformations: ["ARRAY_TO_JSON"],
              confidence: 1.0,
            };
          } catch (error) {
            throw new Error(
              `Cannot convert array to JSON: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        },
      },
    ]);
  }

  /**
   * Initialize validation rules
   */
  private initializeValidationRules(): void {
    // String validation rules
    this.validationRules.set("STRING", [
      {
        name: "NON_EMPTY",
        validate: (value: string, _context) => value.length > 0,
        message: "String cannot be empty",
        severity: "WARNING",
      },
      {
        name: "LENGTH_LIMIT",
        validate: (value: string, _context) => {
          // Would need column.length property in ColumnSchema interface
          // return !context.targetColumn.length || value.length <= context.targetColumn.length;
          return true; // Skip validation for now
        },
        message: "String exceeds maximum length",
        severity: "ERROR",
      },
    ]);

    // Integer validation rules
    this.validationRules.set("INTEGER", [
      {
        name: "VALID_INTEGER",
        validate: (value: number, _context) => Number.isInteger(value),
        message: "Value must be an integer",
        severity: "ERROR",
      },
      {
        name: "RANGE_CHECK",
        validate: (value: number, _context) => {
          const type = _context.targetColumn.type.toUpperCase();
          if (type.includes("SMALLINT")) {
            return value >= -32768 && value <= 32767;
          }
          if (type.includes("INT") && !type.includes("BIGINT")) {
            return value >= -2147483648 && value <= 2147483647;
          }
          return true; // BIGINT or other types
        },
        message: "Value outside valid range for integer type",
        severity: "ERROR",
      },
    ]);

    // UUID validation rules
    this.validationRules.set("UUID", [
      {
        name: "VALID_UUID_FORMAT",
        validate: (value: string, _context) => {
          return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
        },
        message: "Invalid UUID format",
        severity: "ERROR",
      },
    ]);
  }

  /**
   * Utility methods for type detection
   */
  private isUUID(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }

  private isEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private isURL(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  private isPhoneNumber(value: string): boolean {
    return /^\+?[\d\s\-\(\)]{10,}$/.test(value);
  }

  private isDate(value: string): boolean {
    return !isNaN(Date.parse(value));
  }

  private isTime(value: string): boolean {
    return /^\d{1,2}:\d{2}(:\d{2})?(\s?(AM|PM))?$/i.test(value);
  }

  private isNumeric(value: string): boolean {
    return !isNaN(Number(value)) && !isNaN(parseFloat(value));
  }

  private isBoolean(value: string): boolean {
    const lowerValue = value.toLowerCase();
    return ["true", "false", "1", "0", "yes", "no", "y", "n", "on", "off"].includes(lowerValue);
  }

  private isJSON(value: string): boolean {
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Add custom transformer for specific column
   */
  addCustomTransformer(columnName: string, transformer: (value: any) => any): void {
    this.customTransformers.set(columnName, transformer);
  }

  /**
   * Add custom validation rule
   */
  addValidationRule(targetType: string, rule: ValidationRule): void {
    if (!this.validationRules.has(targetType)) {
      this.validationRules.set(targetType, []);
    }
    this.validationRules.get(targetType)!.push(rule);
  }

  /**
   * Add custom type converter
   */
  addTypeConverter(sourceType: string, targetType: string, converter: TypeConverter): void {
    const key = `${sourceType}_TO_${targetType}`;
    if (!this.converters.has(key)) {
      this.converters.set(key, []);
    }
    this.converters.get(key)!.push(converter);
  }
}

/**
 * Singleton instance for global use
 */
export const dataTransformationEngine = new DataTransformationEngine();
