import type { SchemaAnalysisResult, SchemaSuggestion, JSONSchema } from "../../types/schema";

export interface ExportOptions {
  format: "json" | "csv" | "markdown" | "text";
  includeAnalysis?: boolean;
  includeSuggestions?: boolean;
  includeSchema?: boolean;
  includePatterns?: boolean;
  includePerformance?: boolean;
}

export interface ExportResult {
  content: string;
  filename: string;
  mimeType: string;
}

export class SchemaExportEngine {
  /**
   * Exports schema analysis results in various formats
   */
  public static exportAnalysis(
    analysis: SchemaAnalysisResult,
    options: ExportOptions = { format: "json" }
  ): ExportResult {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, "-");

    switch (options.format) {
      case "json":
        return this.exportAsJSON(analysis, options, timestamp);
      case "csv":
        return this.exportAsCSV(analysis, options, timestamp);
      case "markdown":
        return this.exportAsMarkdown(analysis, options, timestamp);
      case "text":
        return this.exportAsText(analysis, options, timestamp);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Exports only suggestions as a simplified format
   */
  public static exportSuggestions(
    suggestions: SchemaSuggestion[],
    format: "json" | "csv" | "markdown" = "json"
  ): ExportResult {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, "-");

    switch (format) {
      case "json":
        return {
          content: JSON.stringify(suggestions, null, 2),
          filename: `schema-suggestions-${timestamp}.json`,
          mimeType: "application/json",
        };
      case "csv":
        return this.exportSuggestionsAsCSV(suggestions, timestamp);
      case "markdown":
        return this.exportSuggestionsAsMarkdown(suggestions, timestamp);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Exports generated JSON Schema
   */
  public static exportSchema(schema: JSONSchema): ExportResult {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, "-");

    return {
      content: JSON.stringify(schema, null, 2),
      filename: `json-schema-${timestamp}.json`,
      mimeType: "application/json",
    };
  }

  /**
   * JSON Export
   */
  private static exportAsJSON(
    analysis: SchemaAnalysisResult,
    options: ExportOptions,
    timestamp: string
  ): ExportResult {
    const exportData: any = {
      exportInfo: {
        timestamp: new Date().toISOString(),
        tool: "JSON Crack Enhanced - Schema Intelligence",
        version: "1.0.0",
      },
    };

    if (options.includeAnalysis !== false) {
      exportData.structure = analysis.structure;
    }

    if (options.includeSuggestions !== false) {
      exportData.suggestions = analysis.suggestions;
    }

    if (options.includeSchema !== false) {
      exportData.generatedSchema = analysis.generatedSchema;
    }

    if (options.includePatterns !== false) {
      exportData.patterns = analysis.patterns;
    }

    if (options.includePerformance !== false) {
      exportData.performance = analysis.performance;
    }

    exportData.metadata = {
      confidence: analysis.confidence,
      timestamp: analysis.timestamp,
    };

    return {
      content: JSON.stringify(exportData, null, 2),
      filename: `schema-analysis-${timestamp}.json`,
      mimeType: "application/json",
    };
  }

  /**
   * CSV Export
   */
  private static exportAsCSV(
    analysis: SchemaAnalysisResult,
    options: ExportOptions,
    timestamp: string
  ): ExportResult {
    const rows: string[] = [];

    // Header
    rows.push("Type,Category,Title,Description,Severity,Field,Confidence,Impact");

    if (options.includeSuggestions !== false) {
      analysis.suggestions.forEach(suggestion => {
        rows.push(
          [
            "Suggestion",
            suggestion.category.replace(/_/g, " "),
            `"${suggestion.title.replace(/"/g, '""')}"`,
            `"${suggestion.description.replace(/"/g, '""')}"`,
            suggestion.severity,
            suggestion.field || "",
            suggestion.confidence.toString(),
            suggestion.impact,
          ].join(",")
        );
      });
    }

    if (options.includePatterns !== false) {
      analysis.patterns.forEach(pattern => {
        rows.push(
          [
            "Pattern",
            pattern.pattern.replace(/_/g, " "),
            `"${pattern.pattern} Pattern"`,
            `"${pattern.suggestion.replace(/"/g, '""')}"`,
            "",
            pattern.field,
            pattern.confidence.toString(),
            "",
          ].join(",")
        );
      });
    }

    return {
      content: rows.join("\n"),
      filename: `schema-analysis-${timestamp}.csv`,
      mimeType: "text/csv",
    };
  }

  /**
   * Markdown Export
   */
  private static exportAsMarkdown(
    analysis: SchemaAnalysisResult,
    options: ExportOptions,
    timestamp: string
  ): ExportResult {
    const lines: string[] = [];

    lines.push("# Schema Intelligence Analysis Report");
    lines.push("");
    lines.push(`**Generated**: ${new Date().toLocaleString()}`);
    lines.push("**Tool**: JSON Crack Enhanced - Schema Intelligence");
    lines.push(`**Confidence**: ${Math.round(analysis.confidence * 100)}%`);
    lines.push("");

    // Structure Analysis
    if (options.includeAnalysis !== false) {
      lines.push("## Structure Analysis");
      lines.push("");
      lines.push(`- **Total Nodes**: ${analysis.structure.totalNodes.toLocaleString()}`);
      lines.push(`- **Max Depth**: ${analysis.structure.maxDepth}`);
      lines.push(`- **Field Types**: ${Object.keys(analysis.structure.fieldTypes).length}`);
      lines.push(`- **Inconsistent Types**: ${analysis.structure.inconsistentTypes.length}`);
      lines.push(`- **Duplicate Keys**: ${analysis.structure.duplicateKeys.length}`);
      lines.push("");
    }

    // Suggestions
    if (options.includeSuggestions !== false && analysis.suggestions.length > 0) {
      lines.push("## Suggestions");
      lines.push("");

      const severityGroups = this.groupBySeverity(analysis.suggestions);

      Object.entries(severityGroups).forEach(([severity, suggestions]) => {
        if (suggestions.length > 0) {
          lines.push(`### ${severity.charAt(0).toUpperCase() + severity.slice(1)} Priority`);
          lines.push("");

          suggestions.forEach((suggestion, index) => {
            lines.push(`${index + 1}. **${suggestion.title}**`);
            lines.push(`   - *Category*: ${suggestion.category.replace(/_/g, " ")}`);
            lines.push(`   - *Description*: ${suggestion.description}`);
            if (suggestion.field) {
              lines.push(`   - *Field*: \`${suggestion.field}\``);
            }
            lines.push(`   - *Confidence*: ${Math.round(suggestion.confidence * 100)}%`);
            lines.push(`   - *Impact*: ${suggestion.impact}`);
            lines.push("");
          });
        }
      });
    }

    // Patterns
    if (options.includePatterns !== false && analysis.patterns.length > 0) {
      lines.push("## Detected Patterns");
      lines.push("");

      analysis.patterns.forEach((pattern, index) => {
        lines.push(`${index + 1}. **${pattern.pattern.replace(/_/g, " ").toUpperCase()}**`);
        lines.push(`   - *Field*: \`${pattern.field}\``);
        lines.push(`   - *Confidence*: ${Math.round(pattern.confidence * 100)}%`);
        lines.push(`   - *Suggestion*: ${pattern.suggestion}`);
        if (pattern.validationRule) {
          lines.push(`   - *Validation*: \`${pattern.validationRule}\``);
        }
        lines.push("");
      });
    }

    // Performance Analysis
    if (options.includePerformance !== false) {
      lines.push("## Performance Analysis");
      lines.push("");
      lines.push(`- **Memory Estimate**: ${this.formatBytes(analysis.performance.memoryEstimate)}`);
      lines.push(`- **Large Arrays**: ${analysis.performance.largeArrays.length}`);
      lines.push(`- **Deep Nesting Issues**: ${analysis.performance.deepNesting.length}`);
      lines.push(`- **Duplicate Data**: ${analysis.performance.duplicateData.length}`);
      lines.push("");

      if (analysis.performance.optimizationOpportunities.length > 0) {
        lines.push("### Optimization Opportunities");
        lines.push("");
        analysis.performance.optimizationOpportunities.forEach((opt, index) => {
          lines.push(`${index + 1}. **${opt.description}**`);
          lines.push(`   - *Impact*: ${opt.impact}`);
          lines.push(`   - *Implementation*: ${opt.implementation}`);
          lines.push("");
        });
      }
    }

    // Generated Schema
    if (options.includeSchema !== false) {
      lines.push("## Generated JSON Schema");
      lines.push("");
      lines.push("```json");
      lines.push(JSON.stringify(analysis.generatedSchema, null, 2));
      lines.push("```");
      lines.push("");
    }

    return {
      content: lines.join("\n"),
      filename: `schema-analysis-${timestamp}.md`,
      mimeType: "text/markdown",
    };
  }

  /**
   * Text Export
   */
  private static exportAsText(
    analysis: SchemaAnalysisResult,
    options: ExportOptions,
    timestamp: string
  ): ExportResult {
    const lines: string[] = [];

    lines.push("SCHEMA INTELLIGENCE ANALYSIS REPORT");
    lines.push("=====================================");
    lines.push("");
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push("Tool: JSON Crack Enhanced - Schema Intelligence");
    lines.push(`Confidence: ${Math.round(analysis.confidence * 100)}%`);
    lines.push("");

    if (options.includeSuggestions !== false && analysis.suggestions.length > 0) {
      lines.push("SUGGESTIONS:");
      lines.push("-----------");
      analysis.suggestions.forEach((suggestion, index) => {
        lines.push(`${index + 1}. [${suggestion.severity.toUpperCase()}] ${suggestion.title}`);
        lines.push(`   Category: ${suggestion.category.replace(/_/g, " ")}`);
        lines.push(`   Description: ${suggestion.description}`);
        if (suggestion.field) {
          lines.push(`   Field: ${suggestion.field}`);
        }
        lines.push(`   Confidence: ${Math.round(suggestion.confidence * 100)}%`);
        lines.push("");
      });
    }

    if (options.includePatterns !== false && analysis.patterns.length > 0) {
      lines.push("DETECTED PATTERNS:");
      lines.push("------------------");
      analysis.patterns.forEach((pattern, index) => {
        lines.push(`${index + 1}. ${pattern.pattern.replace(/_/g, " ").toUpperCase()}`);
        lines.push(`   Field: ${pattern.field}`);
        lines.push(`   Confidence: ${Math.round(pattern.confidence * 100)}%`);
        lines.push(`   Suggestion: ${pattern.suggestion}`);
        lines.push("");
      });
    }

    return {
      content: lines.join("\n"),
      filename: `schema-analysis-${timestamp}.txt`,
      mimeType: "text/plain",
    };
  }

  /**
   * Helper Methods
   */
  private static exportSuggestionsAsCSV(
    suggestions: SchemaSuggestion[],
    timestamp: string
  ): ExportResult {
    const rows: string[] = [];
    rows.push("ID,Category,Severity,Title,Description,Field,Confidence,Impact,Action");

    suggestions.forEach(suggestion => {
      rows.push(
        [
          suggestion.id,
          suggestion.category.replace(/_/g, " "),
          suggestion.severity,
          `"${suggestion.title.replace(/"/g, '""')}"`,
          `"${suggestion.description.replace(/"/g, '""')}"`,
          suggestion.field || "",
          suggestion.confidence.toString(),
          suggestion.impact,
          suggestion.action.replace(/_/g, " "),
        ].join(",")
      );
    });

    return {
      content: rows.join("\n"),
      filename: `schema-suggestions-${timestamp}.csv`,
      mimeType: "text/csv",
    };
  }

  private static exportSuggestionsAsMarkdown(
    suggestions: SchemaSuggestion[],
    timestamp: string
  ): ExportResult {
    const lines: string[] = [];

    lines.push("# Schema Suggestions Report");
    lines.push("");
    lines.push(`**Generated**: ${new Date().toLocaleString()}`);
    lines.push(`**Total Suggestions**: ${suggestions.length}`);
    lines.push("");

    const severityGroups = this.groupBySeverity(suggestions);

    Object.entries(severityGroups).forEach(([severity, suggestionList]) => {
      if (suggestionList.length > 0) {
        lines.push(
          `## ${severity.charAt(0).toUpperCase() + severity.slice(1)} Priority (${suggestionList.length})`
        );
        lines.push("");

        suggestionList.forEach((suggestion, index) => {
          lines.push(`### ${index + 1}. ${suggestion.title}`);
          lines.push("");
          lines.push(`**Category**: ${suggestion.category.replace(/_/g, " ")}`);
          lines.push(`**Description**: ${suggestion.description}`);
          if (suggestion.field) {
            lines.push(`**Field**: \`${suggestion.field}\``);
          }
          lines.push(`**Confidence**: ${Math.round(suggestion.confidence * 100)}%`);
          lines.push(`**Impact**: ${suggestion.impact}`);
          lines.push(`**Recommended Action**: ${suggestion.action.replace(/_/g, " ")}`);
          lines.push("");
        });
      }
    });

    return {
      content: lines.join("\n"),
      filename: `schema-suggestions-${timestamp}.md`,
      mimeType: "text/markdown",
    };
  }

  private static groupBySeverity(
    suggestions: SchemaSuggestion[]
  ): Record<string, SchemaSuggestion[]> {
    return suggestions.reduce(
      (groups, suggestion) => {
        const severity = suggestion.severity.toLowerCase();
        if (!groups[severity]) {
          groups[severity] = [];
        }
        groups[severity].push(suggestion);
        return groups;
      },
      {} as Record<string, SchemaSuggestion[]>
    );
  }

  private static formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Downloads the export result as a file
   */
  public static downloadExport(exportResult: ExportResult): void {
    const blob = new Blob([exportResult.content], { type: exportResult.mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = exportResult.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }
}
