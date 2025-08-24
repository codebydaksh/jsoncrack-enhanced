import type { SchemaAnalysisResult } from "../../store/useSQLSchema";
import { DatabaseType } from "../../store/useSQLSchema";

export interface SchemaTestResult {
  testName: string;
  passed: boolean;
  message: string;
  severity: "INFO" | "WARNING" | "ERROR";
  category: "SYNTAX" | "PERFORMANCE" | "BEST_PRACTICES" | "COMPATIBILITY";
}

export interface SchemaTestSuite {
  results: SchemaTestResult[];
  overallScore: number;
  passedTests: number;
  totalTests: number;
  recommendations: string[];
}

/**
 * Comprehensive schema testing engine
 */
export class SchemaTestingEngine {
  private databaseType: DatabaseType;
  private testResults: SchemaTestResult[] = [];

  constructor(databaseType: DatabaseType) {
    this.databaseType = databaseType;
  }

  /**
   * Run all schema tests
   */
  async runAllTests(
    analysisResult: SchemaAnalysisResult,
    generatedSQL: string
  ): Promise<SchemaTestSuite> {
    this.testResults = [];

    // Run different test categories
    await this.runSyntaxTests(generatedSQL);
    await this.runPerformanceTests(analysisResult);
    await this.runBestPracticesTests(analysisResult);
    await this.runCompatibilityTests(analysisResult, generatedSQL);

    return this.generateTestSuite();
  }

  /**
   * Test SQL syntax validity
   */
  private async runSyntaxTests(sql: string): Promise<void> {
    // Test 1: Basic SQL syntax
    this.addTest({
      testName: "Basic SQL Syntax",
      passed: this.validateBasicSyntax(sql),
      message: "SQL contains valid basic syntax",
      severity: "ERROR",
      category: "SYNTAX",
    });

    // Test 2: Statement termination
    this.addTest({
      testName: "Statement Termination",
      passed: this.validateStatementTermination(sql),
      message: "All SQL statements properly terminated with semicolons",
      severity: "WARNING",
      category: "SYNTAX",
    });

    // Test 3: Reserved words handling
    this.addTest({
      testName: "Reserved Words",
      passed: this.validateReservedWords(sql),
      message: "Reserved words properly handled",
      severity: "WARNING",
      category: "SYNTAX",
    });
  }

  /**
   * Test schema performance characteristics
   */
  private async runPerformanceTests(analysisResult: SchemaAnalysisResult): Promise<void> {
    // Test 4: Primary key presence
    this.addTest({
      testName: "Primary Keys",
      passed: this.validatePrimaryKeys(analysisResult),
      message: "All tables have primary keys",
      severity: "ERROR",
      category: "PERFORMANCE",
    });

    // Test 5: Index coverage
    this.addTest({
      testName: "Index Coverage",
      passed: this.validateIndexCoverage(analysisResult),
      message: "Appropriate indexes present for performance",
      severity: "WARNING",
      category: "PERFORMANCE",
    });

    // Test 6: Table normalization
    this.addTest({
      testName: "Normalization Level",
      passed: this.validateNormalization(analysisResult),
      message: "Tables properly normalized",
      severity: "INFO",
      category: "PERFORMANCE",
    });
  }

  /**
   * Test best practices compliance
   */
  private async runBestPracticesTests(analysisResult: SchemaAnalysisResult): Promise<void> {
    // Test 7: Naming conventions
    this.addTest({
      testName: "Naming Conventions",
      passed: this.validateNamingConventions(analysisResult),
      message: "Consistent naming conventions used",
      severity: "WARNING",
      category: "BEST_PRACTICES",
    });

    // Test 8: Data type appropriateness
    this.addTest({
      testName: "Data Types",
      passed: this.validateDataTypes(analysisResult),
      message: "Appropriate data types selected",
      severity: "WARNING",
      category: "BEST_PRACTICES",
    });

    // Test 9: Constraint usage
    this.addTest({
      testName: "Constraints",
      passed: this.validateConstraints(analysisResult),
      message: "Proper constraints implemented",
      severity: "INFO",
      category: "BEST_PRACTICES",
    });
  }

  /**
   * Test database compatibility
   */
  private async runCompatibilityTests(
    analysisResult: SchemaAnalysisResult,
    sql: string
  ): Promise<void> {
    // Test 10: Database-specific features
    this.addTest({
      testName: "Database Compatibility",
      passed: this.validateDatabaseCompatibility(sql),
      message: `Schema compatible with ${this.databaseType}`,
      severity: "ERROR",
      category: "COMPATIBILITY",
    });
  }

  private validateBasicSyntax(sql: string): boolean {
    // Check for basic SQL structure
    const hasCreateTable = sql.includes("CREATE TABLE");
    const hasValidParentheses = this.validateParentheses(sql);
    return hasCreateTable && hasValidParentheses;
  }

  private validateParentheses(sql: string): boolean {
    let count = 0;
    for (const char of sql) {
      if (char === "(") count++;
      if (char === ")") count--;
      if (count < 0) return false;
    }
    return count === 0;
  }

  private validateStatementTermination(sql: string): boolean {
    const statements = sql.split(";").filter(s => s.trim());
    const lastStatement = statements[statements.length - 1];
    return !lastStatement || lastStatement.trim().length === 0;
  }

  private validateReservedWords(sql: string): boolean {
    // This is a simplified check - in practice, would need comprehensive list
    const problematicWords = ["order", "group", "table", "column"];
    const words = sql.toLowerCase().split(/\s+/);
    return !problematicWords.some(word =>
      words.some(w => w.includes(word) && !w.includes(`"${word}"`))
    );
  }

  private validatePrimaryKeys(analysisResult: SchemaAnalysisResult): boolean {
    return analysisResult.tables.every(table => table.columns.some(col => col.isPrimaryKey));
  }

  private validateIndexCoverage(analysisResult: SchemaAnalysisResult): boolean {
    return analysisResult.tables.every(table => {
      const hasIndexes = table.indexes && table.indexes.length > 0;
      const hasForeignKeys = table.columns.some(col => col.isForeignKey);
      return hasIndexes || !hasForeignKeys; // Tables with FKs should have indexes
    });
  }

  private validateNormalization(analysisResult: SchemaAnalysisResult): boolean {
    // Check for over-normalization (too many small tables) or under-normalization
    const avgColumnsPerTable =
      analysisResult.tables.reduce((sum, table) => sum + table.columns.length, 0) /
      analysisResult.tables.length;

    return avgColumnsPerTable >= 3 && avgColumnsPerTable <= 25;
  }

  private validateNamingConventions(analysisResult: SchemaAnalysisResult): boolean {
    // Check for consistent naming (all snake_case, camelCase, etc.)
    const allNames = [
      ...analysisResult.tables.map(t => t.name),
      ...analysisResult.tables.flatMap(t => t.columns.map(c => c.name)),
    ];

    const isSnakeCase = allNames.every(name => /^[a-z][a-z0-9_]*$/.test(name));
    const isCamelCase = allNames.every(name => /^[a-z][a-zA-Z0-9]*$/.test(name));

    return isSnakeCase || isCamelCase;
  }

  private validateDataTypes(analysisResult: SchemaAnalysisResult): boolean {
    return analysisResult.tables.every(table =>
      table.columns.every(col => {
        // Check for appropriate data type usage
        if (col.name.toLowerCase().includes("email")) {
          return (
            col.type.includes("VARCHAR") && (col.type.includes("255") || col.type.includes("320"))
          );
        }
        if (col.name.toLowerCase().includes("id") && col.isPrimaryKey) {
          return col.type.includes("INT") || col.type.includes("UUID");
        }
        return true; // Basic validation passed
      })
    );
  }

  private validateConstraints(analysisResult: SchemaAnalysisResult): boolean {
    // Check if appropriate constraints are present
    return analysisResult.tables.some(table =>
      table.columns.some(col => col.constraints && col.constraints.length > 0)
    );
  }

  private validateDatabaseCompatibility(sql: string): boolean {
    switch (this.databaseType) {
      case DatabaseType.PostgreSQL:
        return !sql.includes("AUTO_INCREMENT"); // Should use SERIAL
      case DatabaseType.MySQL:
        return !sql.includes("SERIAL"); // Should use AUTO_INCREMENT
      case DatabaseType.SQLServer:
        return !sql.includes("SERIAL") && !sql.includes("AUTO_INCREMENT");
      case DatabaseType.SQLite:
        return !sql.includes("AUTO_INCREMENT"); // Should use AUTOINCREMENT
      default:
        return true;
    }
  }

  private addTest(test: SchemaTestResult): void {
    this.testResults.push(test);
  }

  private generateTestSuite(): SchemaTestSuite {
    const passedTests = this.testResults.filter(t => t.passed).length;
    const totalTests = this.testResults.length;
    const overallScore = Math.round((passedTests / totalTests) * 100);

    const recommendations = this.generateRecommendations();

    return {
      results: this.testResults,
      overallScore,
      passedTests,
      totalTests,
      recommendations,
    };
  }

  private generateRecommendations(): string[] {
    const failedTests = this.testResults.filter(t => !t.passed);
    const recommendations: string[] = [];

    failedTests.forEach(test => {
      switch (test.testName) {
        case "Primary Keys":
          recommendations.push(
            "Add primary keys to all tables for better performance and replication"
          );
          break;
        case "Index Coverage":
          recommendations.push("Add indexes on foreign key columns and frequently queried fields");
          break;
        case "Naming Conventions":
          recommendations.push("Use consistent naming conventions throughout the schema");
          break;
        case "Database Compatibility":
          recommendations.push(`Ensure SQL syntax is compatible with ${this.databaseType}`);
          break;
      }
    });

    return recommendations;
  }
}

/**
 * Quick validation function for basic schema testing
 */
export async function validateSchema(
  analysisResult: SchemaAnalysisResult,
  generatedSQL: string,
  databaseType: DatabaseType
): Promise<SchemaTestSuite> {
  const engine = new SchemaTestingEngine(databaseType);
  return await engine.runAllTests(analysisResult, generatedSQL);
}
