import { DatabaseType, NormalizationLevel, NamingConvention } from "../../../store/useSQLSchema";
import { analyzeJSONStructure } from "../sqlSchemaAnalysis";

describe("SQL Schema Analysis", () => {
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

  describe("analyzeJSONStructure", () => {
    test("should analyze simple object structure", async () => {
      const jsonData = {
        id: 1,
        name: "John Doe",
        email: "john@example.com",
        age: 30,
      };

      const result = await analyzeJSONStructure(jsonData, mockConfig);

      expect(result.tables).toHaveLength(1);
      expect(result.tables[0].name).toBe("root");
      expect(result.tables[0].columns).toHaveLength(4);

      const columns = result.tables[0].columns;
      expect(columns.find(col => col.name === "id")).toBeDefined();
      expect(columns.find(col => col.name === "name")).toBeDefined();
      expect(columns.find(col => col.name === "email")).toBeDefined();
      expect(columns.find(col => col.name === "age")).toBeDefined();
    });

    test("should handle nested objects", async () => {
      const jsonData = {
        user: {
          id: 1,
          profile: {
            firstName: "John",
            lastName: "Doe",
          },
        },
      };

      const result = await analyzeJSONStructure(jsonData, mockConfig);

      expect(result.tables.length).toBeGreaterThan(1);
      expect(result.relationships.length).toBeGreaterThan(0);
    });

    test("should handle arrays", async () => {
      const jsonData = {
        users: [
          { id: 1, name: "John" },
          { id: 2, name: "Jane" },
        ],
      };

      const result = await analyzeJSONStructure(jsonData, mockConfig);

      expect(result.tables).toHaveLength(2);
      expect(result.relationships).toHaveLength(1);
    });

    test("should detect data types correctly", async () => {
      const jsonData = {
        string_field: "text",
        number_field: 42,
        boolean_field: true,
        date_field: "2023-01-01T00:00:00Z",
        email_field: "test@example.com",
        uuid_field: "123e4567-e89b-12d3-a456-426614174000",
      };

      const result = await analyzeJSONStructure(jsonData, mockConfig);

      const columns = result.tables[0].columns;
      expect(columns.find(col => col.name === "string_field")?.type).toContain("VARCHAR");
      expect(columns.find(col => col.name === "number_field")?.type).toContain("INTEGER");
      expect(columns.find(col => col.name === "boolean_field")?.type).toContain("BOOLEAN");
      expect(columns.find(col => col.name === "email_field")?.type).toContain("VARCHAR");
    });

    test("should generate primary keys", async () => {
      const jsonData = {
        id: 1,
        name: "Test",
      };

      const result = await analyzeJSONStructure(jsonData, mockConfig);

      const idColumn = result.tables[0].columns.find(col => col.name === "id");
      expect(idColumn?.isPrimaryKey).toBe(true);
    });

    test("should respect naming conventions", async () => {
      const snakeCaseConfig = { ...mockConfig, namingConvention: NamingConvention.SnakeCase };
      const camelCaseConfig = { ...mockConfig, namingConvention: NamingConvention.CamelCase };

      const jsonData = {
        firstName: "John",
        lastName: "Doe",
      };

      const snakeResult = await analyzeJSONStructure(jsonData, snakeCaseConfig);
      const camelResult = await analyzeJSONStructure(jsonData, camelCaseConfig);

      const snakeColumns = snakeResult.tables[0].columns.map(col => col.name);
      const camelColumns = camelResult.tables[0].columns.map(col => col.name);

      expect(snakeColumns).toContain("first_name");
      expect(camelColumns).toContain("firstName");
    });

    test("should handle null values", async () => {
      const jsonData = {
        optional_field: null,
        required_field: "value",
      };

      const result = await analyzeJSONStructure(jsonData, mockConfig);

      const optionalColumn = result.tables[0].columns.find(col => col.name === "optional_field");
      const requiredColumn = result.tables[0].columns.find(col => col.name === "required_field");

      expect(optionalColumn?.nullable).toBe(true);
      expect(requiredColumn?.nullable).toBe(false);
    });

    test("should handle empty objects", async () => {
      const jsonData = {};

      const result = await analyzeJSONStructure(jsonData, mockConfig);

      expect(result.tables).toHaveLength(1);
      expect(result.tables[0].columns).toHaveLength(1); // Should have at least an ID column
    });

    test("should generate recommendations", async () => {
      const jsonData = {
        user_id: 1,
        profile_id: 2,
        // Large object that might benefit from normalization
        large_text: "very long text content...",
      };

      const result = await analyzeJSONStructure(jsonData, mockConfig);

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    test("should respect table prefix", async () => {
      const configWithPrefix = { ...mockConfig, tablePrefix: "app_" };
      const jsonData = { id: 1, name: "test" };

      const result = await analyzeJSONStructure(jsonData, configWithPrefix);

      expect(result.tables[0].name).toBe("app_root");
    });

    test("should handle different normalization levels", async () => {
      const jsonData = {
        user: {
          id: 1,
          profile: {
            address: {
              street: "123 Main St",
              city: "Anytown",
            },
          },
        },
      };

      const firstNFConfig = { ...mockConfig, normalizationLevel: NormalizationLevel.First };
      const thirdNFConfig = { ...mockConfig, normalizationLevel: NormalizationLevel.Third };

      const firstNFResult = await analyzeJSONStructure(jsonData, firstNFConfig);
      const thirdNFResult = await analyzeJSONStructure(jsonData, thirdNFConfig);

      // Third normal form should create more normalized tables
      expect(thirdNFResult.tables.length).toBeGreaterThanOrEqual(firstNFResult.tables.length);
    });
  });

  describe("Edge Cases", () => {
    test("should handle circular references gracefully", async () => {
      const obj: any = { id: 1, name: "test" };
      obj.self = obj; // Create circular reference

      await expect(analyzeJSONStructure(obj, mockConfig)).resolves.not.toThrow();
    });

    test("should handle very deep nesting", async () => {
      const deepObject = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  value: "deep",
                },
              },
            },
          },
        },
      };

      const result = await analyzeJSONStructure(deepObject, mockConfig);

      expect(result.tables.length).toBeGreaterThan(1);
    });

    test("should handle arrays of different types", async () => {
      const jsonData = {
        mixed_array: [
          { type: "user", name: "John" },
          { type: "admin", permissions: ["read", "write"] },
        ],
      };

      const result = await analyzeJSONStructure(jsonData, mockConfig);

      expect(result.tables.length).toBeGreaterThan(1);
    });

    test("should handle large datasets", async () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
      }));

      const jsonData = { users: largeArray };

      const result = await analyzeJSONStructure(jsonData, mockConfig);

      expect(result.tables).toBeDefined();
      expect(result.tables.length).toBeGreaterThan(0);
    });
  });

  describe("Performance", () => {
    test("should complete analysis within reasonable time", async () => {
      const jsonData = {
        users: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          profile: {
            name: `User ${i}`,
            settings: {
              theme: "dark",
              notifications: true,
            },
          },
        })),
      };

      const startTime = Date.now();
      await analyzeJSONStructure(jsonData, mockConfig);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe("Database-specific configurations", () => {
    test("should generate PostgreSQL-specific features", async () => {
      const postgresConfig = { ...mockConfig, databaseType: DatabaseType.PostgreSQL };
      const jsonData = { metadata: { tags: ["tag1", "tag2"] } };

      const result = await analyzeJSONStructure(jsonData, postgresConfig);

      // Should suggest JSON columns for PostgreSQL
      expect(result.recommendations.some(rec => rec.message.toLowerCase().includes("json"))).toBe(
        true
      );
    });

    test("should generate MySQL-specific features", async () => {
      const mysqlConfig = { ...mockConfig, databaseType: DatabaseType.MySQL };
      const jsonData = { id: 1, name: "test" };

      const result = await analyzeJSONStructure(jsonData, mysqlConfig);

      expect(result).toBeDefined();
      expect(result.tables.length).toBeGreaterThan(0);
    });

    test("should generate SQLite-specific features", async () => {
      const sqliteConfig = { ...mockConfig, databaseType: DatabaseType.SQLite };
      const jsonData = { id: 1, name: "test" };

      const result = await analyzeJSONStructure(jsonData, sqliteConfig);

      expect(result).toBeDefined();
      expect(result.tables.length).toBeGreaterThan(0);
    });
  });
});
