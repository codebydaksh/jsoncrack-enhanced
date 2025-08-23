import { create } from "zustand";

export interface DataTemplate {
  id: string;
  name: string;
  description: string;
  category: "users" | "products" | "orders" | "companies" | "api" | "custom";
  schema: any;
  mockFields: MockField[];
  sampleSize: number;
  relationships?: DataRelationship[];
}

export interface MockField {
  path: string;
  type:
    | "string"
    | "number"
    | "boolean"
    | "array"
    | "object"
    | "uuid"
    | "email"
    | "phone"
    | "name"
    | "address"
    | "company"
    | "lorem"
    | "date"
    | "url"
    | "image";
  options?: {
    min?: number;
    max?: number;
    format?: string;
    enum?: any[];
    pattern?: string;
    locale?: string;
    arraySize?: [number, number];
    objectFields?: MockField[];
  };
}

export interface DataRelationship {
  from: string;
  to: string;
  type: "oneToOne" | "oneToMany" | "manyToMany";
}

export interface GeneratedDataset {
  id: string;
  name: string;
  template: DataTemplate;
  data: any[];
  generatedAt: number;
  size: number;
}

interface DataGenerationState {
  templates: DataTemplate[];
  customTemplates: DataTemplate[];
  recentDatasets: GeneratedDataset[];
  isGenerating: boolean;
  generationProgress: number;
  selectedTemplate: DataTemplate | null;
  previewData: any[] | null;
  maxDatasetSize: number;
  enableRelationships: boolean;
  outputFormat: "json" | "csv" | "sql" | "javascript" | "typescript";
}

interface DataGenerationActions {
  setSelectedTemplate: (template: DataTemplate | null) => void;
  setOutputFormat: (format: DataGenerationState["outputFormat"]) => void;
  setEnableRelationships: (enabled: boolean) => void;
  generateData: (template: DataTemplate, count: number) => Promise<GeneratedDataset>;
  generatePreview: (template: DataTemplate, count?: number) => void;
  addCustomTemplate: (template: Omit<DataTemplate, "id">) => void;
  updateTemplate: (templateId: string, updates: Partial<DataTemplate>) => void;
  deleteTemplate: (templateId: string) => void;
  saveDataset: (dataset: GeneratedDataset) => void;
  deleteDataset: (datasetId: string) => void;
  clearPreview: () => void;
  exportDataset: (dataset: GeneratedDataset, format: DataGenerationState["outputFormat"]) => string;
}

// Predefined templates
const DEFAULT_TEMPLATES: DataTemplate[] = [
  {
    id: "users",
    name: "User Profiles",
    description: "Generate realistic user profiles with personal information",
    category: "users",
    sampleSize: 50,
    schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        firstName: { type: "string" },
        lastName: { type: "string" },
        email: { type: "string" },
        age: { type: "number" },
        avatar: { type: "string" },
        address: { type: "object" },
        phone: { type: "string" },
        createdAt: { type: "string" },
      },
    },
    mockFields: [
      { path: "id", type: "uuid" },
      { path: "firstName", type: "name", options: { format: "firstName" } },
      { path: "lastName", type: "name", options: { format: "lastName" } },
      { path: "email", type: "email" },
      { path: "age", type: "number", options: { min: 18, max: 80 } },
      { path: "avatar", type: "image", options: { format: "avatar" } },
      { path: "phone", type: "phone" },
      { path: "createdAt", type: "date", options: { format: "iso" } },
      { path: "address.street", type: "address", options: { format: "street" } },
      { path: "address.city", type: "address", options: { format: "city" } },
      { path: "address.country", type: "address", options: { format: "country" } },
    ],
  },
  {
    id: "products",
    name: "E-commerce Products",
    description: "Generate product catalog data for e-commerce applications",
    category: "products",
    sampleSize: 100,
    schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        price: { type: "number" },
        category: { type: "string" },
        stock: { type: "number" },
        sku: { type: "string" },
        images: { type: "array" },
        tags: { type: "array" },
        rating: { type: "number" },
      },
    },
    mockFields: [
      { path: "id", type: "uuid" },
      { path: "name", type: "lorem", options: { format: "words", max: 3 } },
      { path: "description", type: "lorem", options: { format: "sentence" } },
      { path: "price", type: "number", options: { min: 5, max: 1000 } },
      {
        path: "category",
        type: "string",
        options: { enum: ["Electronics", "Clothing", "Books", "Home", "Sports"] },
      },
      { path: "stock", type: "number", options: { min: 0, max: 1000 } },
      { path: "sku", type: "string", options: { pattern: "PRD-[A-Z]{3}-[0-9]{4}" } },
      { path: "images", type: "array", options: { arraySize: [1, 5] } },
      { path: "tags", type: "array", options: { arraySize: [2, 8] } },
      { path: "rating", type: "number", options: { min: 1, max: 5 } },
    ],
  },
  {
    id: "api_response",
    name: "API Response",
    description: "Generate typical REST API response structures",
    category: "api",
    sampleSize: 20,
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        data: { type: "array" },
        message: { type: "string" },
        timestamp: { type: "string" },
        pagination: { type: "object" },
      },
    },
    mockFields: [
      { path: "success", type: "boolean" },
      {
        path: "message",
        type: "string",
        options: { enum: ["Success", "Data retrieved successfully", "Operation completed"] },
      },
      { path: "timestamp", type: "date", options: { format: "iso" } },
      { path: "pagination.page", type: "number", options: { min: 1, max: 10 } },
      { path: "pagination.limit", type: "number", options: { enum: [10, 20, 50, 100] } },
      { path: "pagination.total", type: "number", options: { min: 100, max: 10000 } },
      { path: "data", type: "array", options: { arraySize: [5, 20] } },
    ],
  },
];

// Mock data generators
const generateMockValue = (field: MockField): any => {
  const { type, options = {} } = field;

  switch (type) {
    case "uuid":
      return generateUUID();

    case "email":
      return generateEmail();

    case "phone":
      return generatePhone(options.locale);

    case "name":
      return generateName(options.format as "firstName" | "lastName" | "fullName");

    case "address":
      return generateAddress(options.format as "street" | "city" | "country" | "full");

    case "company":
      return generateCompany();

    case "lorem":
      return generateLorem(
        options.format as "word" | "words" | "sentence" | "paragraph",
        options.max
      );

    case "date":
      return generateDate(options.format as "iso" | "timestamp" | "date");

    case "url":
      return generateURL();

    case "image":
      return generateImageURL(options.format);

    case "number":
      return generateNumber(options.min || 0, options.max || 100);

    case "boolean":
      return Math.random() > 0.5;

    case "string":
      if (options.enum) {
        return options.enum[Math.floor(Math.random() * options.enum.length)];
      }
      if (options.pattern) {
        return generateFromPattern(options.pattern);
      }
      return generateLorem("word");

    case "array":
      const [minSize, maxSize] = options.arraySize || [1, 5];
      const arraySize = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
      return Array.from({ length: arraySize }, () => {
        if (options.objectFields) {
          return generateObjectFromFields(options.objectFields);
        }
        return generateLorem("word");
      });

    case "object":
      if (options.objectFields) {
        return generateObjectFromFields(options.objectFields);
      }
      return {};

    default:
      return null;
  }
};

// Helper functions for data generation
const generateUUID = (): string => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const generateEmail = (): string => {
  const domains = ["gmail.com", "yahoo.com", "outlook.com", "company.com", "test.org"];
  const names = ["john", "jane", "alex", "sarah", "mike", "emma", "david", "lisa"];
  const name = names[Math.floor(Math.random() * names.length)];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const number = Math.floor(Math.random() * 999);
  return `${name}${number}@${domain}`;
};

const generatePhone = (locale?: string): string => {
  const formats = {
    us: "+1-XXX-XXX-XXXX",
    uk: "+44-XX-XXXX-XXXX",
    default: "XXX-XXX-XXXX",
  };
  const format = formats[locale as keyof typeof formats] || formats.default;
  return format.replace(/X/g, () => Math.floor(Math.random() * 10).toString());
};

const generateName = (format: "firstName" | "lastName" | "fullName" = "fullName"): string => {
  const firstNames = [
    "John",
    "Jane",
    "Alex",
    "Sarah",
    "Mike",
    "Emma",
    "David",
    "Lisa",
    "Chris",
    "Anna",
  ];
  const lastNames = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Garcia",
    "Miller",
    "Davis",
    "Rodriguez",
    "Martinez",
  ];

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

  switch (format) {
    case "firstName":
      return firstName;
    case "lastName":
      return lastName;
    default:
      return `${firstName} ${lastName}`;
  }
};

const generateAddress = (format: "street" | "city" | "country" | "full" = "full"): string => {
  const streets = ["Main St", "Oak Ave", "Pine Rd", "Cedar Ln", "Elm St"];
  const cities = ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix"];
  const countries = ["USA", "Canada", "UK", "Australia", "Germany"];

  const street = `${Math.floor(Math.random() * 9999) + 1} ${streets[Math.floor(Math.random() * streets.length)]}`;
  const city = cities[Math.floor(Math.random() * cities.length)];
  const country = countries[Math.floor(Math.random() * countries.length)];

  switch (format) {
    case "street":
      return street;
    case "city":
      return city;
    case "country":
      return country;
    default:
      return `${street}, ${city}, ${country}`;
  }
};

const generateCompany = (): string => {
  const adjectives = ["Global", "Dynamic", "Smart", "Innovative", "Advanced", "Premier"];
  const nouns = ["Solutions", "Systems", "Technologies", "Corp", "Industries", "Group"];

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];

  return `${adj} ${noun}`;
};

const generateLorem = (
  format: "word" | "words" | "sentence" | "paragraph" = "word",
  count = 1
): string => {
  const words = [
    "lorem",
    "ipsum",
    "dolor",
    "sit",
    "amet",
    "consectetur",
    "adipiscing",
    "elit",
    "sed",
    "do",
    "eiusmod",
    "tempor",
    "incididunt",
    "ut",
    "labore",
    "et",
    "dolore",
    "magna",
    "aliqua",
  ];

  switch (format) {
    case "word":
      return words[Math.floor(Math.random() * words.length)];

    case "words":
      return Array.from(
        { length: count },
        () => words[Math.floor(Math.random() * words.length)]
      ).join(" ");

    case "sentence":
      const wordCount = Math.floor(Math.random() * 10) + 5;
      const sentence = Array.from(
        { length: wordCount },
        () => words[Math.floor(Math.random() * words.length)]
      ).join(" ");
      return sentence.charAt(0).toUpperCase() + sentence.slice(1) + ".";

    case "paragraph":
      const sentenceCount = Math.floor(Math.random() * 5) + 3;
      return Array.from({ length: sentenceCount }, () => generateLorem("sentence")).join(" ");

    default:
      return generateLorem("word");
  }
};

const generateDate = (format: "iso" | "timestamp" | "date" = "iso"): string | number => {
  const now = Date.now();
  const randomTime = now - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000); // Random date within last year

  switch (format) {
    case "timestamp":
      return randomTime;
    case "date":
      return new Date(randomTime).toISOString().split("T")[0];
    default:
      return new Date(randomTime).toISOString();
  }
};

const generateURL = (): string => {
  const domains = ["example.com", "test.org", "demo.net", "sample.io"];
  const paths = ["api", "data", "users", "products", "docs"];

  const domain = domains[Math.floor(Math.random() * domains.length)];
  const path = paths[Math.floor(Math.random() * paths.length)];

  return `https://${domain}/${path}`;
};

const generateImageURL = (format?: string): string => {
  if (format === "avatar") {
    const size = Math.floor(Math.random() * 200) + 100;
    return `https://i.pravatar.cc/${size}`;
  }

  const width = Math.floor(Math.random() * 400) + 200;
  const height = Math.floor(Math.random() * 400) + 200;
  return `https://picsum.photos/${width}/${height}`;
};

const generateNumber = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const generateFromPattern = (pattern: string): string => {
  return pattern.replace(/\[([^\]]+)\]/g, (match, content) => {
    if (content.includes("-")) {
      // Range like A-Z or 0-9
      const [start, end] = content.split("-");
      const startCode = start.charCodeAt(0);
      const endCode = end.charCodeAt(0);
      const randomCode = Math.floor(Math.random() * (endCode - startCode + 1)) + startCode;
      return String.fromCharCode(randomCode);
    }
    // Character set like [ABC]
    return content[Math.floor(Math.random() * content.length)];
  });
};

const generateObjectFromFields = (fields: MockField[]): any => {
  const obj: any = {};

  fields.forEach(field => {
    const keys = field.path.split(".");
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = generateMockValue(field);
  });

  return obj;
};

const useDataGeneration = create<DataGenerationState & DataGenerationActions>((set, _get) => ({
  // State
  templates: DEFAULT_TEMPLATES,
  customTemplates: [],
  recentDatasets: [],
  isGenerating: false,
  generationProgress: 0,
  selectedTemplate: null,
  previewData: null,
  maxDatasetSize: 10000,
  enableRelationships: false,
  outputFormat: "json",

  // Actions
  setSelectedTemplate: template => {
    set({ selectedTemplate: template });
  },

  setOutputFormat: format => {
    set({ outputFormat: format });
  },

  setEnableRelationships: enabled => {
    set({ enableRelationships: enabled });
  },

  generateData: async (template, count) => {
    set({ isGenerating: true, generationProgress: 0 });

    const data: any[] = [];
    const batchSize = 100;

    for (let i = 0; i < count; i += batchSize) {
      const batchCount = Math.min(batchSize, count - i);

      for (let j = 0; j < batchCount; j++) {
        data.push(generateObjectFromFields(template.mockFields));
      }

      set({ generationProgress: Math.round(((i + batchCount) / count) * 100) });

      // Allow UI to update
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const dataset: GeneratedDataset = {
      id: generateUUID(),
      name: `${template.name} - ${new Date().toLocaleDateString()}`,
      template,
      data,
      generatedAt: Date.now(),
      size: data.length,
    };

    set(state => ({
      isGenerating: false,
      generationProgress: 100,
      recentDatasets: [dataset, ...state.recentDatasets].slice(0, 10),
    }));

    return dataset;
  },

  generatePreview: (template, count = 5) => {
    const previewData = Array.from({ length: count }, () =>
      generateObjectFromFields(template.mockFields)
    );

    set({ previewData });
  },

  addCustomTemplate: templateData => {
    const template: DataTemplate = {
      ...templateData,
      id: generateUUID(),
    };

    set(state => ({
      customTemplates: [...state.customTemplates, template],
    }));
  },

  updateTemplate: (templateId, updates) => {
    set(state => ({
      customTemplates: state.customTemplates.map(t =>
        t.id === templateId ? { ...t, ...updates } : t
      ),
    }));
  },

  deleteTemplate: templateId => {
    set(state => ({
      customTemplates: state.customTemplates.filter(t => t.id !== templateId),
    }));
  },

  saveDataset: dataset => {
    set(state => ({
      recentDatasets: [dataset, ...state.recentDatasets.filter(d => d.id !== dataset.id)].slice(
        0,
        10
      ),
    }));
  },

  deleteDataset: datasetId => {
    set(state => ({
      recentDatasets: state.recentDatasets.filter(d => d.id !== datasetId),
    }));
  },

  clearPreview: () => {
    set({ previewData: null });
  },

  exportDataset: (dataset, format) => {
    switch (format) {
      case "json":
        return JSON.stringify(dataset.data, null, 2);

      case "csv":
        if (dataset.data.length === 0) return "";
        const headers = Object.keys(dataset.data[0]);
        const csvHeaders = headers.join(",");
        const csvRows = dataset.data.map(item =>
          headers.map(header => JSON.stringify(item[header] || "")).join(",")
        );
        return [csvHeaders, ...csvRows].join("\\n");

      case "sql":
        if (dataset.data.length === 0) return "";
        const tableName = dataset.template.name.toLowerCase().replace(/\\s+/g, "_");
        const columns = Object.keys(dataset.data[0]);
        const createTable = `CREATE TABLE ${tableName} (\\n  ${columns.map(col => `${col} TEXT`).join(",\\n  ")}\\n);\\n\\n`;
        const insertStatements = dataset.data.map(item => {
          const values = columns.map(
            col => `'${(item[col] || "").toString().replace(/'/g, "''")}'`
          );
          return `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${values.join(", ")});`;
        });
        return createTable + insertStatements.join("\\n");

      case "javascript":
        return `const ${dataset.template.name.toLowerCase().replace(/\\s+/g, "")}Data = ${JSON.stringify(dataset.data, null, 2)};\\n\\nexport default ${dataset.template.name.toLowerCase().replace(/\\s+/g, "")}Data;`;

      case "typescript":
        const interfaceName = dataset.template.name.replace(/\\s+/g, "");
        const sampleItem = dataset.data[0] || {};
        const interfaceFields = Object.keys(sampleItem).map(key => {
          const value = sampleItem[key];
          const type = Array.isArray(value) ? "any[]" : typeof value;
          return `  ${key}: ${type};`;
        });
        const interfaceDefinition = `interface ${interfaceName} {\\n${interfaceFields.join("\\n")}\\n}\\n\\n`;
        const dataExport = `const ${dataset.template.name.toLowerCase().replace(/\\s+/g, "")}Data: ${interfaceName}[] = ${JSON.stringify(dataset.data, null, 2)};\\n\\nexport { ${interfaceName} };\\nexport default ${dataset.template.name.toLowerCase().replace(/\\s+/g, "")}Data;`;
        return interfaceDefinition + dataExport;

      default:
        return JSON.stringify(dataset.data, null, 2);
    }
  },
}));

export default useDataGeneration;
