/**
 * Advanced data type inference system for SQL schema generation
 * Provides intelligent detection of data types beyond basic JSON types
 */

export interface DataTypeAnalysis {
  detectedType: string;
  confidence: number;
  sqlType: string;
  constraints: string[];
  patterns: string[];
  samples: any[];
  statistics: TypeStatistics;
}

export interface TypeStatistics {
  nullCount: number;
  uniqueCount: number;
  minLength?: number;
  maxLength?: number;
  avgLength?: number;
  minValue?: number;
  maxValue?: number;
  avgValue?: number;
  commonValues: Array<{ value: any; count: number }>;
  distribution: string;
}

/**
 * Detects the most appropriate data type for a given value or array of values
 */
export function detectDataType(value: any): string {
  if (value === null || value === undefined) {
    return "null";
  }

  if (Array.isArray(value)) {
    return analyzeArrayType(value);
  }

  if (typeof value === "object") {
    return "object";
  }

  if (typeof value === "boolean") {
    return "boolean";
  }

  if (typeof value === "number") {
    return analyzeNumericType(value);
  }

  if (typeof value === "string") {
    return analyzeStringType(value);
  }

  return typeof value;
}

/**
 * Performs comprehensive analysis of multiple values to determine best data type
 */
export function analyzeDataTypeFromSamples(samples: any[]): DataTypeAnalysis {
  if (samples.length === 0) {
    return {
      detectedType: "unknown",
      confidence: 0,
      sqlType: "TEXT",
      constraints: [],
      patterns: [],
      samples: [],
      statistics: createEmptyStatistics(),
    };
  }

  // Filter out null/undefined values for type analysis
  const nonNullSamples = samples.filter(v => v !== null && v !== undefined);
  const nullCount = samples.length - nonNullSamples.length;

  if (nonNullSamples.length === 0) {
    return {
      detectedType: "null",
      confidence: 1.0,
      sqlType: "TEXT",
      constraints: [],
      patterns: [],
      samples,
      statistics: { ...createEmptyStatistics(), nullCount },
    };
  }

  // Analyze each sample
  const typeAnalyses = nonNullSamples.map(sample => ({
    value: sample,
    type: detectDataType(sample),
    patterns: detectPatterns(sample),
  }));

  // Find the most common type
  const typeFrequency = new Map<string, number>();
  typeAnalyses.forEach(analysis => {
    const count = typeFrequency.get(analysis.type) || 0;
    typeFrequency.set(analysis.type, count + 1);
  });

  const mostCommonType = Array.from(typeFrequency.entries()).sort((a, b) => b[1] - a[1])[0][0];

  const confidence = (typeFrequency.get(mostCommonType) || 0) / nonNullSamples.length;

  // Generate statistics
  const statistics = generateTypeStatistics(nonNullSamples, mostCommonType, nullCount);

  // Determine SQL type and constraints
  const sqlTypeInfo = determineSQLType(mostCommonType, nonNullSamples, statistics);

  // Collect all patterns
  const allPatterns = Array.from(new Set(typeAnalyses.flatMap(a => a.patterns)));

  return {
    detectedType: mostCommonType,
    confidence,
    sqlType: sqlTypeInfo.sqlType,
    constraints: sqlTypeInfo.constraints,
    patterns: allPatterns,
    samples,
    statistics,
  };
}

/**
 * Analyzes array data type by examining all elements
 */
function analyzeArrayType(arr: any[]): string {
  if (arr.length === 0) return "array";

  const elementTypes = arr.map(detectDataType);
  const uniqueTypes = Array.from(new Set(elementTypes));

  if (uniqueTypes.length === 1) {
    return `array<${uniqueTypes[0]}>`;
  }

  // Mixed types - check for common patterns
  const primitiveTypes = uniqueTypes.filter(t => ["string", "number", "boolean"].includes(t));

  if (primitiveTypes.length === uniqueTypes.length) {
    return "array<mixed_primitive>";
  }

  return "array<mixed>";
}

/**
 * Analyzes numeric values to determine specific numeric type
 */
function analyzeNumericType(num: number): string {
  if (!Number.isFinite(num)) {
    return "number"; // Handle Infinity, -Infinity, NaN
  }

  if (Number.isInteger(num)) {
    // Determine integer size requirements
    if (num >= -128 && num <= 127) return "tinyint";
    if (num >= -32768 && num <= 32767) return "smallint";
    if (num >= -2147483648 && num <= 2147483647) return "int";
    return "bigint";
  }

  // Decimal number - analyze precision
  const str = num.toString();
  const decimalIndex = str.indexOf(".");

  if (decimalIndex === -1) {
    return "number"; // Should not happen for non-integers
  }

  const decimalPlaces = str.length - decimalIndex - 1;

  if (decimalPlaces <= 2) return "decimal_2";
  if (decimalPlaces <= 4) return "decimal_4";
  if (decimalPlaces <= 8) return "decimal_8";

  return "double";
}

/**
 * Analyzes string values to detect specific patterns and types
 */
function analyzeStringType(str: string): string {
  if (str.length === 0) return "string";

  // UUID detection (multiple formats)
  if (isUUID(str)) return "uuid";

  // Email detection
  if (isEmail(str)) return "email";

  // URL detection
  if (isURL(str)) return "url";

  // Date/DateTime detection
  if (isDateTime(str)) return "datetime";
  if (isDate(str)) return "date";
  if (isTime(str)) return "time";

  // Phone number detection
  if (isPhoneNumber(str)) return "phone";

  // JSON detection
  if (isJSON(str)) return "json";

  // Base64 detection
  if (isBase64(str)) return "base64";

  // Hash detection
  if (isHash(str)) return "hash";

  // IP Address detection
  if (isIPAddress(str)) return "ip_address";

  // Credit card detection
  if (isCreditCard(str)) return "credit_card";

  // Currency detection
  if (isCurrency(str)) return "currency";

  // Coordinates detection
  if (isCoordinates(str)) return "coordinates";

  // Color code detection
  if (isColorCode(str)) return "color";

  // File path detection
  if (isFilePath(str)) return "file_path";

  // Default string analysis
  return analyzeStringLength(str);
}

/**
 * Analyzes string length to suggest appropriate varchar size
 */
function analyzeStringLength(str: string): string {
  const len = str.length;

  if (len <= 10) return "string_short";
  if (len <= 50) return "string_medium";
  if (len <= 255) return "string_long";
  if (len <= 1000) return "string_very_long";

  return "text";
}

/**
 * Pattern detection functions
 */
export function detectPatterns(value: any): string[] {
  const patterns: string[] = [];

  if (typeof value !== "string") return patterns;

  if (isUUID(value)) patterns.push("uuid");
  if (isEmail(value)) patterns.push("email");
  if (isURL(value)) patterns.push("url");
  if (isDateTime(value)) patterns.push("datetime");
  if (isDate(value)) patterns.push("date");
  if (isTime(value)) patterns.push("time");
  if (isPhoneNumber(value)) patterns.push("phone");
  if (isJSON(value)) patterns.push("json");
  if (isBase64(value)) patterns.push("base64");
  if (isHash(value)) patterns.push("hash");
  if (isIPAddress(value)) patterns.push("ip_address");
  if (isCreditCard(value)) patterns.push("credit_card");
  if (isCurrency(value)) patterns.push("currency");
  if (isCoordinates(value)) patterns.push("coordinates");
  if (isColorCode(value)) patterns.push("color");
  if (isFilePath(value)) patterns.push("file_path");

  return patterns;
}

// Pattern detection utility functions
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const uuidNoHyphens = /^[0-9a-f]{32}$/i;
  return uuidRegex.test(str) || uuidNoHyphens.test(str);
}

function isEmail(str: string): boolean {
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(str);
}

function isURL(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

function isDateTime(str: string): boolean {
  if (str.length < 8) return false;

  // ISO 8601 formats
  const isoRegex = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?$/;
  if (isoRegex.test(str)) {
    return !isNaN(Date.parse(str));
  }

  // Common datetime formats
  const commonFormats = [
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
    /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/,
    /^\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2}$/,
  ];

  return commonFormats.some(regex => regex.test(str)) && !isNaN(Date.parse(str));
}

function isDate(str: string): boolean {
  if (str.length < 6) return false;

  // ISO date format
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (isoDateRegex.test(str)) {
    return !isNaN(Date.parse(str));
  }

  // Common date formats
  const dateFormats = [
    /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
    /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
    /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
  ];

  return dateFormats.some(regex => regex.test(str)) && !isNaN(Date.parse(str));
}

function isTime(str: string): boolean {
  const timeRegex = /^\d{2}:\d{2}:\d{2}(?:\.\d{3})?$/;
  return timeRegex.test(str);
}

function isPhoneNumber(str: string): boolean {
  // Remove common phone number characters
  const cleaned = str.replace(/[\s\-\(\)\+\.]/g, "");

  // Check if it's all digits and reasonable length
  if (!/^\d+$/.test(cleaned)) return false;

  return cleaned.length >= 10 && cleaned.length <= 15;
}

function isJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

function isBase64(str: string): boolean {
  if (str.length < 4 || str.length % 4 !== 0) return false;

  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  return base64Regex.test(str);
}

function isHash(str: string): boolean {
  // MD5 (32 chars), SHA1 (40 chars), SHA256 (64 chars), SHA512 (128 chars)
  const hashLengths = [32, 40, 64, 128];
  const hexRegex = /^[a-fA-F0-9]+$/;

  return hashLengths.includes(str.length) && hexRegex.test(str);
}

function isIPAddress(str: string): boolean {
  // IPv4
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (ipv4Regex.test(str)) return true;

  // IPv6 (simplified)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv6Regex.test(str);
}

function isCreditCard(str: string): boolean {
  const cleaned = str.replace(/[\s\-]/g, "");

  // Luhn algorithm check
  if (!/^\d+$/.test(cleaned) || cleaned.length < 13 || cleaned.length > 19) {
    return false;
  }

  let sum = 0;
  let alternate = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned.charAt(i), 10);

    if (alternate) {
      digit *= 2;
      if (digit > 9) {
        digit = (digit % 10) + 1;
      }
    }

    sum += digit;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

function isCurrency(str: string): boolean {
  const currencyRegex = /^[\$£€¥₹₽¢₩₪₨₦₡₨₫₦₡₨₫]?\s?[\d,]+\.?\d{0,4}$/;
  return currencyRegex.test(str);
}

function isCoordinates(str: string): boolean {
  // Latitude, Longitude format
  const coordRegex = /^-?\d{1,3}\.\d+,\s?-?\d{1,3}\.\d+$/;
  return coordRegex.test(str);
}

function isColorCode(str: string): boolean {
  // Hex color codes
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  if (hexColorRegex.test(str)) return true;

  // RGB/RGBA
  const rgbRegex = /^rgba?\(\s?\d{1,3}\s?,\s?\d{1,3}\s?,\s?\d{1,3}\s?(?:,\s?[01]?\.?\d*)?\)$/;
  return rgbRegex.test(str);
}

function isFilePath(str: string): boolean {
  // Unix/Linux/Mac path
  if (str.startsWith("/") && str.includes("/")) return true;

  // Windows path
  if (/^[A-Z]:\\/.test(str) && str.includes("\\")) return true;

  // Relative path
  if (str.includes("./") || str.includes("../")) return true;

  // File extension check
  if (/\.[a-zA-Z0-9]+$/.test(str) && str.length > 3) return true;

  return false;
}

/**
 * Generates comprehensive statistics for a dataset
 */
function generateTypeStatistics(
  samples: any[],
  detectedType: string,
  nullCount: number
): TypeStatistics {
  const statistics: TypeStatistics = {
    nullCount,
    uniqueCount: 0,
    commonValues: [],
    distribution: "unknown",
  };

  if (samples.length === 0) return statistics;

  // Count unique values and frequencies
  const valueFrequency = new Map<any, number>();
  samples.forEach(value => {
    const count = valueFrequency.get(value) || 0;
    valueFrequency.set(value, count + 1);
  });

  statistics.uniqueCount = valueFrequency.size;

  // Get most common values
  statistics.commonValues = Array.from(valueFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([value, count]) => ({ value, count }));

  // Type-specific statistics
  if (detectedType.includes("string") || detectedType === "email" || detectedType === "url") {
    const lengths = samples.map(s => String(s).length);
    statistics.minLength = Math.min(...lengths);
    statistics.maxLength = Math.max(...lengths);
    statistics.avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  }

  if (
    detectedType.includes("int") ||
    detectedType.includes("decimal") ||
    detectedType === "number"
  ) {
    const numericValues = samples.map(s => Number(s)).filter(n => !isNaN(n));
    if (numericValues.length > 0) {
      statistics.minValue = Math.min(...numericValues);
      statistics.maxValue = Math.max(...numericValues);
      statistics.avgValue = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
    }
  }

  // Determine distribution
  const uniqueRatio = statistics.uniqueCount / samples.length;
  if (uniqueRatio === 1) {
    statistics.distribution = "unique";
  } else if (uniqueRatio > 0.8) {
    statistics.distribution = "high_cardinality";
  } else if (uniqueRatio > 0.3) {
    statistics.distribution = "medium_cardinality";
  } else {
    statistics.distribution = "low_cardinality";
  }

  return statistics;
}

/**
 * Determines the appropriate SQL type based on detected type and statistics
 */
function determineSQLType(
  detectedType: string,
  samples: any[],
  statistics: TypeStatistics
): { sqlType: string; constraints: string[] } {
  const constraints: string[] = [];

  switch (detectedType) {
    case "uuid":
      return { sqlType: "UUID", constraints: ["NOT NULL", "UNIQUE"] };

    case "email":
      constraints.push("CHECK (value ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$')");
      return { sqlType: "VARCHAR(255)", constraints };

    case "url":
      constraints.push("CHECK (value ~* '^https?://.+')");
      return { sqlType: "VARCHAR(500)", constraints };

    case "datetime":
      return { sqlType: "TIMESTAMP", constraints: [] };

    case "date":
      return { sqlType: "DATE", constraints: [] };

    case "time":
      return { sqlType: "TIME", constraints: [] };

    case "phone":
      return { sqlType: "VARCHAR(20)", constraints: [] };

    case "json":
      return { sqlType: "JSON", constraints: [] };

    case "ip_address":
      return { sqlType: "INET", constraints: [] };

    case "currency":
      return { sqlType: "DECIMAL(15,2)", constraints: ["CHECK (value >= 0)"] };

    case "tinyint":
      return { sqlType: "SMALLINT", constraints: [] };

    case "smallint":
      return { sqlType: "SMALLINT", constraints: [] };

    case "int":
      return { sqlType: "INTEGER", constraints: [] };

    case "bigint":
      return { sqlType: "BIGINT", constraints: [] };

    case "decimal_2":
      return { sqlType: "DECIMAL(10,2)", constraints: [] };

    case "decimal_4":
      return { sqlType: "DECIMAL(15,4)", constraints: [] };

    case "decimal_8":
      return { sqlType: "DECIMAL(20,8)", constraints: [] };

    case "double":
      return { sqlType: "DOUBLE PRECISION", constraints: [] };

    case "boolean":
      return { sqlType: "BOOLEAN", constraints: [] };

    case "string_short":
      return { sqlType: "VARCHAR(25)", constraints: [] };

    case "string_medium":
      return { sqlType: "VARCHAR(100)", constraints: [] };

    case "string_long":
      return { sqlType: "VARCHAR(255)", constraints: [] };

    case "string_very_long":
      return { sqlType: "VARCHAR(1000)", constraints: [] };

    case "text":
      return { sqlType: "TEXT", constraints: [] };

    default:
      // Use statistics to determine best fit
      if (statistics.maxLength && statistics.maxLength <= 255) {
        return { sqlType: `VARCHAR(${Math.max(50, statistics.maxLength * 1.2)})`, constraints: [] };
      }
      return { sqlType: "TEXT", constraints: [] };
  }
}

/**
 * Creates empty statistics object
 */
function createEmptyStatistics(): TypeStatistics {
  return {
    nullCount: 0,
    uniqueCount: 0,
    commonValues: [],
    distribution: "unknown",
  };
}

/**
 * Analyzes enum possibilities from categorical data
 */
export function analyzeEnumPossibilities(samples: any[]): {
  isEnum: boolean;
  enumValues: string[];
  confidence: number;
} {
  if (samples.length === 0) {
    return { isEnum: false, enumValues: [], confidence: 0 };
  }

  const nonNullSamples = samples.filter(s => s !== null && s !== undefined);
  const uniqueValues = Array.from(new Set(nonNullSamples));

  // Consider as enum if:
  // 1. Less than 20 unique values
  // 2. Unique values are less than 50% of total samples
  // 3. All values are strings or numbers

  const uniqueRatio = uniqueValues.length / nonNullSamples.length;
  const isStringOrNumber = uniqueValues.every(v => typeof v === "string" || typeof v === "number");

  if (uniqueValues.length <= 20 && uniqueRatio < 0.5 && isStringOrNumber) {
    const confidence = Math.max(0.1, 1 - uniqueRatio);
    return {
      isEnum: true,
      enumValues: uniqueValues.map(v => String(v)),
      confidence,
    };
  }

  return { isEnum: false, enumValues: [], confidence: 0 };
}
