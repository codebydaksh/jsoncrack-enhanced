import type { SchemaSuggestion } from "../../types/schema";
import { SuggestionCategory, SuggestionAction } from "../../types/schema";

export interface SuggestionApplication {
  id: string;
  success: boolean;
  message: string;
  appliedChanges?: any;
  validationResult?: ValidationResult;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestedFixes: string[];
}

export class SuggestionValidator {
  /**
   * Validates and applies a suggestion to JSON data
   */
  public static async applySuggestion(
    suggestion: SchemaSuggestion,
    jsonData: any
  ): Promise<SuggestionApplication> {
    try {
      switch (suggestion.category) {
        case SuggestionCategory.TYPE_SAFETY:
          return this.applyTypeSafetySuggestion(suggestion, jsonData);

        case SuggestionCategory.VALIDATION:
          return this.applyValidationSuggestion(suggestion, jsonData);

        case SuggestionCategory.PERFORMANCE:
          return this.applyPerformanceSuggestion(suggestion, jsonData);

        case SuggestionCategory.STRUCTURE:
          return this.applyStructureSuggestion(suggestion, jsonData);

        case SuggestionCategory.NAMING:
          return this.applyNamingSuggestion(suggestion, jsonData);

        case SuggestionCategory.SECURITY:
          return this.applySecuritySuggestion(suggestion, jsonData);

        default:
          return {
            id: suggestion.id,
            success: false,
            message: `Unsupported suggestion category: ${suggestion.category}`,
          };
      }
    } catch (error) {
      return {
        id: suggestion.id,
        success: false,
        message: `Failed to apply suggestion: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Previews what changes would be made by applying a suggestion
   */
  public static previewSuggestion(
    suggestion: SchemaSuggestion,
    jsonData: any
  ): { before: any; after: any; changes: string[] } {
    const changes: string[] = [];

    try {
      switch (suggestion.category) {
        case SuggestionCategory.TYPE_SAFETY:
          return this.previewTypeSafetyChanges(suggestion, jsonData, changes);

        case SuggestionCategory.VALIDATION:
          return this.previewValidationChanges(suggestion, jsonData, changes);

        case SuggestionCategory.PERFORMANCE:
          return this.previewPerformanceChanges(suggestion, jsonData, changes);

        case SuggestionCategory.STRUCTURE:
          return this.previewStructureChanges(suggestion, jsonData, changes);

        default:
          return {
            before: jsonData,
            after: jsonData,
            changes: [`Preview not available for ${suggestion.category} suggestions`],
          };
      }
    } catch (error) {
      return {
        before: jsonData,
        after: jsonData,
        changes: [`Preview failed: ${error instanceof Error ? error.message : "Unknown error"}`],
      };
    }
  }

  /**
   * Type Safety Suggestions
   */
  private static applyTypeSafetySuggestion(
    suggestion: SchemaSuggestion,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    jsonData: any
  ): SuggestionApplication {
    if (suggestion.action === SuggestionAction.REVIEW) {
      return {
        id: suggestion.id,
        success: true,
        message: "Suggestion marked for review. Manual intervention required for type consistency.",
      };
    }

    // For type safety, we typically can't auto-fix without data loss risk
    return {
      id: suggestion.id,
      success: false,
      message: "Type safety suggestions require manual review to prevent data loss.",
    };
  }

  private static previewTypeSafetyChanges(
    suggestion: SchemaSuggestion,
    jsonData: any,
    changes: string[]
  ) {
    changes.push(
      `Would standardize field "${suggestion.field}" to type: ${suggestion.suggestedValue}`
    );
    changes.push("This requires manual intervention to prevent data loss");

    return {
      before: jsonData,
      after: jsonData, // No automatic changes for type safety
      changes,
    };
  }

  /**
   * Validation Suggestions
   */
  private static applyValidationSuggestion(
    suggestion: SchemaSuggestion,
    jsonData: any
  ): SuggestionApplication {
    if (suggestion.action === SuggestionAction.APPLY && suggestion.field) {
      const validationResult = this.validateFieldPattern(
        jsonData,
        suggestion.field,
        suggestion.suggestedValue
      );

      return {
        id: suggestion.id,
        success: validationResult.isValid,
        message: validationResult.isValid
          ? `Validation pattern applied to field "${suggestion.field}"`
          : `Validation failed: ${validationResult.errors.join(", ")}`,
        validationResult,
      };
    }

    return {
      id: suggestion.id,
      success: true,
      message: "Validation suggestion noted for implementation.",
    };
  }

  private static previewValidationChanges(
    suggestion: SchemaSuggestion,
    jsonData: any,
    changes: string[]
  ) {
    if (suggestion.field && suggestion.suggestedValue) {
      changes.push(`Add validation rule: ${suggestion.suggestedValue}`);
      changes.push(`Target field: ${suggestion.field}`);

      // Show how many values would pass/fail validation
      const fieldValues = this.extractFieldValues(jsonData, suggestion.field);
      if (fieldValues.length > 0) {
        const validCount = fieldValues.filter(value =>
          this.testValidationRule(value, suggestion.suggestedValue)
        ).length;

        changes.push(`${validCount}/${fieldValues.length} existing values would pass validation`);
      }
    }

    return {
      before: jsonData,
      after: jsonData, // Validation doesn't change data structure
      changes,
    };
  }

  /**
   * Performance Suggestions
   */
  private static applyPerformanceSuggestion(
    suggestion: SchemaSuggestion,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    jsonData: any
  ): SuggestionApplication {
    // Performance suggestions are typically recommendations
    return {
      id: suggestion.id,
      success: true,
      message: `Performance optimization noted: ${suggestion.description}`,
    };
  }

  private static previewPerformanceChanges(
    suggestion: SchemaSuggestion,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    jsonData: any,
    changes: string[]
  ) {
    changes.push("Performance optimization suggestion");
    changes.push(`Recommendation: ${suggestion.description}`);

    if (suggestion.field) {
      changes.push(`Target: ${suggestion.field}`);
    }

    return {
      before: jsonData,
      after: jsonData, // Performance suggestions don't auto-modify data
      changes,
    };
  }

  /**
   * Structure Suggestions
   */
  private static applyStructureSuggestion(
    suggestion: SchemaSuggestion,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    jsonData: any
  ): SuggestionApplication {
    // Structure changes require careful handling
    return {
      id: suggestion.id,
      success: true,
      message: `Structure optimization noted: ${suggestion.description}`,
    };
  }

  private static previewStructureChanges(
    suggestion: SchemaSuggestion,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    jsonData: any,
    changes: string[]
  ) {
    changes.push("Structure optimization suggestion");
    changes.push(`Recommendation: ${suggestion.description}`);

    return {
      before: jsonData,
      after: jsonData, // Structure suggestions typically require manual intervention
      changes,
    };
  }

  /**
   * Naming Suggestions
   */
  private static applyNamingSuggestion(
    suggestion: SchemaSuggestion,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    jsonData: any
  ): SuggestionApplication {
    return {
      id: suggestion.id,
      success: true,
      message: `Naming convention noted: ${suggestion.description}`,
    };
  }

  /**
   * Security Suggestions
   */
  private static applySecuritySuggestion(
    suggestion: SchemaSuggestion,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    jsonData: any
  ): SuggestionApplication {
    return {
      id: suggestion.id,
      success: true,
      message: `Security recommendation noted: ${suggestion.description}`,
    };
  }

  /**
   * Helper Methods
   */
  private static validateFieldPattern(
    data: any,
    fieldPath: string,
    validationRule: string
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestedFixes: string[] = [];

    try {
      const fieldValues = this.extractFieldValues(data, fieldPath);

      if (fieldValues.length === 0) {
        warnings.push(`No values found for field "${fieldPath}"`);
        return { isValid: true, errors, warnings, suggestedFixes };
      }

      const invalidValues = fieldValues.filter(
        value => !this.testValidationRule(value, validationRule)
      );

      if (invalidValues.length > 0) {
        errors.push(`${invalidValues.length} values don't match the validation pattern`);
        suggestedFixes.push("Review and update invalid values manually");
      }

      return {
        isValid: invalidValues.length === 0,
        errors,
        warnings,
        suggestedFixes,
      };
    } catch (error) {
      errors.push(`Validation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      return { isValid: false, errors, warnings, suggestedFixes };
    }
  }

  private static extractFieldValues(data: any, fieldPath: string): any[] {
    const values: any[] = [];

    // Simple implementation for common field paths
    if (fieldPath.startsWith("$.")) {
      const path = fieldPath.substring(2); // Remove "$."
      this.traverseObject(data, path, values);
    }

    return values;
  }

  private static traverseObject(obj: any, path: string, values: any[]): void {
    if (!obj || typeof obj !== "object") return;

    const parts = path.split(".");
    const currentKey = parts[0];
    const remainingPath = parts.slice(1).join(".");

    if (parts.length === 1) {
      // Last part of path
      if (Array.isArray(obj)) {
        obj.forEach(item => {
          if (item && typeof item === "object" && currentKey in item) {
            values.push(item[currentKey]);
          }
        });
      } else if (currentKey in obj) {
        values.push(obj[currentKey]);
      }
    } else {
      // Continue traversing
      if (Array.isArray(obj)) {
        obj.forEach(item => {
          if (item && typeof item === "object" && currentKey in item) {
            this.traverseObject(item[currentKey], remainingPath, values);
          }
        });
      } else if (currentKey in obj) {
        this.traverseObject(obj[currentKey], remainingPath, values);
      }
    }
  }

  private static testValidationRule(value: any, rule: string): boolean {
    try {
      // Basic pattern testing
      if (rule.includes("email")) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(String(value));
      }

      if (rule.includes("uuid")) {
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(String(value));
      }

      if (rule.includes("url")) {
        try {
          new URL(String(value));
          return true;
        } catch {
          return false;
        }
      }

      if (rule.includes("date")) {
        return !isNaN(Date.parse(String(value)));
      }

      // For regex patterns
      if (rule.startsWith("/") && rule.endsWith("/")) {
        const pattern = rule.slice(1, -1);
        const regex = new RegExp(pattern);
        return regex.test(String(value));
      }

      return true; // Default to valid for unknown patterns
    } catch {
      return false;
    }
  }
}
