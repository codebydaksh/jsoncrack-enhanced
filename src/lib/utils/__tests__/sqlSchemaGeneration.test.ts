import { DatabaseType, NormalizationLevel, NamingConvention } from "../../../store/useSQLSchema";
import {
  generateSQLSchema,
  validateGeneratedSQL,
  validateSchemaPerformance,
} from "../sqlSchemaGeneration";

describe("SQL Schema Generation", () => {
  const mockConfig = {
    databaseType: DatabaseType.PostgreSQL,
    normalizationLevel: NormalizationLevel.Third,
    namingConvention: NamingConvention.SnakeCase,
    includeIndexes: true,
    includeForeignKeys: true,
    includeConstraints: true,
    tablePrefix: "",
    generateMigration: true,
    optimizeForPerformance: true,
  };

  const mockAnalysisResult = {
    tables: [
      {
        name: "users",
        columns: [
          {
            name: "id",
            type: "SERIAL",
            nullable: false,
            isPrimaryKey: true,
            isForeignKey: false,
            constraints: [],
          },
          {
            name: "name",
            type: "VARCHAR(255)",
            nullable: false,
            isPrimaryKey: false,
            isForeignKey: false,
            constraints: [],
          },
          {
            name: "email",
            type: "VARCHAR(320)",
            nullable: true,
            isPrimaryKey: false,
            isForeignKey: false,
            constraints: ["UNIQUE"],
          },
        ],
        indexes: [
          {
            name: "idx_users_email",
            columns: ["email"],
            unique: true,
          },
        ],
      },
      {
        name: "posts",
        columns: [
          {
            name: "id",
            type: "SERIAL",
            nullable: false,
            isPrimaryKey: true,
            isForeignKey: false,
            constraints: [],
          },
          {
            name: "user_id",
            type: "INTEGER",
            nullable: false,
            isPrimaryKey: false,
            isForeignKey: true,
            constraints: [],
          },
          {
            name: "title",
            type: "VARCHAR(255)",
            nullable: false,
            isPrimaryKey: false,
            isForeignKey: false,
            constraints: [],
          },
        ],
        indexes: [
          {
            name: "idx_posts_user_id",
            columns: ["user_id"],
            unique: false,
          },
        ],
      },
    ],
    relationships: [
      {
        sourceTable: "posts",
        targetTable: "users",
        relationshipType: "ONE_TO_MANY" as const,
        foreignKeyColumn: "user_id",
        onDelete: "CASCADE" as const,
        onUpdate: "CASCADE" as const,
      },
    ],
    recommendations: [],
    migrationScript: "-- Migration script placeholder",
    estimatedPerformance: {
      estimatedSize: "5KB",
      queryComplexity: "MEDIUM" as const,
      indexEfficiency: 85,
      normalizationScore: 90,
    },
  };

  describe("generateSQLSchema", () => {
    test("should generate basic PostgreSQL schema", async () => {
      const sql = await generateSQLSchema(mockAnalysisResult, mockConfig);

      expect(sql).toContain('CREATE TABLE "users"');
      expect(sql).toContain('CREATE TABLE "posts"');
      expect(sql).toContain("SERIAL");
      expect(sql).toContain("PRIMARY KEY");
      expect(sql).toContain("FOREIGN KEY");
    });

    test("should generate MySQL schema", async () => {
      const mysqlConfig = { ...mockConfig, databaseType: DatabaseType.MySQL };
      const sql = await generateSQLSchema(mockAnalysisResult, mysqlConfig);

      expect(sql).toContain("CREATE TABLE `users`");
      expect(sql).toContain("AUTO_INCREMENT");
      expect(sql).toContain("ENGINE=InnoDB");
    });

    test("should generate SQL Server schema", async () => {
      const sqlServerConfig = { ...mockConfig, databaseType: DatabaseType.SQLServer };
      const sql = await generateSQLSchema(mockAnalysisResult, sqlServerConfig);

      expect(sql).toContain("CREATE TABLE [users]");
      expect(sql).toContain("IDENTITY(1,1)");
      expect(sql).toContain("NVARCHAR");
    });

    test("should generate SQLite schema", async () => {
      const sqliteConfig = { ...mockConfig, databaseType: DatabaseType.SQLite };
      const sql = await generateSQLSchema(mockAnalysisResult, sqliteConfig);

      expect(sql).toContain('CREATE TABLE "users"');
      expect(sql).toContain("AUTOINCREMENT");
    });

    test("should include indexes when configured", async () => {
      const configWithIndexes = { ...mockConfig, includeIndexes: true };
      const sql = await generateSQLSchema(mockAnalysisResult, configWithIndexes);

      expect(sql).toContain("CREATE INDEX");
      expect(sql).toContain("idx_users_email");
      expect(sql).toContain("idx_posts_user_id");
    });

    test("should exclude indexes when configured", async () => {
      const configWithoutIndexes = { ...mockConfig, includeIndexes: false };
      const sql = await generateSQLSchema(mockAnalysisResult, configWithoutIndexes);

      expect(sql).not.toContain("CREATE INDEX");
    });

    test("should include foreign keys when configured", async () => {
      const configWithFKs = { ...mockConfig, includeForeignKeys: true };
      const sql = await generateSQLSchema(mockAnalysisResult, configWithFKs);

      expect(sql).toContain("FOREIGN KEY");
      expect(sql).toContain("REFERENCES");
      expect(sql).toContain("ON DELETE CASCADE");
    });

    test("should exclude foreign keys when configured", async () => {
      const configWithoutFKs = { ...mockConfig, includeForeignKeys: false };
      const sql = await generateSQLSchema(mockAnalysisResult, configWithoutFKs);

      expect(sql).not.toContain("FOREIGN KEY");
    });

    test("should include constraints when configured", async () => {
      const configWithConstraints = { ...mockConfig, includeConstraints: true };
      const sql = await generateSQLSchema(mockAnalysisResult, configWithConstraints);

      expect(sql).toContain("UNIQUE");
      expect(sql).toContain("NOT NULL");
    });

    test("should apply table prefix", async () => {
      const configWithPrefix = { ...mockConfig, tablePrefix: "app_" };
      const sql = await generateSQLSchema(mockAnalysisResult, configWithPrefix);

      expect(sql).toContain('CREATE TABLE "app_users"');
      expect(sql).toContain('CREATE TABLE "app_posts"');
    });

    test("should respect naming conventions", async () => {
      const camelCaseConfig = { ...mockConfig, namingConvention: NamingConvention.CamelCase };

      const camelCaseAnalysisResult = {
        ...mockAnalysisResult,
        tables: mockAnalysisResult.tables.map(table => ({
          ...table,
          columns: table.columns.map(col => ({
            ...col,
            name: col.name === "user_id" ? "userId" : col.name,
          })),
        })),
      };

      const sql = await generateSQLSchema(camelCaseAnalysisResult, camelCaseConfig);

      expect(sql).toContain("userId");
    });
  });

  describe("validateGeneratedSQL", () => {
    test("should validate correct PostgreSQL SQL", async () => {
      const validSQL = `
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(320) UNIQUE
        );
      `;

      const result = await validateGeneratedSQL(validSQL, DatabaseType.PostgreSQL);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("should detect syntax errors", async () => {
      const invalidSQL = `
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL
          email VARCHAR(320) UNIQUE
        );
      `;

      const result = await validateGeneratedSQL(invalidSQL, DatabaseType.PostgreSQL);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test("should provide warnings for PostgreSQL", async () => {
      const sqlWithWarnings = `
        CREATE TABLE users (
          id UUID PRIMARY KEY,
          name VARCHAR(255) NOT NULL
        );
      `;

      const result = await validateGeneratedSQL(sqlWithWarnings, DatabaseType.PostgreSQL);

      expect(result.warnings.some(warning => warning.includes("uuid-ossp extension"))).toBe(true);
    });

    test("should provide warnings for MySQL", async () => {
      const sqlWithWarnings = `
        CREATE TABLE users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL
        );
      `;

      const result = await validateGeneratedSQL(sqlWithWarnings, DatabaseType.MySQL);

      expect(result.warnings.some(warning => warning.includes("ENGINE"))).toBe(true);
    });

    test("should detect reserved words", async () => {
      const sqlWithReservedWords = `
        CREATE TABLE order (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL
        );
      `;

      const result = await validateGeneratedSQL(sqlWithReservedWords, DatabaseType.PostgreSQL);

      expect(result.warnings.some(warning => warning.toLowerCase().includes("reserved word"))).toBe(
        true
      );
    });
  });

  describe("validateSchemaPerformance", () => {
    test("should analyze schema performance", async () => {
      const result = await validateSchemaPerformance(mockAnalysisResult, DatabaseType.PostgreSQL);

      expect(result.performanceScore).toBeGreaterThanOrEqual(0);
      expect(result.performanceScore).toBeLessThanOrEqual(100);
      expect(result.recommendations).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.metrics.tableCount).toBe(2);
    });

    test("should detect missing primary keys", async () => {
      const badAnalysisResult = {
        ...mockAnalysisResult,
        tables: [
          {
            name: "bad_table",
            columns: [
              {
                name: "name",
                type: "VARCHAR(255)",
                nullable: false,
                isPrimaryKey: false,
                isForeignKey: false,
                constraints: [],
              },
            ],
            indexes: [],
          },
        ],
        relationships: [],
        recommendations: [],
        migrationScript: "",
        estimatedPerformance: {
          estimatedSize: "1KB",
          queryComplexity: "LOW" as const,
          indexEfficiency: 50,
          normalizationScore: 60,
        },
      };

      const result = await validateSchemaPerformance(badAnalysisResult, DatabaseType.PostgreSQL);

      expect(
        result.recommendations.some(rec => rec.message.toLowerCase().includes("primary key"))
      ).toBe(true);
    });

    test("should detect missing indexes", async () => {
      const noIndexAnalysisResult = {
        ...mockAnalysisResult,
        tables: mockAnalysisResult.tables.map(table => ({
          ...table,
          indexes: [],
        })),
      };

      const result = await validateSchemaPerformance(
        noIndexAnalysisResult,
        DatabaseType.PostgreSQL
      );

      expect(result.recommendations.some(rec => rec.message.toLowerCase().includes("index"))).toBe(
        true
      );
    });

    test("should provide database-specific recommendations", async () => {
      const result = await validateSchemaPerformance(mockAnalysisResult, DatabaseType.PostgreSQL);

      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases", () => {
    test("should handle empty schema", async () => {
      const emptyAnalysisResult = {
        tables: [],
        relationships: [],
        recommendations: [],
        migrationScript: "",
        estimatedPerformance: {
          estimatedSize: "0KB",
          queryComplexity: "LOW" as const,
          indexEfficiency: 0,
          normalizationScore: 0,
        },
      };

      const sql = await generateSQLSchema(emptyAnalysisResult, mockConfig);

      expect(sql).toBeDefined();
      expect(typeof sql).toBe("string");
    });

    test("should handle schema with no relationships", async () => {
      const noRelationshipsResult = {
        ...mockAnalysisResult,
        relationships: [],
      };

      const sql = await generateSQLSchema(noRelationshipsResult, mockConfig);

      expect(sql).toContain('CREATE TABLE "users"');
      expect(sql).not.toContain("FOREIGN KEY");
    });

    test("should handle very long table/column names", async () => {
      const longNameResult = {
        tables: [
          {
            name: "very_long_table_name_that_exceeds_normal_limits_for_database_identifiers",
            columns: [
              {
                name: "very_long_column_name_that_exceeds_normal_limits",
                type: "VARCHAR(255)",
                nullable: false,
                isPrimaryKey: true,
                isForeignKey: false,
                constraints: [],
              },
            ],
            indexes: [],
          },
        ],
        relationships: [],
        recommendations: [],
        migrationScript: "",
        estimatedPerformance: {
          estimatedSize: "2KB",
          queryComplexity: "LOW" as const,
          indexEfficiency: 80,
          normalizationScore: 70,
        },
      };

      const sql = await generateSQLSchema(longNameResult, mockConfig);

      expect(sql).toBeDefined();
      expect(sql.length).toBeGreaterThan(0);
    });
  });

  describe("Performance", () => {
    test("should generate schema within reasonable time", async () => {
      const largeAnalysisResult = {
        tables: Array.from({ length: 50 }, (_, i) => ({
          name: `table_${i}`,
          columns: Array.from({ length: 20 }, (_, j) => ({
            name: `column_${j}`,
            type: "VARCHAR(255)",
            nullable: false,
            isPrimaryKey: j === 0,
            isForeignKey: false,
            constraints: [],
          })),
          indexes: [],
        })),
        relationships: [],
        recommendations: [],
        migrationScript: "",
        estimatedPerformance: {
          estimatedSize: "50KB",
          queryComplexity: "HIGH" as const,
          indexEfficiency: 60,
          normalizationScore: 50,
        },
      };

      const startTime = Date.now();
      const sql = await generateSQLSchema(largeAnalysisResult, mockConfig);
      const endTime = Date.now();

      expect(sql).toBeDefined();
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
});
