import type {
  SchemaSuggestion,
  StructureAnalysis,
  PatternAnalysis,
  PerformanceAnalysis,
} from "../../types/schema";
import {
  SuggestionCategory,
  SuggestionSeverity,
  SuggestionAction,
  ImpactLevel,
  PatternType,
  OptimizationType,
} from "../../types/schema";

export class SuggestionGenerationEngine {
  private suggestionId = 0;

  /**
   * Generates comprehensive suggestions based on analysis results
   */
  public generateSuggestions(
    structure: StructureAnalysis,
    patterns: PatternAnalysis[],
    performance: PerformanceAnalysis
  ): SchemaSuggestion[] {
    const suggestions: SchemaSuggestion[] = [];

    // Generate structure-based suggestions
    suggestions.push(...this.generateStructureSuggestions(structure));

    // Generate pattern-based suggestions
    suggestions.push(...this.generatePatternSuggestions(patterns));

    // Generate performance-based suggestions
    suggestions.push(...this.generatePerformanceSuggestions(performance));

    // Sort by severity and confidence
    return suggestions.sort((a, b) => {
      const severityOrder = {
        [SuggestionSeverity.CRITICAL]: 5,
        [SuggestionSeverity.HIGH]: 4,
        [SuggestionSeverity.MEDIUM]: 3,
        [SuggestionSeverity.LOW]: 2,
        [SuggestionSeverity.INFO]: 1,
      };

      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;

      return b.confidence - a.confidence;
    });
  }

  /**
   * Generates suggestions based on structure analysis
   */
  private generateStructureSuggestions(structure: StructureAnalysis): SchemaSuggestion[] {
    const suggestions: SchemaSuggestion[] = [];

    // Type inconsistency suggestions
    structure.inconsistentTypes.forEach(inconsistency => {
      const dominantType = this.findDominantType(inconsistency.occurrences);

      suggestions.push({
        id: `type-consistency-${this.suggestionId++}`,
        category: SuggestionCategory.TYPE_SAFETY,
        severity: SuggestionSeverity.HIGH,
        title: "Inconsistent Field Types",
        description: `Field "${inconsistency.field}" has inconsistent types: ${inconsistency.types.join(", ")}. Consider standardizing to ${dominantType}.`,
        field: inconsistency.field,
        currentValue: inconsistency.types,
        suggestedValue: dominantType,
        action: SuggestionAction.REVIEW,
        confidence: 0.85,
        impact: ImpactLevel.HIGH,
      });
    });

    // Duplicate keys suggestions
    if (structure.duplicateKeys.length > 0) {
      suggestions.push({
        id: `duplicate-keys-${this.suggestionId++}`,
        category: SuggestionCategory.STRUCTURE,
        severity: SuggestionSeverity.MEDIUM,
        title: "Duplicate Object Keys",
        description: `Found duplicate keys: ${structure.duplicateKeys.join(", ")}. This can cause data loss in some systems.`,
        currentValue: structure.duplicateKeys,
        action: SuggestionAction.REVIEW,
        confidence: 0.95,
        impact: ImpactLevel.MEDIUM,
      });
    }

    // Deep nesting suggestions
    if (structure.maxDepth > 8) {
      const severity =
        structure.maxDepth > 12 ? SuggestionSeverity.HIGH : SuggestionSeverity.MEDIUM;

      suggestions.push({
        id: `deep-nesting-${this.suggestionId++}`,
        category: SuggestionCategory.STRUCTURE,
        severity,
        title: "Deep Object Nesting",
        description: `Maximum nesting depth is ${structure.maxDepth} levels. Consider flattening the structure for better readability and performance.`,
        currentValue: structure.maxDepth,
        suggestedValue: "< 8 levels",
        action: SuggestionAction.REVIEW,
        confidence: 0.8,
        impact: structure.maxDepth > 12 ? ImpactLevel.HIGH : ImpactLevel.MEDIUM,
      });
    }

    // Missing fields suggestions
    if (structure.missingFields.length > 0) {
      suggestions.push({
        id: `missing-fields-${this.suggestionId++}`,
        category: SuggestionCategory.VALIDATION,
        severity: SuggestionSeverity.LOW,
        title: "Optional Field Validation",
        description: `Consider making these fields optional or providing default values: ${structure.missingFields.join(", ")}.`,
        currentValue: structure.missingFields,
        action: SuggestionAction.REVIEW,
        confidence: 0.6,
        impact: ImpactLevel.LOW,
      });
    }

    // Large object suggestions
    if (structure.totalNodes > 10000) {
      suggestions.push({
        id: `large-object-${this.suggestionId++}`,
        category: SuggestionCategory.PERFORMANCE,
        severity: SuggestionSeverity.MEDIUM,
        title: "Large Data Structure",
        description: `Object contains ${structure.totalNodes.toLocaleString()} nodes. Consider pagination or data chunking for better performance.`,
        currentValue: structure.totalNodes,
        action: SuggestionAction.REVIEW,
        confidence: 0.8,
        impact: ImpactLevel.MEDIUM,
      });
    }

    return suggestions;
  }

  /**
   * Generates suggestions based on pattern analysis
   */
  private generatePatternSuggestions(patterns: PatternAnalysis[]): SchemaSuggestion[] {
    const suggestions: SchemaSuggestion[] = [];

    patterns.forEach(pattern => {
      const severity = this.getPatternSuggestionSeverity(pattern);
      const impact = pattern.confidence > 0.8 ? ImpactLevel.MEDIUM : ImpactLevel.LOW;

      // Validation suggestion
      suggestions.push({
        id: `pattern-validation-${this.suggestionId++}`,
        category: SuggestionCategory.VALIDATION,
        severity,
        title: `Add ${this.formatPatternName(pattern.pattern)} Validation`,
        description: `Field "${pattern.field}" contains ${pattern.pattern} patterns with ${Math.round(pattern.confidence * 100)}% confidence. ${pattern.suggestion}`,
        field: pattern.field,
        currentValue: pattern.examples[0],
        suggestedValue: pattern.validationRule,
        action: SuggestionAction.APPLY,
        confidence: pattern.confidence,
        impact,
      });

      // Security suggestions for sensitive patterns
      if (this.isSensitivePattern(pattern.pattern)) {
        suggestions.push({
          id: `security-${pattern.pattern}-${this.suggestionId++}`,
          category: SuggestionCategory.SECURITY,
          severity: SuggestionSeverity.HIGH,
          title: `Secure ${this.formatPatternName(pattern.pattern)} Data`,
          description: `Field "${pattern.field}" contains ${pattern.pattern} data. Ensure proper encryption and access controls are in place.`,
          field: pattern.field,
          action: SuggestionAction.REVIEW,
          confidence: 0.9,
          impact: ImpactLevel.HIGH,
        });
      }

      // Enum optimization suggestions
      if (pattern.pattern === PatternType.ENUM && pattern.examples.length <= 10) {
        suggestions.push({
          id: `enum-optimization-${this.suggestionId++}`,
          category: SuggestionCategory.PERFORMANCE,
          severity: SuggestionSeverity.LOW,
          title: "Optimize Enum Storage",
          description: `Field "${pattern.field}" has a limited set of values (${pattern.examples.length}). Consider using numeric IDs with a lookup table for better performance.`,
          field: pattern.field,
          currentValue: pattern.examples,
          action: SuggestionAction.LEARN_MORE,
          confidence: 0.7,
          impact: ImpactLevel.LOW,
        });
      }
    });

    return suggestions;
  }

  /**
   * Generates suggestions based on performance analysis
   */
  private generatePerformanceSuggestions(performance: PerformanceAnalysis): SchemaSuggestion[] {
    const suggestions: SchemaSuggestion[] = [];

    // Memory usage suggestions
    if (performance.memoryEstimate > 10 * 1024 * 1024) {
      // 10MB
      const severity =
        performance.memoryEstimate > 50 * 1024 * 1024
          ? SuggestionSeverity.CRITICAL
          : SuggestionSeverity.HIGH;

      suggestions.push({
        id: `memory-usage-${this.suggestionId++}`,
        category: SuggestionCategory.PERFORMANCE,
        severity,
        title: "High Memory Usage",
        description: `Data structure uses approximately ${this.formatBytes(performance.memoryEstimate)}. Consider optimizing for memory efficiency.`,
        currentValue: performance.memoryEstimate,
        action: SuggestionAction.REVIEW,
        confidence: 0.8,
        impact: ImpactLevel.HIGH,
      });
    }

    // Large array suggestions
    performance.largeArrays.forEach(largeArray => {
      const severity =
        largeArray.size > 10000 ? SuggestionSeverity.HIGH : SuggestionSeverity.MEDIUM;

      suggestions.push({
        id: `large-array-${this.suggestionId++}`,
        category: SuggestionCategory.PERFORMANCE,
        severity,
        title: "Large Array Optimization",
        description: largeArray.suggestion,
        field: largeArray.path,
        currentValue: `${largeArray.size.toLocaleString()} items`,
        action: SuggestionAction.REVIEW,
        confidence: 0.9,
        impact: largeArray.size > 10000 ? ImpactLevel.HIGH : ImpactLevel.MEDIUM,
      });
    });

    // Deep nesting suggestions
    performance.deepNesting.forEach(nesting => {
      suggestions.push({
        id: `deep-nesting-perf-${this.suggestionId++}`,
        category: SuggestionCategory.PERFORMANCE,
        severity: SuggestionSeverity.MEDIUM,
        title: "Performance Impact from Deep Nesting",
        description: nesting.suggestion,
        field: nesting.path,
        currentValue: `${nesting.depth} levels deep`,
        action: SuggestionAction.REVIEW,
        confidence: 0.75,
        impact: ImpactLevel.MEDIUM,
      });
    });

    // Duplicate data suggestions
    performance.duplicateData.forEach(duplicate => {
      suggestions.push({
        id: `duplicate-data-${this.suggestionId++}`,
        category: SuggestionCategory.PERFORMANCE,
        severity: SuggestionSeverity.HIGH,
        title: "Eliminate Duplicate Data",
        description: duplicate.suggestion,
        currentValue: `${duplicate.occurrences} duplicates, ${this.formatBytes(duplicate.memoryWaste)} wasted`,
        action: SuggestionAction.APPLY,
        confidence: 0.95,
        impact: ImpactLevel.HIGH,
      });
    });

    // Optimization opportunities
    performance.optimizationOpportunities.forEach(opportunity => {
      const severity = this.getOptimizationSeverity(opportunity.type);

      suggestions.push({
        id: `optimization-${opportunity.type}-${this.suggestionId++}`,
        category: SuggestionCategory.PERFORMANCE,
        severity,
        title: `${this.formatOptimizationType(opportunity.type)} Optimization`,
        description: opportunity.description,
        action: SuggestionAction.LEARN_MORE,
        confidence: 0.8,
        impact: opportunity.impact,
      });
    });

    return suggestions;
  }

  /**
   * Helper methods
   */
  private findDominantType(occurrences: Record<string, number>): string {
    return Object.entries(occurrences).reduce((a, b) =>
      occurrences[a[0]] > occurrences[b[0]] ? a : b
    )[0];
  }

  private getPatternSuggestionSeverity(pattern: PatternAnalysis): SuggestionSeverity {
    if (pattern.confidence > 0.9) return SuggestionSeverity.MEDIUM;
    if (pattern.confidence > 0.8) return SuggestionSeverity.LOW;
    return SuggestionSeverity.INFO;
  }

  private isSensitivePattern(pattern: PatternType): boolean {
    return [
      PatternType.EMAIL,
      PatternType.PHONE,
      PatternType.UUID,
      PatternType.IP_ADDRESS,
    ].includes(pattern);
  }

  private formatPatternName(pattern: PatternType): string {
    return pattern
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  private getOptimizationSeverity(type: OptimizationType): SuggestionSeverity {
    switch (type) {
      case OptimizationType.REDUCE_DUPLICATION:
        return SuggestionSeverity.HIGH;
      case OptimizationType.OPTIMIZE_ARRAYS:
        return SuggestionSeverity.MEDIUM;
      case OptimizationType.FLATTEN_OBJECT:
        return SuggestionSeverity.MEDIUM;
      case OptimizationType.IMPROVE_TYPES:
        return SuggestionSeverity.LOW;
      case OptimizationType.ADD_VALIDATION:
        return SuggestionSeverity.LOW;
      default:
        return SuggestionSeverity.INFO;
    }
  }

  private formatOptimizationType(type: OptimizationType): string {
    return type
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }
}
