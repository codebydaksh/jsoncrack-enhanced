import type {
  JSONSchema,
  StructureAnalysis,
  PatternAnalysis,
  PerformanceAnalysis,
  FieldTypeInfo,
} from "../../types/schema";
import { JSONType, PatternType } from "../../types/schema";

export class SchemaGenerationEngine {
  /**
   * Generates a comprehensive JSON Schema from analysis results
   */
  public generateSchema(
    data: any,
    structure: StructureAnalysis,
    patterns: PatternAnalysis[],
    performance: PerformanceAnalysis
  ): JSONSchema {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const schema: JSONSchema = {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: this.inferRootType(data),
    };

    if (Array.isArray(data)) {
      return this.generateArraySchema(data, structure, patterns, performance);
    } else if (typeof data === "object" && data !== null) {
      return this.generateObjectSchema(data, structure, patterns, performance);
    } else {
      return this.generatePrimitiveSchema(data, patterns);
    }
  }

  /**
   * Generates schema for object types
   */
  private generateObjectSchema(
    data: any,
    structure: StructureAnalysis,
    patterns: PatternAnalysis[],
    performance: PerformanceAnalysis
  ): JSONSchema {
    const schema: JSONSchema = {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      properties: {},
      additionalProperties: true, // Start permissive, can be made stricter
    };

    const required: string[] = [];
    const properties: Record<string, JSONSchema> = {};

    // Generate properties from field type information
    Object.entries(structure.fieldTypes).forEach(([fieldPath, fieldInfo]) => {
      const propertyName = this.extractPropertyName(fieldPath);
      if (!propertyName) return;

      const propertySchema = this.generatePropertySchema(fieldInfo, patterns, performance);
      properties[propertyName] = propertySchema;

      // Determine if field is required (present in most samples and not explicitly optional)
      if (!fieldInfo.optional && fieldInfo.occurrences > 1) {
        required.push(propertyName);
      }
    });

    // Add nested object properties from actual data structure
    this.addNestedProperties(data, properties, patterns, performance, "");

    schema.properties = properties;
    if (required.length > 0) {
      schema.required = [...new Set(required)].sort();
    }

    // Add performance-related constraints
    this.addPerformanceConstraints(schema, performance);

    return schema;
  }

  /**
   * Generates schema for array types
   */
  private generateArraySchema(
    data: any[],
    structure: StructureAnalysis,
    patterns: PatternAnalysis[],
    performance: PerformanceAnalysis
  ): JSONSchema {
    const schema: JSONSchema = {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "array",
    };

    if (data.length === 0) {
      schema.items = { type: "object" }; // Default for empty arrays
      return schema;
    }

    // Analyze array item types
    const itemTypes = new Set<string>();
    const sampleItems: any[] = [];

    data.forEach(item => {
      itemTypes.add(this.inferRootType(item));
      if (sampleItems.length < 5) {
        // Sample first 5 items for analysis
        sampleItems.push(item);
      }
    });

    // Generate schema for array items
    if (itemTypes.size === 1) {
      // Homogeneous array
      const itemType = Array.from(itemTypes)[0];
      if (itemType === "object") {
        schema.items = this.generateObjectSchemaFromSample(sampleItems, patterns, performance);
      } else if (itemType === "array") {
        // Nested arrays - recursively generate
        schema.items = this.generateArraySchema(
          sampleItems.filter(item => Array.isArray(item))[0] || [],
          structure,
          patterns,
          performance
        );
      } else {
        schema.items = this.generatePrimitiveSchemaFromSamples(sampleItems, patterns);
      }
    } else {
      // Heterogeneous array - use anyOf
      const schemas: JSONSchema[] = [];
      itemTypes.forEach(type => {
        const typeItems = sampleItems.filter(item => this.inferRootType(item) === type);
        if (typeItems.length > 0) {
          if (type === "object") {
            schemas.push(this.generateObjectSchemaFromSample(typeItems, patterns, performance));
          } else if (type === "array") {
            schemas.push({ type: "array" }); // Simplified for nested heterogeneous arrays
          } else {
            schemas.push(this.generatePrimitiveSchemaFromSamples(typeItems, patterns));
          }
        }
      });
      schema.items = { anyOf: schemas };
    }

    // Add array-specific constraints
    this.addArrayConstraints(schema, data, performance);

    return schema;
  }

  /**
   * Generates schema for primitive types
   */
  private generatePrimitiveSchema(data: any, patterns: PatternAnalysis[]): JSONSchema {
    const baseType = this.inferRootType(data);
    const schema: JSONSchema = {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: baseType,
    };

    // Add pattern-based constraints
    const relevantPatterns = patterns.filter(p => p.examples.includes(String(data)));
    this.addPatternConstraints(schema, relevantPatterns, baseType);

    return schema;
  }

  /**
   * Generates property schema from field type information
   */
  private generatePropertySchema(
    fieldInfo: FieldTypeInfo,
    patterns: PatternAnalysis[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    performance: PerformanceAnalysis
  ): JSONSchema {
    const schema: JSONSchema = {
      type: this.mapJsonTypeToSchemaType(fieldInfo.detectedType),
    };

    // Handle nullable fields
    if (fieldInfo.nullable) {
      schema.type = [schema.type as string, "null"];
    }

    // Add pattern-based constraints
    const fieldPatterns = patterns.filter(p => p.field === fieldInfo.path);
    this.addPatternConstraints(schema, fieldPatterns, fieldInfo.detectedType);

    // Add examples from field info
    if (fieldInfo.examples && fieldInfo.examples.length > 0) {
      schema.examples = fieldInfo.examples.slice(0, 3); // Limit examples
    }

    // Add enum constraints for small value sets
    if (fieldInfo.examples && fieldInfo.examples.length <= 10 && fieldInfo.examples.length > 1) {
      const uniqueValues = [...new Set(fieldInfo.examples)];
      if (uniqueValues.length <= 8) {
        // Only add enum for small, manageable sets
        schema.enum = uniqueValues;
      }
    }

    return schema;
  }

  /**
   * Adds nested properties to schema from actual data
   */
  private addNestedProperties(
    data: any,
    properties: Record<string, JSONSchema>,
    patterns: PatternAnalysis[],
    performance: PerformanceAnalysis,
    currentPath: string
  ): void {
    if (typeof data !== "object" || data === null) return;

    Object.keys(data).forEach(key => {
      const value = data[key];
      const propertyPath = currentPath ? `${currentPath}.${key}` : key;

      if (!properties[key]) {
        if (Array.isArray(value)) {
          properties[key] = this.generateArraySchema(
            value,
            { fieldTypes: {} } as any,
            patterns,
            performance
          );
        } else if (typeof value === "object" && value !== null) {
          properties[key] = {
            type: "object",
            properties: {},
            additionalProperties: true,
          };
          const nestedProperties: Record<string, JSONSchema> = {};
          this.addNestedProperties(value, nestedProperties, patterns, performance, propertyPath);
          properties[key].properties = nestedProperties;
        } else {
          properties[key] = this.generatePrimitiveSchemaFromValue(value, patterns);
        }
      }
    });
  }

  /**
   * Generates object schema from sample items
   */
  private generateObjectSchemaFromSample(
    samples: any[],
    patterns: PatternAnalysis[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    performance: PerformanceAnalysis
  ): JSONSchema {
    const schema: JSONSchema = {
      type: "object",
      properties: {},
      additionalProperties: true,
    };

    const allKeys = new Set<string>();
    const keyOccurrences: Record<string, number> = {};

    // Collect all keys and their occurrence counts
    samples.forEach(sample => {
      if (typeof sample === "object" && sample !== null) {
        Object.keys(sample).forEach(key => {
          allKeys.add(key);
          keyOccurrences[key] = (keyOccurrences[key] || 0) + 1;
        });
      }
    });

    const properties: Record<string, JSONSchema> = {};
    const required: string[] = [];

    // Generate property schemas
    allKeys.forEach(key => {
      const values = samples
        .filter(sample => sample && typeof sample === "object" && key in sample)
        .map(sample => sample[key]);

      if (values.length > 0) {
        properties[key] = this.generatePropertySchemaFromValues(values, patterns);

        // Add to required if present in most samples
        if (keyOccurrences[key] >= Math.ceil(samples.length * 0.8)) {
          required.push(key);
        }
      }
    });

    schema.properties = properties;
    if (required.length > 0) {
      schema.required = required.sort();
    }

    return schema;
  }

  /**
   * Generates property schema from multiple values
   */
  private generatePropertySchemaFromValues(values: any[], patterns: PatternAnalysis[]): JSONSchema {
    const types = new Set(values.map(v => this.inferRootType(v)));

    if (types.size === 1) {
      const type = Array.from(types)[0];
      const schema: JSONSchema = { type };

      // Add type-specific constraints
      if (type === "string") {
        const stringValues = values.filter(v => typeof v === "string");
        this.addStringConstraints(schema, stringValues, patterns);
      } else if (type === "number") {
        this.addNumberConstraints(schema, values);
      } else if (type === "array") {
        // For arrays, we'd need more complex analysis
        schema.items = { type: "object" }; // Simplified
      } else if (type === "object") {
        return this.generateObjectSchemaFromSample(values, patterns, {} as any);
      }

      return schema;
    } else {
      // Multiple types - use anyOf
      const schemas = Array.from(types).map(type => ({ type }));
      return { anyOf: schemas };
    }
  }

  /**
   * Generates primitive schema from samples
   */
  private generatePrimitiveSchemaFromSamples(
    samples: any[],
    patterns: PatternAnalysis[]
  ): JSONSchema {
    if (samples.length === 0) return { type: "object" };

    const types = new Set(samples.map(s => this.inferRootType(s)));

    if (types.size === 1) {
      const type = Array.from(types)[0];
      const schema: JSONSchema = { type };

      if (type === "string") {
        this.addStringConstraints(schema, samples, patterns);
      } else if (type === "number") {
        this.addNumberConstraints(schema, samples);
      }

      return schema;
    }

    return { anyOf: Array.from(types).map(type => ({ type })) };
  }

  /**
   * Generates primitive schema from a single value
   */
  private generatePrimitiveSchemaFromValue(value: any, patterns: PatternAnalysis[]): JSONSchema {
    const type = this.inferRootType(value);
    const schema: JSONSchema = { type };

    if (type === "string") {
      const relevantPatterns = patterns.filter(p => p.examples.includes(String(value)));
      this.addPatternConstraints(schema, relevantPatterns, JSONType.STRING);
    }

    return schema;
  }

  /**
   * Adds pattern-based constraints to schema
   */
  private addPatternConstraints(
    schema: JSONSchema,
    patterns: PatternAnalysis[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    fieldType: string | JSONType
  ): void {
    if (patterns.length === 0) return;

    // Find the highest confidence pattern
    const bestPattern = patterns.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );

    if (bestPattern.confidence >= 0.8) {
      switch (bestPattern.pattern) {
        case PatternType.EMAIL:
          schema.format = "email";
          break;
        case PatternType.URL:
          schema.format = "uri";
          break;
        case PatternType.UUID:
          schema.format = "uuid";
          break;
        case PatternType.DATE:
          schema.format = "date";
          break;
        case PatternType.DATETIME:
          schema.format = "date-time";
          break;
        case PatternType.IP_ADDRESS:
          schema.format = "ipv4";
          break;
        case PatternType.REGEX:
          if (bestPattern.validationRule) {
            try {
              // Extract regex pattern from validation rule
              const regexMatch = bestPattern.validationRule.match(/\/(.+)\//);
              if (regexMatch) {
                schema.pattern = regexMatch[1];
              }
            } catch {
              // Ignore invalid regex
            }
          }
          break;
        case PatternType.ENUM:
          if (bestPattern.examples && bestPattern.examples.length <= 20) {
            schema.enum = [...new Set(bestPattern.examples)];
          }
          break;
      }
    }
  }

  /**
   * Adds string-specific constraints
   */
  private addStringConstraints(
    schema: JSONSchema,
    values: string[],
    patterns: PatternAnalysis[]
  ): void {
    if (values.length === 0) return;

    const lengths = values.map(v => v.length);
    const minLength = Math.min(...lengths);
    const maxLength = Math.max(...lengths);

    // Only add length constraints if there's meaningful variation
    if (maxLength - minLength > 0 && minLength > 0) {
      if (minLength === maxLength) {
        // Fixed length
        schema.minLength = minLength;
        schema.maxLength = maxLength;
      } else if (minLength > 1) {
        // Variable length with reasonable bounds
        schema.minLength = Math.max(1, minLength - 2);
        schema.maxLength = maxLength + 10; // Allow some flexibility
      }
    }

    // Add pattern constraints
    const stringPatterns = patterns.filter(p => p.examples.some(ex => values.includes(ex)));
    this.addPatternConstraints(schema, stringPatterns, JSONType.STRING);
  }

  /**
   * Adds number-specific constraints
   */
  private addNumberConstraints(schema: JSONSchema, values: number[]): void {
    if (values.length === 0) return;

    const min = Math.min(...values);
    const max = Math.max(...values);

    // Only add bounds if there's meaningful range
    if (max - min > 0) {
      schema.minimum = min;
      schema.maximum = max;
    }

    // Check if all values are integers
    const allIntegers = values.every(v => Number.isInteger(v));
    if (allIntegers && schema.type === "number") {
      schema.type = "integer";
    }
  }

  /**
   * Adds array-specific constraints
   */
  private addArrayConstraints(
    schema: JSONSchema,
    data: any[],
    performance: PerformanceAnalysis
  ): void {
    schema.minItems = 0; // Arrays can be empty

    // Add reasonable max items based on performance analysis
    const largeArray = performance.largeArrays.find(arr => arr.size === data.length);
    if (largeArray) {
      // For large arrays, suggest a more reasonable upper bound
      schema.maxItems = Math.min(data.length * 2, 10000);
    } else {
      schema.maxItems = Math.max(data.length * 2, 100);
    }

    // Check for unique items (for smaller arrays)
    if (data.length <= 1000) {
      const uniqueItems = new Set(data.map(item => JSON.stringify(item)));
      if (uniqueItems.size === data.length) {
        schema.uniqueItems = true;
      }
    }
  }

  /**
   * Adds performance-related constraints
   */
  private addPerformanceConstraints(schema: JSONSchema, performance: PerformanceAnalysis): void {
    // Add description with performance insights
    const insights: string[] = [];

    if (performance.largeArrays.length > 0) {
      insights.push(`Contains ${performance.largeArrays.length} large arrays`);
    }

    if (performance.deepNesting.length > 0) {
      insights.push(
        `Has deep nesting (max depth: ${Math.max(...performance.deepNesting.map(d => d.depth))})`
      );
    }

    if (performance.duplicateData.length > 0) {
      insights.push(`Contains ${performance.duplicateData.length} duplicate data structures`);
    }

    if (insights.length > 0) {
      schema.description = `Schema generated with performance insights: ${insights.join(", ")}`;
    }
  }

  /**
   * Helper methods
   */
  private inferRootType(data: any): string {
    if (data === null) return "null";
    if (Array.isArray(data)) return "array";
    if (typeof data === "object") return "object";
    if (typeof data === "string") return "string";
    if (typeof data === "number") return "number";
    if (typeof data === "boolean") return "boolean";
    return "string"; // fallback
  }

  private mapJsonTypeToSchemaType(jsonType: JSONType): string {
    switch (jsonType) {
      case JSONType.STRING:
        return "string";
      case JSONType.NUMBER:
        return "number";
      case JSONType.BOOLEAN:
        return "boolean";
      case JSONType.OBJECT:
        return "object";
      case JSONType.ARRAY:
        return "array";
      case JSONType.NULL:
        return "null";
      default:
        return "string";
    }
  }

  private extractPropertyName(fieldPath: string): string | null {
    // Extract property name from field path like "$.user.name" -> "name"
    const parts = fieldPath.split(".");
    return parts.length > 0 ? parts[parts.length - 1] : null;
  }
}
