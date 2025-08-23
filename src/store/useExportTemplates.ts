import { create } from "zustand";

export interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  category: "document" | "code" | "data" | "visualization" | "custom";
  format: "json" | "xml" | "yaml" | "csv" | "html" | "markdown" | "pdf" | "docx" | "excel" | "sql" | "typescript" | "javascript" | "python" | "graphql" | "swagger" | "postman" | "custom";
  template: string; // Template string with placeholders
  transformations: DataTransformation[];
  styling?: ExportStyling;
  metadata?: ExportMetadata;
}

export interface DataTransformation {
  id: string;
  name: string;
  type: "filter" | "map" | "sort" | "group" | "aggregate" | "flatten" | "nest" | "custom";
  config: any;
  order: number;
  enabled: boolean;
}

export interface ExportStyling {
  theme: "light" | "dark" | "custom";
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    border: string;
  };
  fonts: {
    heading: string;
    body: string;
    code: string;
  };
  layout: {
    pageSize: "A4" | "A3" | "Letter" | "Legal";
    orientation: "portrait" | "landscape";
    margins: [number, number, number, number]; // top, right, bottom, left
  };
}

export interface ExportMetadata {
  title: string;
  author: string;
  description: string;
  keywords: string[];
  createdAt: string;
  version: string;
  includeStats: boolean;
  includeSchema: boolean;
}

export interface ExportResult {
  id: string;
  templateId: string;
  templateName: string;
  content: string;
  format: string;
  size: number;
  generatedAt: number;
  metadata: ExportMetadata;
}

interface ExportTemplateState {
  templates: ExportTemplate[];
  customTemplates: ExportTemplate[];
  recentExports: ExportResult[];
  selectedTemplate: ExportTemplate | null;
  isExporting: boolean;
  exportProgress: number;
  previewContent: string | null;
  transformationResults: any;
  enablePreview: boolean;
  autoSaveTemplates: boolean;
}

interface ExportTemplateActions {
  setSelectedTemplate: (template: ExportTemplate | null) => void;
  setEnablePreview: (enabled: boolean) => void;
  addCustomTemplate: (template: Omit<ExportTemplate, "id">) => void;
  updateTemplate: (templateId: string, updates: Partial<ExportTemplate>) => void;
  deleteTemplate: (templateId: string) => void;
  duplicateTemplate: (templateId: string) => void;
  exportData: (jsonData: any, template: ExportTemplate, metadata?: Partial<ExportMetadata>) => Promise<ExportResult>;
  generatePreview: (jsonData: any, template: ExportTemplate) => void;
  clearPreview: () => void;
  saveExportResult: (result: ExportResult) => void;
  deleteExportResult: (resultId: string) => void;
  applyTransformations: (data: any, transformations: DataTransformation[]) => any;
  validateTemplate: (template: ExportTemplate) => { isValid: boolean; errors: string[] };
  importTemplate: (templateData: string) => boolean;
  exportTemplate: (templateId: string) => string;
}

// Predefined export templates
const DEFAULT_TEMPLATES: ExportTemplate[] = [
  {
    id: "json_formatted",
    name: "Formatted JSON",
    description: "Clean, formatted JSON with proper indentation",
    category: "data",
    format: "json",
    template: "{{JSON.stringify(data, null, 2)}}",
    transformations: [],
  },
  {
    id: "markdown_report",
    name: "Markdown Report",
    description: "Generate a markdown report with data analysis",
    category: "document",
    format: "markdown",
    template: `# {{metadata.title || 'Data Report'}}

## Overview
- **Generated**: {{new Date().toLocaleDateString()}}
- **Records**: {{data.length || 'N/A'}}
- **Size**: {{(JSON.stringify(data).length / 1024).toFixed(2)}} KB

## Data Summary
\`\`\`json
{{JSON.stringify(getDataSummary(data), null, 2)}}
\`\`\`

## Sample Data
\`\`\`json
{{JSON.stringify(data.slice(0, 3), null, 2)}}
\`\`\``,
    transformations: [],
    metadata: {
      title: "JSON Data Report",
      author: "JSON Crack",
      description: "Automated data report",
      keywords: ["data", "json", "report"],
      createdAt: new Date().toISOString(),
      version: "1.0",
      includeStats: true,
      includeSchema: false,
    },
  },
  {
    id: "typescript_interface",
    name: "TypeScript Interface",
    description: "Generate TypeScript interfaces from JSON structure",
    category: "code",
    format: "typescript",
    template: `{{generateTypeScriptInterface(data, metadata.title || 'DataInterface')}}`,
    transformations: [],
  },
  {
    id: "html_table",
    name: "HTML Table",
    description: "Convert JSON array to HTML table",
    category: "visualization",
    format: "html",
    template: `<!DOCTYPE html>
<html>
<head>
    <title>{{metadata.title || 'Data Table'}}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .stats { background: #f9f9f9; padding: 10px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <h1>{{metadata.title || 'Data Table'}}</h1>
    <div class="stats">
        <strong>Records:</strong> {{Array.isArray(data) ? data.length : 1}} | 
        <strong>Generated:</strong> {{new Date().toLocaleString()}}
    </div>
    {{generateHTMLTable(data)}}
</body>
</html>`,
    transformations: [],
  },
  {
    id: "csv_export",
    name: "CSV Export",
    description: "Convert JSON to CSV format",
    category: "data",
    format: "csv",
    template: "{{generateCSV(data)}}",
    transformations: [],
  },
  {
    id: "sql_insert",
    name: "SQL Insert Statements",
    description: "Generate SQL INSERT statements from JSON data",
    category: "data",
    format: "sql",
    template: `-- {{metadata.title || 'Data Export'}}
-- Generated on {{new Date().toLocaleString()}}

{{generateSQLInserts(data, metadata.tableName || 'data_table')}}`,
    transformations: [],
  },
  {
    id: "swagger_spec",
    name: "Swagger/OpenAPI Spec",
    description: "Generate OpenAPI specification from JSON structure",
    category: "code",
    format: "yaml",
    template: `openapi: 3.0.0
info:
  title: {{metadata.title || 'Generated API'}}
  description: {{metadata.description || 'API specification generated from JSON data'}}
  version: {{metadata.version || '1.0.0'}}
  
{{generateSwaggerSpec(data)}}`,
    transformations: [],
  },
];

// Template processing functions
const processTemplate = (template: string, data: any, metadata: ExportMetadata): string => {
  let processed = template;

  // Replace simple placeholders
  processed = processed.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
    try {
      // Create a safe evaluation context
      const context = {
        data,
        metadata,
        JSON,
        Date,
        Array,
        Object,
        Math,
        // Helper functions
        generateTypeScriptInterface,
        generateHTMLTable,
        generateCSV,
        generateSQLInserts,
        generateSwaggerSpec,
        getDataSummary,
        formatBytes,
        getObjectPaths,
      };
      
      // Evaluate the expression in the context
      const func = new Function(...Object.keys(context), `return ${expression}`);
      return func(...Object.values(context));
    } catch (error) {
      console.warn(`Template expression error: ${expression}`, error);
      return match; // Return original if evaluation fails
    }
  });

  return processed;
};

// Helper functions for template processing
const generateTypeScriptInterface = (data: any, interfaceName: string): string => {
  const generateInterface = (obj: any, name: string, level = 0): string => {
    if (Array.isArray(obj)) {
      if (obj.length > 0) {
        return generateInterface(obj[0], name, level) + "[]";
      }
      return "any[]";
    }

    if (typeof obj !== "object" || obj === null) {
      return typeof obj;
    }

    const indent = "  ".repeat(level);
    const properties = Object.keys(obj).map(key => {
      const value = obj[key];
      const type = Array.isArray(value) 
        ? generateInterface(value, `${name}${key.charAt(0).toUpperCase() + key.slice(1)}`, level + 1)
        : typeof value === "object" && value !== null
        ? generateInterface(value, `${name}${key.charAt(0).toUpperCase() + key.slice(1)}`, level + 1)
        : typeof value;
      
      return `${indent}  ${key}: ${type};`;
    });

    return level === 0 
      ? `interface ${name} {\n${properties.join("\n")}\n}`
      : `{\n${properties.join("\n")}\n${indent}}`;
  };

  return generateInterface(data, interfaceName);
};

const generateHTMLTable = (data: any): string => {
  if (!Array.isArray(data) || data.length === 0) {
    return "<p>No tabular data available</p>";
  }

  const headers = Object.keys(data[0]);
  const headerRow = `<tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>`;
  const dataRows = data.map(row => 
    `<tr>${headers.map(h => `<td>${JSON.stringify(row[h] || "")}</td>`).join("")}</tr>`
  ).join("");

  return `<table>${headerRow}${dataRows}</table>`;
};

const generateCSV = (data: any): string => {
  if (!Array.isArray(data) || data.length === 0) {
    return "";
  }

  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(",");
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header] || "";
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(",")
  );

  return [csvHeaders, ...csvRows].join("\n");
};

const generateSQLInserts = (data: any, tableName: string): string => {
  if (!Array.isArray(data) || data.length === 0) {
    return `-- No data to insert into ${tableName}`;
  }

  const columns = Object.keys(data[0]);
  const columnsList = columns.join(", ");
  
  const inserts = data.map(row => {
    const values = columns.map(col => {
      const value = row[col];
      if (value === null || value === undefined) return "NULL";
      if (typeof value === "string") return `'${value.replace(/'/g, "''")}'`;
      if (typeof value === "number" || typeof value === "boolean") return String(value);
      return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
    });
    
    return `INSERT INTO ${tableName} (${columnsList}) VALUES (${values.join(", ")});`;
  });

  return inserts.join("\n");
};

const generateSwaggerSpec = (data: any): string => {
  // Basic swagger spec generation
  const generateSchema = (obj: any): any => {
    if (Array.isArray(obj)) {
      return {
        type: "array",
        items: obj.length > 0 ? generateSchema(obj[0]) : { type: "object" }
      };
    }

    if (typeof obj === "object" && obj !== null) {
      const properties: any = {};
      Object.keys(obj).forEach(key => {
        properties[key] = generateSchema(obj[key]);
      });
      return {
        type: "object",
        properties
      };
    }

    return { type: typeof obj };
  };

  const schema = generateSchema(data);
  
  return `paths:
  /data:
    get:
      summary: Get data
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                ${JSON.stringify(schema, null, 16).replace(/\n/g, "\n                ")}`;
};

const getDataSummary = (data: any): any => {
  return {
    type: Array.isArray(data) ? "array" : typeof data,
    length: Array.isArray(data) ? data.length : undefined,
    keys: typeof data === "object" && data !== null ? Object.keys(data).length : undefined,
    size: JSON.stringify(data).length,
  };
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

const getObjectPaths = (obj: any, prefix = ""): string[] => {
  const paths: string[] = [];
  
  if (typeof obj === "object" && obj !== null) {
    Object.keys(obj).forEach(key => {
      const path = prefix ? `${prefix}.${key}` : key;
      paths.push(path);
      
      if (typeof obj[key] === "object" && obj[key] !== null) {
        paths.push(...getObjectPaths(obj[key], path));
      }
    });
  }
  
  return paths;
};

const useExportTemplates = create<ExportTemplateState & ExportTemplateActions>((set, get) => ({
  // State
  templates: DEFAULT_TEMPLATES,
  customTemplates: [],
  recentExports: [],
  selectedTemplate: null,
  isExporting: false,
  exportProgress: 0,
  previewContent: null,
  transformationResults: null,
  enablePreview: true,
  autoSaveTemplates: true,

  // Actions
  setSelectedTemplate: (template) => {
    set({ selectedTemplate: template });
  },

  setEnablePreview: (enabled) => {
    set({ enablePreview: enabled });
  },

  addCustomTemplate: (templateData) => {
    const template: ExportTemplate = {
      ...templateData,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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

  deleteTemplate: (templateId) => {
    set(state => ({
      customTemplates: state.customTemplates.filter(t => t.id !== templateId),
      selectedTemplate: state.selectedTemplate?.id === templateId ? null : state.selectedTemplate,
    }));
  },

  duplicateTemplate: (templateId) => {
    const { templates, customTemplates } = get();
    const allTemplates = [...templates, ...customTemplates];
    const template = allTemplates.find(t => t.id === templateId);
    
    if (template) {
      const duplicated: ExportTemplate = {
        ...template,
        id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: `${template.name} (Copy)`,
      };
      
      set(state => ({
        customTemplates: [...state.customTemplates, duplicated],
      }));
    }
  },

  exportData: async (jsonData, template, metadata = {}) => {
    set({ isExporting: true, exportProgress: 0 });
    
    try {
      // Apply transformations
      let transformedData = jsonData;
      if (template.transformations.length > 0) {
        transformedData = get().applyTransformations(jsonData, template.transformations);
        set({ exportProgress: 30 });
      }
      
      // Prepare metadata
      const finalMetadata: ExportMetadata = {
        title: `Export - ${new Date().toLocaleDateString()}`,
        author: "JSON Crack User",
        description: template.description,
        keywords: [template.category, template.format],
        createdAt: new Date().toISOString(),
        version: "1.0",
        includeStats: false,
        includeSchema: false,
        ...metadata,
      };
      
      set({ exportProgress: 50 });
      
      // Process template
      const content = processTemplate(template.template, transformedData, finalMetadata);
      set({ exportProgress: 80 });
      
      const result: ExportResult = {
        id: `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        templateId: template.id,
        templateName: template.name,
        content,
        format: template.format,
        size: content.length,
        generatedAt: Date.now(),
        metadata: finalMetadata,
      };
      
      set({ exportProgress: 100 });
      get().saveExportResult(result);
      
      setTimeout(() => {
        set({ isExporting: false, exportProgress: 0 });
      }, 500);
      
      return result;
    } catch (error) {
      set({ isExporting: false, exportProgress: 0 });
      throw error;
    }
  },

  generatePreview: (jsonData, template) => {
    try {
      // Apply transformations for preview
      let transformedData = jsonData;
      if (template.transformations.length > 0) {
        transformedData = get().applyTransformations(jsonData, template.transformations);
      }
      
      const previewMetadata: ExportMetadata = {
        title: "Preview",
        author: "JSON Crack",
        description: template.description,
        keywords: [],
        createdAt: new Date().toISOString(),
        version: "1.0",
        includeStats: false,
        includeSchema: false,
      };
      
      // Limit data for preview to avoid performance issues
      const limitedData = Array.isArray(transformedData) 
        ? transformedData.slice(0, 10) 
        : transformedData;
      
      const content = processTemplate(template.template, limitedData, previewMetadata);
      
      // Truncate if too long
      const truncatedContent = content.length > 5000 
        ? content.substring(0, 5000) + "\n\n... (preview truncated)"
        : content;
      
      set({ previewContent: truncatedContent });
    } catch (error) {
      set({ previewContent: `Preview error: ${error instanceof Error ? error.message : String(error)}` });
    }
  },

  clearPreview: () => {
    set({ previewContent: null });
  },

  saveExportResult: (result) => {
    set(state => ({
      recentExports: [result, ...state.recentExports].slice(0, 20), // Keep last 20
    }));
  },

  deleteExportResult: (resultId) => {
    set(state => ({
      recentExports: state.recentExports.filter(r => r.id !== resultId),
    }));
  },

  applyTransformations: (data, transformations) => {
    let result = data;
    
    const enabledTransformations = transformations
      .filter(t => t.enabled)
      .sort((a, b) => a.order - b.order);
    
    enabledTransformations.forEach(transformation => {
      switch (transformation.type) {
        case "filter":
          if (Array.isArray(result)) {
            result = result.filter(item => {
              // Simple filter implementation
              return true; // Placeholder
            });
          }
          break;
        
        case "map":
          if (Array.isArray(result)) {
            result = result.map(item => {
              // Simple map implementation
              return item; // Placeholder
            });
          }
          break;
        
        case "sort":
          if (Array.isArray(result)) {
            result = [...result].sort((a, b) => {
              // Simple sort implementation
              return 0; // Placeholder
            });
          }
          break;
        
        case "flatten":
          if (Array.isArray(result)) {
            result = result.flat(transformation.config.depth || 1);
          }
          break;
        
        default:
          // Custom transformation would go here
          break;
      }
    });
    
    return result;
  },

  validateTemplate: (template) => {
    const errors: string[] = [];
    
    if (!template.name?.trim()) {
      errors.push("Template name is required");
    }
    
    if (!template.template?.trim()) {
      errors.push("Template content is required");
    }
    
    if (!template.format) {
      errors.push("Template format is required");
    }
    
    // Additional validation logic...
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  importTemplate: (templateData) => {
    try {
      const template = JSON.parse(templateData);
      
      // Validate imported template
      const validation = get().validateTemplate(template);
      if (!validation.isValid) {
        return false;
      }
      
      get().addCustomTemplate(template);
      return true;
    } catch (error) {
      return false;
    }
  },

  exportTemplate: (templateId) => {
    const { templates, customTemplates } = get();
    const allTemplates = [...templates, ...customTemplates];
    const template = allTemplates.find(t => t.id === templateId);
    
    if (template) {
      return JSON.stringify(template, null, 2);
    }
    
    return "";
  },
}));

export default useExportTemplates;