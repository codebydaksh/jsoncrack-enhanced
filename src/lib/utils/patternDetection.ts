/* eslint-disable @typescript-eslint/no-unused-vars */
import { PatternType, type PatternAnalysis } from "../../types/schema";

interface PatternDetector {
  pattern: PatternType;
  regex: RegExp;
  validator: (value: string) => boolean;
  confidence: (value: string, allValues: string[], fieldName?: string) => number;
  suggestion: string;
  validationRule?: string;
}

export class PatternDetectionEngine {
  private detectors: PatternDetector[] = [
    {
      pattern: PatternType.UUID,
      regex: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      validator: (value: string) => {
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(value);
      },
      confidence: (value: string, allValues: string[], fieldName?: string) => {
        const matches = allValues.filter(v => this.detectors[0].validator(v)).length;
        const ratio = matches / allValues.length;
        return ratio > 0.8 ? 0.95 : ratio > 0.5 ? 0.8 : ratio > 0.3 ? 0.6 : 0.3;
      },
      suggestion: "Consider using UUID format validation",
      validationRule:
        "pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i",
    },
    {
      pattern: PatternType.EMAIL,
      regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      validator: (value: string) => {
        const emailRegex =
          /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        return emailRegex.test(value) && value.length <= 254;
      },
      confidence: (value: string, allValues: string[], fieldName?: string) => {
        const matches = allValues.filter(v => this.detectors[1].validator(v)).length;
        const ratio = matches / allValues.length;
        return ratio > 0.8 ? 0.95 : ratio > 0.5 ? 0.8 : ratio > 0.3 ? 0.6 : 0.3;
      },
      suggestion: "Consider using email format validation",
      validationRule: "format: 'email'",
    },
    {
      pattern: PatternType.URL,
      regex:
        /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
      validator: (value: string) => {
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
      confidence: (value: string, allValues: string[], fieldName?: string) => {
        const matches = allValues.filter(v => this.detectors[2].validator(v)).length;
        const ratio = matches / allValues.length;
        return ratio > 0.8 ? 0.95 : ratio > 0.5 ? 0.8 : ratio > 0.3 ? 0.6 : 0.3;
      },
      suggestion: "Consider using URL format validation",
      validationRule: "format: 'uri'",
    },
    {
      pattern: PatternType.DATE,
      regex: /^\d{4}-\d{2}-\d{2}$/,
      validator: (value: string) => {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(value)) return false;
        const date = new Date(value);
        return (
          date instanceof Date &&
          !isNaN(date.getTime()) &&
          date.toISOString().substring(0, 10) === value
        );
      },
      confidence: (value: string, allValues: string[], fieldName?: string) => {
        const matches = allValues.filter(v => this.detectors[3].validator(v)).length;
        const ratio = matches / allValues.length;
        return ratio > 0.8 ? 0.95 : ratio > 0.5 ? 0.8 : ratio > 0.3 ? 0.6 : 0.3;
      },
      suggestion: "Consider using date format validation",
      validationRule: "format: 'date'",
    },
    {
      pattern: PatternType.DATETIME,
      regex: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
      validator: (value: string) => {
        const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
        if (!isoRegex.test(value)) return false;
        const date = new Date(value);
        return date instanceof Date && !isNaN(date.getTime());
      },
      confidence: (value: string, allValues: string[], fieldName?: string) => {
        const matches = allValues.filter(v => this.detectors[4].validator(v)).length;
        const ratio = matches / allValues.length;
        return ratio > 0.8 ? 0.95 : ratio > 0.5 ? 0.8 : ratio > 0.3 ? 0.6 : 0.3;
      },
      suggestion: "Consider using datetime format validation",
      validationRule: "format: 'date-time'",
    },
    {
      pattern: PatternType.PHONE,
      regex: /^[\+]?[1-9][\d]{0,15}$/,
      validator: (value: string) => {
        const cleaned = value.replace(/[\s\-\(\)\+\.]/g, "");
        const phoneRegex = /^[1-9]\d{6,14}$/;
        return phoneRegex.test(cleaned);
      },
      confidence: (value: string, allValues: string[], fieldName?: string) => {
        const matches = allValues.filter(v => this.detectors[5].validator(v)).length;
        const ratio = matches / allValues.length;
        return ratio > 0.8 ? 0.9 : ratio > 0.5 ? 0.75 : ratio > 0.3 ? 0.6 : 0.3;
      },
      suggestion: "Consider using phone number format validation",
      validationRule: "pattern: /^[\\+]?[1-9][\\d]{0,15}$/",
    },
    {
      pattern: PatternType.IP_ADDRESS,
      regex:
        /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
      validator: (value: string) => {
        const ipRegex =
          /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipRegex.test(value);
      },
      confidence: (value: string, allValues: string[], fieldName?: string) => {
        const matches = allValues.filter(v => this.detectors[6].validator(v)).length;
        const ratio = matches / allValues.length;
        return ratio > 0.8 ? 0.95 : ratio > 0.5 ? 0.8 : ratio > 0.3 ? 0.6 : 0.3;
      },
      suggestion: "Consider using IP address format validation",
      validationRule: "format: 'ipv4'",
    },
    {
      pattern: PatternType.BASE64,
      regex: /^[A-Za-z0-9+/]*={0,2}$/,
      validator: (value: string) => {
        if (!value || value.length < 4) return false;
        const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
        return base64Regex.test(value) && value.length % 4 === 0;
      },
      confidence: (value: string, allValues: string[], fieldName?: string) => {
        const matches = allValues.filter(v => this.detectors[7].validator(v)).length;
        const ratio = matches / allValues.length;
        return ratio > 0.8 ? 0.9 : ratio > 0.5 ? 0.75 : ratio > 0.3 ? 0.6 : 0.25;
      },
      suggestion: "Consider using Base64 format validation",
      validationRule: "contentEncoding: 'base64'",
    },
    {
      pattern: PatternType.COORDINATE,
      regex: /^-?\d+\.?\d*$/,
      validator: (value: string) => {
        const num = parseFloat(value);
        return !isNaN(num) && num >= -180 && num <= 180;
      },
      confidence: (value: string, allValues: string[], fieldName?: string) => {
        if (!fieldName) return 0.3;
        const coordinateKeywords = ["lat", "lng", "lon", "latitude", "longitude", "coord"];
        const hasCoordKeyword = coordinateKeywords.some(keyword =>
          fieldName.toLowerCase().includes(keyword)
        );

        if (!hasCoordKeyword) return 0.3;

        const matches = allValues.filter(v => this.detectors[8].validator(v)).length;
        const ratio = matches / allValues.length;
        return ratio > 0.8 ? 0.9 : ratio > 0.5 ? 0.8 : ratio > 0.3 ? 0.6 : 0.4;
      },
      suggestion: "Consider using coordinate validation with range constraints",
      validationRule: "type: 'number', minimum: -180, maximum: 180",
    },
    {
      pattern: PatternType.COLOR,
      regex: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
      validator: (value: string) => {
        const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        return hexColorRegex.test(value);
      },
      confidence: (value: string, allValues: string[], fieldName?: string) => {
        const matches = allValues.filter(v => this.detectors[9].validator(v)).length;
        const ratio = matches / allValues.length;
        return ratio > 0.8 ? 0.95 : ratio > 0.5 ? 0.8 : ratio > 0.3 ? 0.6 : 0.3;
      },
      suggestion: "Consider using color format validation",
      validationRule: "pattern: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/",
    },
  ];

  public detectPatterns(
    fieldPath: string,
    values: any[],
    confidenceThreshold: number = 0.6
  ): PatternAnalysis[] {
    const stringValues = values
      .filter(v => typeof v === "string" && v.trim().length > 0)
      .map(v => v.trim());

    if (stringValues.length === 0) {
      return [];
    }

    const patterns: PatternAnalysis[] = [];

    const enumPattern = this.detectEnumPattern(fieldPath, stringValues, confidenceThreshold);
    if (enumPattern) {
      patterns.push(enumPattern);
    }

    this.detectors.forEach(detector => {
      const matchingValues = stringValues.filter(value => detector.validator(value));

      if (matchingValues.length > 0) {
        const fieldName = this.extractFieldName(fieldPath);
        const confidence = detector.confidence(matchingValues[0], stringValues, fieldName);

        if (confidence >= confidenceThreshold) {
          patterns.push({
            field: fieldPath,
            pattern: detector.pattern,
            confidence,
            examples: matchingValues.slice(0, 3),
            suggestion: detector.suggestion,
            validationRule: detector.validationRule,
          });
        }
      }
    });

    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  private detectEnumPattern(
    fieldPath: string,
    values: string[],
    confidenceThreshold: number
  ): PatternAnalysis | null {
    if (values.length < 2) return null;

    const uniqueValues = [...new Set(values)];
    const repetitionRatio = 1 - uniqueValues.length / values.length;

    if (repetitionRatio < 0.3) return null;

    let confidence = repetitionRatio;

    if (uniqueValues.length >= 2 && uniqueValues.length <= 20) {
      confidence += 0.2;
    }

    const hasConsistentCase = this.hasConsistentCasing(uniqueValues);
    if (hasConsistentCase) {
      confidence += 0.1;
    }

    confidence = Math.min(0.95, confidence);

    if (confidence >= confidenceThreshold) {
      return {
        field: fieldPath,
        pattern: PatternType.ENUM,
        confidence,
        examples: uniqueValues.slice(0, 5),
        suggestion: `Consider using enum validation with ${uniqueValues.length} possible values`,
        validationRule: `enum: [${uniqueValues.map(v => `"${v}"`).join(", ")}]`,
      };
    }

    return null;
  }

  private hasConsistentCasing(values: string[]): boolean {
    if (values.length <= 1) return true;

    const allUpperCase = values.every(v => v === v.toUpperCase());
    const allLowerCase = values.every(v => v === v.toLowerCase());
    const allTitleCase = values.every(
      v => v === v.charAt(0).toUpperCase() + v.slice(1).toLowerCase()
    );

    return allUpperCase || allLowerCase || allTitleCase;
  }

  private extractFieldName(path: string): string {
    const parts = path.split(".");
    return parts[parts.length - 1].replace(/\[\d+\]/g, "");
  }

  public analyzeAllPatterns(data: any, confidenceThreshold: number = 0.6): PatternAnalysis[] {
    const allPatterns: PatternAnalysis[] = [];
    const fieldValues: Record<string, any[]> = {};

    this.collectFieldValues(data, fieldValues);

    Object.entries(fieldValues).forEach(([field, values]) => {
      const patterns = this.detectPatterns(field, values, confidenceThreshold);
      allPatterns.push(...patterns);
    });

    return allPatterns;
  }

  private collectFieldValues(
    obj: any,
    fieldValues: Record<string, any[]>,
    path: string = "$"
  ): void {
    if (obj === null || obj === undefined) {
      return;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        this.collectFieldValues(item, fieldValues, `${path}[${index}]`);
      });
    } else if (typeof obj === "object") {
      Object.entries(obj).forEach(([key, value]) => {
        const fieldPath = `${path}.${key}`;

        if (!fieldValues[fieldPath]) {
          fieldValues[fieldPath] = [];
        }

        fieldValues[fieldPath].push(value);

        if (typeof value === "object" && value !== null) {
          this.collectFieldValues(value, fieldValues, fieldPath);
        }
      });
    }
  }
}
