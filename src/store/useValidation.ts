import { create } from "zustand";

interface ValidationError {
  path: string;
  message: string;
  severity: "error" | "warning";
  schemaPath: string;
}

export type { ValidationError };

interface ValidationState {
  isValidationEnabled: boolean;
  schema: any | null;
  errors: ValidationError[];
  isValidating: boolean;
  validationResults: {
    isValid: boolean;
    errorCount: number;
    warningCount: number;
  };
}

interface ValidationActions {
  setValidationEnabled: (enabled: boolean) => void;
  setSchema: (schema: any | null) => void;
  setErrors: (errors: ValidationError[]) => void;
  setIsValidating: (validating: boolean) => void;
  validateData: (jsonData: string) => Promise<void>;
  clearValidation: () => void;
  getErrorsForPath: (path: string) => ValidationError[];
}

// Simple JSON Schema validation (lightweight alternative to ajv)
const validateJsonSchema = (data: any, schema: any, path = "$"): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!schema || typeof schema !== "object") {
    return errors;
  }

  // Type validation
  if (schema.type) {
    const actualType = Array.isArray(data) ? "array" : typeof data;
    const expectedType = schema.type;

    if (actualType !== expectedType) {
      errors.push({
        path,
        message: `Expected type "${expectedType}" but got "${actualType}"`,
        severity: "error",
        schemaPath: `${path}/type`,
      });
    }
  }

  // Required properties validation
  if (
    schema.required &&
    Array.isArray(schema.required) &&
    typeof data === "object" &&
    data !== null
  ) {
    schema.required.forEach((requiredProp: string) => {
      if (!(requiredProp in data)) {
        errors.push({
          path: `${path}.${requiredProp}`,
          message: `Missing required property "${requiredProp}"`,
          severity: "error",
          schemaPath: `${path}/required`,
        });
      }
    });
  }

  // Properties validation for objects
  if (schema.properties && typeof data === "object" && data !== null && !Array.isArray(data)) {
    Object.keys(data).forEach(key => {
      const propertySchema = schema.properties[key];
      if (propertySchema) {
        const nestedErrors = validateJsonSchema(data[key], propertySchema, `${path}.${key}`);
        errors.push(...nestedErrors);
      } else if (schema.additionalProperties === false) {
        errors.push({
          path: `${path}.${key}`,
          message: `Property "${key}" is not allowed`,
          severity: "warning",
          schemaPath: `${path}/additionalProperties`,
        });
      }
    });
  }

  // Array items validation
  if (schema.items && Array.isArray(data)) {
    data.forEach((item, index) => {
      const nestedErrors = validateJsonSchema(item, schema.items, `${path}[${index}]`);
      errors.push(...nestedErrors);
    });
  }

  // String validation
  if (schema.minLength && typeof data === "string" && data.length < schema.minLength) {
    errors.push({
      path,
      message: `String is too short (minimum length: ${schema.minLength})`,
      severity: "error",
      schemaPath: `${path}/minLength`,
    });
  }

  if (schema.maxLength && typeof data === "string" && data.length > schema.maxLength) {
    errors.push({
      path,
      message: `String is too long (maximum length: ${schema.maxLength})`,
      severity: "error",
      schemaPath: `${path}/maxLength`,
    });
  }

  // Number validation
  if (schema.minimum !== undefined && typeof data === "number" && data < schema.minimum) {
    errors.push({
      path,
      message: `Value is below minimum (minimum: ${schema.minimum})`,
      severity: "error",
      schemaPath: `${path}/minimum`,
    });
  }

  if (schema.maximum !== undefined && typeof data === "number" && data > schema.maximum) {
    errors.push({
      path,
      message: `Value is above maximum (maximum: ${schema.maximum})`,
      severity: "error",
      schemaPath: `${path}/maximum`,
    });
  }

  // Pattern validation
  if (schema.pattern && typeof data === "string") {
    const regex = new RegExp(schema.pattern);
    if (!regex.test(data)) {
      errors.push({
        path,
        message: `String does not match pattern "${schema.pattern}"`,
        severity: "error",
        schemaPath: `${path}/pattern`,
      });
    }
  }

  // Enum validation
  if (schema.enum && Array.isArray(schema.enum)) {
    if (!schema.enum.includes(data)) {
      errors.push({
        path,
        message: `Value must be one of: ${schema.enum.join(", ")}`,
        severity: "error",
        schemaPath: `${path}/enum`,
      });
    }
  }

  return errors;
};

const useValidation = create<ValidationState & ValidationActions>((set, get) => ({
  // Initial state
  isValidationEnabled: false,
  schema: null,
  errors: [],
  isValidating: false,
  validationResults: {
    isValid: true,
    errorCount: 0,
    warningCount: 0,
  },

  // Actions
  setValidationEnabled: (enabled: boolean) => {
    set({ isValidationEnabled: enabled });
    if (!enabled) {
      set({ errors: [], validationResults: { isValid: true, errorCount: 0, warningCount: 0 } });
    }
  },

  setSchema: (schema: any | null) => {
    set({ schema });
    if (!schema) {
      set({
        errors: [],
        validationResults: { isValid: true, errorCount: 0, warningCount: 0 },
        isValidationEnabled: false,
      });
    }
  },

  setErrors: (errors: ValidationError[]) => {
    const errorCount = errors.filter(e => e.severity === "error").length;
    const warningCount = errors.filter(e => e.severity === "warning").length;

    set({
      errors,
      validationResults: {
        isValid: errorCount === 0,
        errorCount,
        warningCount,
      },
    });
  },

  setIsValidating: (validating: boolean) => {
    set({ isValidating: validating });
  },

  validateData: async (jsonData: string) => {
    const { schema, isValidationEnabled } = get();

    if (!isValidationEnabled || !schema) {
      return;
    }

    set({ isValidating: true });

    try {
      const data = JSON.parse(jsonData);
      const errors = validateJsonSchema(data, schema);

      const errorCount = errors.filter(e => e.severity === "error").length;
      const warningCount = errors.filter(e => e.severity === "warning").length;

      set({
        errors,
        validationResults: {
          isValid: errorCount === 0,
          errorCount,
          warningCount,
        },
        isValidating: false,
      });
    } catch (error) {
      // JSON parsing error
      set({
        errors: [
          {
            path: "$",
            message: "Invalid JSON format",
            severity: "error",
            schemaPath: "$",
          },
        ],
        validationResults: {
          isValid: false,
          errorCount: 1,
          warningCount: 0,
        },
        isValidating: false,
      });
    }
  },

  clearValidation: () => {
    set({
      schema: null,
      errors: [],
      isValidationEnabled: false,
      isValidating: false,
      validationResults: {
        isValid: true,
        errorCount: 0,
        warningCount: 0,
      },
    });
  },

  getErrorsForPath: (path: string): ValidationError[] => {
    const { errors } = get();
    return errors.filter(
      error =>
        error.path === path ||
        error.path.startsWith(`${path}.`) ||
        error.path.startsWith(`${path}[`)
    );
  },
}));

export default useValidation;
