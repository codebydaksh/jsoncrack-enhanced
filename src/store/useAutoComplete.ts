import { create } from "zustand";

export interface AutoCompleteSuggestion {
  text: string;
  type: "key" | "value" | "structure" | "pattern";
  description: string;
  insertText: string;
  priority: number; // Higher = more important
  category: string;
  icon?: string;
  documentation?: string;
}

export interface AutoCompleteContext {
  currentPath: string[];
  currentKey?: string;
  currentValue?: any;
  parentType: "object" | "array" | "root";
  neighborKeys: string[];
  depth: number;
  cursorPosition: number;
  textBeforeCursor: string;
  textAfterCursor: string;
}

interface AutoCompleteState {
  isEnabled: boolean;
  suggestions: AutoCompleteSuggestion[];
  selectedIndex: number;
  isVisible: boolean;
  context: AutoCompleteContext | null;
  learningEnabled: boolean;
  customPatterns: Record<string, string[]>; // Custom user patterns
  commonPatterns: Record<string, string[]>; // Learned common patterns
  recentKeys: string[]; // Recently used keys
  schemaAware: boolean; // Use schema for suggestions
}

interface AutoCompleteActions {
  setEnabled: (enabled: boolean) => void;
  setVisible: (visible: boolean) => void;
  setSelectedIndex: (index: number) => void;
  setContext: (context: AutoCompleteContext) => void;
  generateSuggestions: (context: AutoCompleteContext, jsonData?: string) => void;
  selectNext: () => void;
  selectPrevious: () => void;
  applySuggestion: (suggestion: AutoCompleteSuggestion) => string;
  addCustomPattern: (pattern: string, suggestions: string[]) => void;
  learnFromUsage: (key: string, context: string[]) => void;
  setSchemaAware: (enabled: boolean) => void;
  clearSuggestions: () => void;
}

// Common JSON patterns and structures
const COMMON_PATTERNS = {
  user: [
    "id",
    "name",
    "email",
    "username",
    "firstName",
    "lastName",
    "avatar",
    "createdAt",
    "updatedAt",
  ],
  address: ["street", "city", "state", "country", "zipCode", "coordinates"],
  product: ["id", "name", "description", "price", "category", "stock", "sku", "brand"],
  order: ["id", "userId", "items", "total", "status", "createdAt", "shippingAddress"],
  api: ["data", "error", "message", "status", "code", "timestamp"],
  pagination: ["page", "limit", "total", "totalPages", "hasNext", "hasPrevious"],
  response: ["success", "data", "error", "message", "statusCode", "timestamp"],
  config: ["host", "port", "database", "username", "password", "ssl", "timeout"],
  metadata: ["version", "author", "description", "tags", "createdAt", "updatedAt"],
  coordinates: ["latitude", "longitude", "altitude"],
  datetime: ["createdAt", "updatedAt", "deletedAt", "publishedAt", "expiresAt"],
  file: ["name", "size", "type", "url", "path", "lastModified"],
  person: ["firstName", "lastName", "age", "gender", "email", "phone"],
  company: ["name", "industry", "size", "location", "website", "email"],
  social: ["platform", "username", "url", "followers", "verified"],
};

// Common value patterns
const VALUE_PATTERNS = {
  email: ["user@example.com", "admin@domain.com", "contact@company.org"],
  url: ["https://example.com", "https://api.domain.com/v1", "http://localhost:3000"],
  phone: ["+1-555-123-4567", "+44-20-1234-5678", "555.123.4567"],
  uuid: ["550e8400-e29b-41d4-a716-446655440000"],
  date: ["2024-01-01", "2024-12-31T23:59:59Z"],
  currency: ["USD", "EUR", "GBP", "JPY"],
  country: ["US", "UK", "CA", "AU", "DE", "FR"],
  status: ["active", "inactive", "pending", "completed", "cancelled"],
  priority: ["low", "medium", "high", "urgent"],
  role: ["admin", "user", "moderator", "guest"],
  type: ["string", "number", "boolean", "object", "array"],
};

// Analyze current context and generate intelligent suggestions
const generateIntelligentSuggestions = (
  context: AutoCompleteContext,
  jsonData?: string
): AutoCompleteSuggestion[] => {
  const suggestions: AutoCompleteSuggestion[] = [];

  // Schema-based suggestions (if we have existing JSON structure)
  if (jsonData) {
    try {
      const parsed = JSON.parse(jsonData);
      const schemaSuggestions = extractSchemaPatterns(parsed, context);
      suggestions.push(...schemaSuggestions);
    } catch {
      // Invalid JSON, skip schema suggestions
    }
  }

  // Pattern-based suggestions
  const patternSuggestions = generatePatternSuggestions(context);
  suggestions.push(...patternSuggestions);

  // Structure suggestions
  const structureSuggestions = generateStructureSuggestions(context);
  suggestions.push(...structureSuggestions);

  // Sort by priority and remove duplicates
  return suggestions
    .sort((a, b) => b.priority - a.priority)
    .filter(
      (suggestion, index, arr) =>
        arr.findIndex(s => s.insertText === suggestion.insertText) === index
    )
    .slice(0, 10); // Limit to top 10 suggestions
};

// Extract patterns from existing JSON structure
const extractSchemaPatterns = (
  data: any,
  context: AutoCompleteContext
): AutoCompleteSuggestion[] => {
  const suggestions: AutoCompleteSuggestion[] = [];

  const analyzeObject = (obj: any, path: string[] = []) => {
    if (typeof obj === "object" && obj !== null && !Array.isArray(obj)) {
      Object.keys(obj).forEach(key => {
        // If we're in a similar context, suggest this key
        if (path.length === context.currentPath.length - 1) {
          suggestions.push({
            text: key,
            type: "key",
            description: `Key from existing structure at ${path.join(".")}`,
            insertText: `"${key}": `,
            priority: 8,
            category: "Schema",
            icon: "🔑",
          });
        }

        // Analyze nested objects
        if (typeof obj[key] === "object" && obj[key] !== null) {
          analyzeObject(obj[key], [...path, key]);
        }
      });
    }
  };

  analyzeObject(data);
  return suggestions;
};

// Generate suggestions based on common patterns
const generatePatternSuggestions = (context: AutoCompleteContext): AutoCompleteSuggestion[] => {
  const suggestions: AutoCompleteSuggestion[] = [];

  // Detect pattern based on existing keys
  const detectedPatterns = detectPatterns(context.neighborKeys);

  detectedPatterns.forEach(pattern => {
    const patternKeys = COMMON_PATTERNS[pattern] || [];
    patternKeys.forEach(key => {
      if (!context.neighborKeys.includes(key)) {
        suggestions.push({
          text: key,
          type: "key",
          description: `Common ${pattern} property`,
          insertText: `"${key}": `,
          priority: 7,
          category: "Pattern",
          icon: getPatternIcon(pattern),
        });
      }
    });
  });

  return suggestions;
};

// Generate structural suggestions (objects, arrays, etc.)
const generateStructureSuggestions = (context: AutoCompleteContext): AutoCompleteSuggestion[] => {
  const suggestions: AutoCompleteSuggestion[] = [];

  if (context.parentType === "object") {
    // Common object structures
    suggestions.push(
      {
        text: "Empty Object",
        type: "structure",
        description: "Insert an empty object",
        insertText: "{}",
        priority: 5,
        category: "Structure",
        icon: "📦",
      },
      {
        text: "Empty Array",
        type: "structure",
        description: "Insert an empty array",
        insertText: "[]",
        priority: 5,
        category: "Structure",
        icon: "📋",
      },
      {
        text: "Nested Object",
        type: "structure",
        description: "Insert a nested object with common properties",
        insertText: '{\n  "id": "",\n  "name": "",\n  "value": ""\n}',
        priority: 6,
        category: "Structure",
        icon: "🏗️",
      }
    );
  }

  // Value suggestions based on key names
  if (context.currentKey) {
    const valueSuggestions = generateValueSuggestions(context.currentKey);
    suggestions.push(...valueSuggestions);
  }

  return suggestions;
};

// Generate value suggestions based on key name
const generateValueSuggestions = (keyName: string): AutoCompleteSuggestion[] => {
  const suggestions: AutoCompleteSuggestion[] = [];
  const lowerKey = keyName.toLowerCase();

  // Email suggestions
  if (lowerKey.includes("email") || lowerKey.includes("mail")) {
    VALUE_PATTERNS.email.forEach(email => {
      suggestions.push({
        text: email,
        type: "value",
        description: "Email address",
        insertText: `"${email}"`,
        priority: 8,
        category: "Value",
        icon: "📧",
      });
    });
  }

  // URL suggestions
  if (lowerKey.includes("url") || lowerKey.includes("link") || lowerKey.includes("href")) {
    VALUE_PATTERNS.url.forEach(url => {
      suggestions.push({
        text: url,
        type: "value",
        description: "URL",
        insertText: `"${url}"`,
        priority: 8,
        category: "Value",
        icon: "🔗",
      });
    });
  }

  // Status suggestions
  if (lowerKey.includes("status") || lowerKey.includes("state")) {
    VALUE_PATTERNS.status.forEach(status => {
      suggestions.push({
        text: status,
        type: "value",
        description: "Status value",
        insertText: `"${status}"`,
        priority: 7,
        category: "Value",
        icon: "📊",
      });
    });
  }

  // Date suggestions
  if (lowerKey.includes("date") || lowerKey.includes("time") || lowerKey.includes("at")) {
    VALUE_PATTERNS.date.forEach(date => {
      suggestions.push({
        text: date,
        type: "value",
        description: "Date/time value",
        insertText: `"${date}"`,
        priority: 7,
        category: "Value",
        icon: "📅",
      });
    });
  }

  return suggestions;
};

// Detect patterns from neighboring keys
const detectPatterns = (keys: string[]): string[] => {
  const patterns: string[] = [];

  Object.entries(COMMON_PATTERNS).forEach(([pattern, patternKeys]) => {
    const matchCount = keys.filter(key => patternKeys.includes(key)).length;
    if (matchCount >= 2) {
      // Require at least 2 matching keys
      patterns.push(pattern);
    }
  });

  return patterns;
};

// Get icon for pattern
const getPatternIcon = (pattern: string): string => {
  const icons: Record<string, string> = {
    user: "👤",
    address: "📍",
    product: "🛍️",
    order: "🛒",
    api: "🔌",
    pagination: "📄",
    response: "📨",
    config: "⚙️",
    metadata: "ℹ️",
    coordinates: "🌍",
    datetime: "🕒",
    file: "📁",
    person: "👤",
    company: "🏢",
    social: "📱",
  };
  return icons[pattern] || "🔑";
};

const useAutoComplete = create<AutoCompleteState & AutoCompleteActions>((set, get) => ({
  // Initial state
  isEnabled: true,
  suggestions: [],
  selectedIndex: 0,
  isVisible: false,
  context: null,
  learningEnabled: true,
  customPatterns: {},
  commonPatterns: {},
  recentKeys: [],
  schemaAware: true,

  // Actions
  setEnabled: (enabled: boolean) => {
    set({ isEnabled: enabled });
    if (!enabled) {
      set({ isVisible: false, suggestions: [] });
    }
  },

  setVisible: (visible: boolean) => {
    set({ isVisible: visible });
    if (!visible) {
      set({ selectedIndex: 0 });
    }
  },

  setSelectedIndex: (index: number) => {
    const { suggestions } = get();
    if (index >= 0 && index < suggestions.length) {
      set({ selectedIndex: index });
    }
  },

  setContext: (context: AutoCompleteContext) => {
    set({ context });
  },

  generateSuggestions: (context: AutoCompleteContext, jsonData?: string) => {
    const { isEnabled, schemaAware } = get();
    if (!isEnabled) return;

    const suggestions = generateIntelligentSuggestions(context, schemaAware ? jsonData : undefined);

    set({
      suggestions,
      selectedIndex: 0,
      isVisible: suggestions.length > 0,
      context,
    });
  },

  selectNext: () => {
    const { suggestions, selectedIndex } = get();
    const newIndex = (selectedIndex + 1) % suggestions.length;
    set({ selectedIndex: newIndex });
  },

  selectPrevious: () => {
    const { suggestions, selectedIndex } = get();
    const newIndex = selectedIndex <= 0 ? suggestions.length - 1 : selectedIndex - 1;
    set({ selectedIndex: newIndex });
  },

  applySuggestion: (suggestion: AutoCompleteSuggestion): string => {
    const { learningEnabled, context } = get();

    // Learn from usage
    if (learningEnabled && suggestion.type === "key" && context) {
      get().learnFromUsage(suggestion.text, context.currentPath);
    }

    // Hide suggestions
    set({ isVisible: false, suggestions: [] });

    return suggestion.insertText;
  },

  addCustomPattern: (pattern: string, suggestions: string[]) => {
    set(state => ({
      customPatterns: {
        ...state.customPatterns,
        [pattern]: suggestions,
      },
    }));
  },

  learnFromUsage: (key: string, context: string[]) => {
    const { recentKeys, commonPatterns } = get();

    // Add to recent keys
    const newRecentKeys = [key, ...recentKeys.filter(k => k !== key)].slice(0, 20);

    // Learn pattern based on context
    const contextKey = context.join(".");
    const existingPattern = commonPatterns[contextKey] || [];
    const newPattern = [key, ...existingPattern.filter(k => k !== key)].slice(0, 10);

    set({
      recentKeys: newRecentKeys,
      commonPatterns: {
        ...commonPatterns,
        [contextKey]: newPattern,
      },
    });
  },

  setSchemaAware: (enabled: boolean) => {
    set({ schemaAware: enabled });
  },

  clearSuggestions: () => {
    set({ suggestions: [], isVisible: false, selectedIndex: 0 });
  },
}));

export default useAutoComplete;
