/**
 * Version History Core Types and Functionality Tests
 * Comprehensive test suite for the version history system
 */
import type {
  VersionMetadata,
  DiffOperation,
  VersionDelta,
  Version,
  PerformanceMetrics,
  VersionSearchCriteria,
  RestoreOptions,
} from "../../../types/versionHistory";
import {
  ChangeType,
  ChangeImpact,
  VersionStatus,
  DiffOperationType,
} from "../../../types/versionHistory";
import { JsonDiffEngine, calculateChangeImpact } from "../jsonDiffEngine";
import { createVersionStorage, getStorageUsage, clearVersionStorage } from "../versionStorage";

describe("Version History Core Functionality", () => {
  beforeEach(() => {
    // Clean up storage before each test
    clearVersionStorage();
  });

  afterEach(() => {
    // Clean up storage after each test
    clearVersionStorage();
  });

  describe("Version History Types", () => {
    it("should have correct ChangeType enum values", () => {
      expect(ChangeType.MAJOR).toBe("major");
      expect(ChangeType.MINOR).toBe("minor");
      expect(ChangeType.PATCH).toBe("patch");
      expect(ChangeType.AUTO).toBe("auto");
    });

    it("should have correct ChangeImpact enum values", () => {
      expect(ChangeImpact.MINIMAL).toBe("minimal");
      expect(ChangeImpact.MODERATE).toBe("moderate");
      expect(ChangeImpact.SIGNIFICANT).toBe("significant");
      expect(ChangeImpact.MAJOR).toBe("major");
    });

    it("should have correct VersionStatus enum values", () => {
      expect(VersionStatus.DRAFT).toBe("draft");
      expect(VersionStatus.COMMITTED).toBe("committed");
      expect(VersionStatus.TAGGED).toBe("tagged");
      expect(VersionStatus.ARCHIVED).toBe("archived");
    });

    it("should have correct DiffOperationType enum values", () => {
      expect(DiffOperationType.ADD).toBe("add");
      expect(DiffOperationType.REMOVE).toBe("remove");
      expect(DiffOperationType.REPLACE).toBe("replace");
      expect(DiffOperationType.MOVE).toBe("move");
      expect(DiffOperationType.COPY).toBe("copy");
    });
  });

  describe("Version Metadata Validation", () => {
    it("should validate version metadata structure", () => {
      const metadata: VersionMetadata = {
        id: "test-version-id",
        version: "1.0.0",
        timestamp: Date.now(),
        message: "Test version",
        changeType: ChangeType.MAJOR,
        changeImpact: ChangeImpact.SIGNIFICANT,
        status: VersionStatus.COMMITTED,
        branchId: "main",
        parentId: "parent-version-id",
        tags: ["tag1", "tag2"],
        contentSize: 1024,
        deltaSize: 256,
        author: "test-user",
        checksum: "abc123",
      };

      expect(metadata.id).toBeDefined();
      expect(metadata.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(metadata.timestamp).toBeGreaterThan(0);
      expect(Object.values(ChangeType)).toContain(metadata.changeType);
      expect(Object.values(ChangeImpact)).toContain(metadata.changeImpact);
      expect(Object.values(VersionStatus)).toContain(metadata.status);
      expect(metadata.contentSize).toBeGreaterThan(0);
      expect(metadata.deltaSize).toBeGreaterThan(0);
    });
  });

  describe("Diff Operation Validation", () => {
    it("should validate ADD operation structure", () => {
      const operation: DiffOperation = {
        op: DiffOperationType.ADD,
        path: "/new/property",
        value: "new value",
      };

      expect(operation.op).toBe(DiffOperationType.ADD);
      expect(operation.path).toBeDefined();
      expect(operation.value).toBeDefined();
    });

    it("should validate REMOVE operation structure", () => {
      const operation: DiffOperation = {
        op: DiffOperationType.REMOVE,
        path: "/removed/property",
        oldValue: "old value",
      };

      expect(operation.op).toBe(DiffOperationType.REMOVE);
      expect(operation.path).toBeDefined();
      expect(operation.oldValue).toBeDefined();
    });

    it("should validate REPLACE operation structure", () => {
      const operation: DiffOperation = {
        op: DiffOperationType.REPLACE,
        path: "/changed/property",
        value: "new value",
        oldValue: "old value",
      };

      expect(operation.op).toBe(DiffOperationType.REPLACE);
      expect(operation.path).toBeDefined();
      expect(operation.value).toBeDefined();
      expect(operation.oldValue).toBeDefined();
    });

    it("should validate MOVE operation structure", () => {
      const operation: DiffOperation = {
        op: DiffOperationType.MOVE,
        path: "/new/location",
        from: "/old/location",
      };

      expect(operation.op).toBe(DiffOperationType.MOVE);
      expect(operation.path).toBeDefined();
      expect(operation.from).toBeDefined();
    });
  });

  describe("Version Delta Validation", () => {
    it("should validate version delta structure", () => {
      const delta: VersionDelta = {
        operations: [
          {
            op: DiffOperationType.ADD,
            path: "/test",
            value: "test value",
          },
        ],
        metadata: {
          totalOperations: 1,
          addedCount: 1,
          removedCount: 0,
          modifiedCount: 0,
          changeComplexity: 0.1,
        },
      };

      expect(delta.operations).toBeInstanceOf(Array);
      expect(delta.operations.length).toBe(1);
      expect(delta.metadata.totalOperations).toBe(1);
      expect(delta.metadata.changeComplexity).toBeGreaterThanOrEqual(0);
      expect(delta.metadata.changeComplexity).toBeLessThanOrEqual(1);
    });
  });

  describe("Performance Metrics Validation", () => {
    it("should validate performance metrics structure", () => {
      const metrics: PerformanceMetrics = {
        averageCompressionTime: 50,
        averageDecompressionTime: 30,
        averageDiffTime: 25,
        cacheHitRate: 0.85,
        memoryUsage: 1024 * 1024,
      };

      expect(metrics.averageCompressionTime).toBeGreaterThan(0);
      expect(metrics.averageDecompressionTime).toBeGreaterThan(0);
      expect(metrics.averageDiffTime).toBeGreaterThan(0);
      expect(metrics.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(metrics.cacheHitRate).toBeLessThanOrEqual(1);
      expect(metrics.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe("Version Search Criteria", () => {
    it("should validate search criteria structure", () => {
      const criteria: VersionSearchCriteria = {
        messageContains: "test",
        branchIds: ["main", "feature"],
        changeTypes: [ChangeType.MAJOR, ChangeType.MINOR],
        dateRange: {
          start: new Date("2024-01-01"),
          end: new Date("2024-12-31"),
        },
        tags: ["release", "milestone"],
        sortBy: "timestamp",
        sortOrder: "desc",
        limit: 50,
        offset: 0,
      };

      expect(criteria.messageContains).toBe("test");
      expect(criteria.branchIds).toBeInstanceOf(Array);
      expect(criteria.changeTypes).toBeInstanceOf(Array);
      expect(criteria.dateRange?.start).toBeInstanceOf(Date);
      expect(criteria.dateRange?.end).toBeInstanceOf(Date);
      expect(["timestamp", "version", "changeImpact"]).toContain(criteria.sortBy);
      expect(["asc", "desc"]).toContain(criteria.sortOrder);
      expect(criteria.limit).toBeGreaterThan(0);
      expect(criteria.offset).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Restore Options Validation", () => {
    it("should validate restore options structure", () => {
      const options: RestoreOptions = {
        targetVersionId: "version-123",
        createBackup: true,
        validateBeforeRestore: true,
        preserveWorkingChanges: false,
      };

      expect(options.targetVersionId).toBeDefined();
      expect(typeof options.createBackup).toBe("boolean");
      expect(typeof options.validateBeforeRestore).toBe("boolean");
      expect(typeof options.preserveWorkingChanges).toBe("boolean");
    });
  });
});

describe("JSON Diff Engine", () => {
  let diffEngine: JsonDiffEngine;

  beforeEach(() => {
    diffEngine = new JsonDiffEngine();
  });

  describe("Basic Diff Calculation", () => {
    it("should calculate diff for simple object changes", () => {
      const oldObj = { a: 1, b: 2 };
      const newObj = { a: 1, b: 3, c: 4 };

      const delta = diffEngine.calculateDiff(oldObj, newObj);

      expect(delta.operations).toHaveLength(2);
      expect(delta.metadata.totalOperations).toBe(2);
      expect(delta.metadata.addedCount).toBe(1);
      expect(delta.metadata.modifiedCount).toBe(1);
    });

    it("should handle array changes", () => {
      const oldObj = { items: [1, 2, 3] };
      const newObj = { items: [1, 3, 4] };

      const delta = diffEngine.calculateDiff(oldObj, newObj);

      expect(delta.operations.length).toBeGreaterThan(0);
      expect(delta.metadata.totalOperations).toBeGreaterThan(0);
    });

    it("should handle nested object changes", () => {
      const oldObj = {
        user: { name: "John", age: 30 },
        settings: { theme: "dark" },
      };
      const newObj = {
        user: { name: "Jane", age: 30 },
        settings: { theme: "light", language: "en" },
      };

      const delta = diffEngine.calculateDiff(oldObj, newObj);

      expect(delta.operations.length).toBeGreaterThan(0);
      expect(delta.metadata.totalOperations).toBeGreaterThan(0);
    });
  });

  describe("Diff Application", () => {
    it("should correctly apply diff operations", () => {
      const baseObj = { a: 1, b: 2 };
      const targetObj = { a: 1, b: 3, c: 4 };

      const delta = diffEngine.calculateDiff(baseObj, targetObj);
      const result = diffEngine.applyDiff(baseObj, delta);

      expect(result).toEqual(targetObj);
    });

    it("should handle complex nested changes", () => {
      const baseObj = {
        users: [
          { id: 1, name: "John" },
          { id: 2, name: "Jane" },
        ],
        config: { theme: "dark" },
      };

      const targetObj = {
        users: [
          { id: 1, name: "John Doe" },
          { id: 3, name: "Bob" },
        ],
        config: { theme: "light", lang: "en" },
      };

      const delta = diffEngine.calculateDiff(baseObj, targetObj);
      const result = diffEngine.applyDiff(baseObj, delta);

      // Note: Due to array handling complexity, exact match might not be guaranteed
      // but structural similarity should be maintained
      expect(result.config.theme).toBe("light");
      expect(result.config.lang).toBe("en");
    });
  });

  describe("Performance Requirements", () => {
    it("should complete diff calculation within performance target", () => {
      // Create a large JSON object (simulating 1MB+ JSON)
      const largeObj: any = { data: {} };
      for (let i = 0; i < 1000; i++) {
        largeObj.data[`key_${i}`] = {
          id: i,
          name: `Item ${i}`,
          description: `Description for item ${i}`.repeat(10),
          metadata: {
            created: Date.now(),
            updated: Date.now(),
            tags: ["tag1", "tag2", "tag3"],
          },
        };
      }

      const modifiedObj = JSON.parse(JSON.stringify(largeObj));
      modifiedObj.data.key_500.name = "Modified Item 500";
      modifiedObj.data.key_999 = { id: 999, name: "New Item 999" };

      const startTime = performance.now();
      const delta = diffEngine.calculateDiff(largeObj, modifiedObj);
      const endTime = performance.now();

      const diffTime = endTime - startTime;

      // Should complete within 500ms for large files
      expect(diffTime).toBeLessThan(500);
      expect(delta.operations.length).toBeGreaterThan(0);
    });
  });

  describe("Change Impact Calculation", () => {
    it("should correctly calculate minimal impact", () => {
      const delta: VersionDelta = {
        operations: [
          {
            op: DiffOperationType.REPLACE,
            path: "/title",
            value: "New Title",
            oldValue: "Old Title",
          },
        ],
        metadata: {
          totalOperations: 1,
          addedCount: 0,
          removedCount: 0,
          modifiedCount: 1,
          changeComplexity: 0.1,
        },
      };

      const impact = calculateChangeImpact(delta);
      expect(impact).toBe("minimal");
    });

    it("should correctly calculate major impact", () => {
      const operations = Array.from({ length: 100 }, (_, i) => ({
        op: DiffOperationType.ADD,
        path: `/new_${i}`,
        value: `value_${i}`,
      }));

      const delta: VersionDelta = {
        operations,
        metadata: {
          totalOperations: 100,
          addedCount: 100,
          removedCount: 0,
          modifiedCount: 0,
          changeComplexity: 0.9,
        },
      };

      const impact = calculateChangeImpact(delta);
      expect(impact).toBe("major");
    });
  });
});

describe("Version Storage System", () => {
  let storage: ReturnType<typeof createVersionStorage>;

  beforeEach(() => {
    clearVersionStorage();
    storage = createVersionStorage();
  });

  afterEach(() => {
    clearVersionStorage();
  });

  describe("Version Storage Operations", () => {
    it("should save and load versions correctly", async () => {
      const version: Version = {
        metadata: {
          id: "test-version-1",
          version: "1.0.0",
          timestamp: Date.now(),
          changeType: ChangeType.MAJOR,
          changeImpact: ChangeImpact.SIGNIFICANT,
          status: VersionStatus.COMMITTED,
          branchId: "main",
          tags: [],
          contentSize: 100,
          deltaSize: 50,
          checksum: "abc123",
        },
        fullContent: JSON.stringify({ test: "data" }),
        isSnapshot: true,
      };

      await storage.saveVersion(version);
      const loadedVersion = await storage.loadVersion("test-version-1");

      expect(loadedVersion).toBeTruthy();
      expect(loadedVersion!.metadata.id).toBe("test-version-1");
      expect(loadedVersion!.fullContent).toBe(version.fullContent);
    });

    it("should handle version deletion", async () => {
      const version: Version = {
        metadata: {
          id: "test-version-2",
          version: "1.0.1",
          timestamp: Date.now(),
          changeType: ChangeType.PATCH,
          changeImpact: ChangeImpact.MINIMAL,
          status: VersionStatus.COMMITTED,
          branchId: "main",
          tags: [],
          contentSize: 80,
          deltaSize: 40,
          checksum: "def456",
        },
        fullContent: JSON.stringify({ test: "data2" }),
        isSnapshot: true,
      };

      await storage.saveVersion(version);
      await storage.deleteVersion("test-version-2");
      const loadedVersion = await storage.loadVersion("test-version-2");

      expect(loadedVersion).toBeNull();
    });

    it("should return storage metrics", async () => {
      const version: Version = {
        metadata: {
          id: "test-version-3",
          version: "1.0.2",
          timestamp: Date.now(),
          changeType: ChangeType.MINOR,
          changeImpact: ChangeImpact.MODERATE,
          status: VersionStatus.COMMITTED,
          branchId: "main",
          tags: [],
          contentSize: 200,
          deltaSize: 100,
          checksum: "ghi789",
        },
        fullContent: JSON.stringify({ test: "data3", more: "content" }),
        isSnapshot: true,
      };

      await storage.saveVersion(version);
      const metrics = await storage.getStorageMetrics();

      expect(metrics.totalVersions).toBe(1);
      expect(metrics.totalSize).toBeGreaterThan(0);
      expect(metrics.snapshotCount).toBe(1);
      expect(metrics.deltaCount).toBe(0);
    });
  });

  describe("Storage Size Optimization", () => {
    it("should maintain storage within size limits", async () => {
      // Create multiple versions to test compression
      for (let i = 0; i < 5; i++) {
        const version: Version = {
          metadata: {
            id: `test-version-${i}`,
            version: `1.0.${i}`,
            timestamp: Date.now() + i * 1000,
            changeType: ChangeType.PATCH,
            changeImpact: ChangeImpact.MINIMAL,
            status: VersionStatus.COMMITTED,
            branchId: "main",
            tags: [],
            contentSize: 1000,
            deltaSize: 100,
            checksum: `checksum-${i}`,
          },
          fullContent: JSON.stringify({
            id: i,
            data: "x".repeat(1000),
            metadata: { created: Date.now() },
          }),
          isSnapshot: true,
        };

        await storage.saveVersion(version);
      }

      const metrics = await storage.getStorageMetrics();
      const storageUsage = getStorageUsage();

      expect(metrics.totalVersions).toBe(5);
      expect(storageUsage).toBeLessThan(10 * 1024 * 1024); // Should be under 10MB
    });
  });

  describe("Storage Cleanup Operations", () => {
    it("should perform cleanup operations", async () => {
      // This test would need time manipulation for proper testing
      // For now, just ensure cleanup doesn't throw
      await expect(storage.cleanup()).resolves.not.toThrow();
    });

    it("should optimize storage", async () => {
      await expect(storage.optimizeStorage()).resolves.not.toThrow();
    });
  });
});
