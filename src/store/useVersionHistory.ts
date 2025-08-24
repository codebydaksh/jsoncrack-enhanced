/**
 * Version History Store
 * Main state management for version history system using Zustand
 */
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { JsonDiffEngine, calculateChangeImpact } from "../lib/utils/jsonDiffEngine";
import { createVersionStorage } from "../lib/utils/versionStorage";
import type {
  Version,
  VersionId,
  BranchId,
  TagId,
  Branch,
  VersionTag,
  VersionMetadata,
  VersionDelta,
  VersionHistoryConfig,
  VersionSearchCriteria,
  VersionSearchResult,
  RestoreOptions,
  RestoreResult,
  StorageMetrics,
  PerformanceMetrics,
} from "../types/versionHistory";
import { ChangeType, ChangeImpact, VersionStatus } from "../types/versionHistory";

interface VersionHistoryState {
  // Current state
  currentContent: string;
  currentVersionId: VersionId | null;
  hasUnsavedChanges: boolean;

  // Storage backend
  storage: ReturnType<typeof createVersionStorage>;
  diffEngine: JsonDiffEngine;

  // Configuration
  config: VersionHistoryConfig;

  // Cached data
  versions: VersionMetadata[];
  branches: Branch[];
  tags: VersionTag[];
  storageMetrics: StorageMetrics | null;
  performanceMetrics: PerformanceMetrics | null;

  // UI state
  isTimelineOpen: boolean;
  selectedVersionForDiff: VersionId | null;
  isLoading: boolean;
  error: string | null;
}

interface VersionHistoryActions {
  // Content management
  setCurrentContent: (content: string) => void;
  markUnsavedChanges: (hasChanges: boolean) => void;

  // Version management
  createVersion: (content: string, metadata?: Partial<VersionMetadata>) => Promise<Version>;
  restoreVersion: (options: RestoreOptions) => Promise<RestoreResult>;
  deleteVersion: (versionId: VersionId) => Promise<void>;

  // Diff and comparison
  diffVersions: (version1Id: VersionId, version2Id: VersionId) => Promise<VersionDelta>;
  getVersionContent: (versionId: VersionId) => Promise<string | null>;

  // Search and filtering
  searchVersions: (criteria: VersionSearchCriteria) => Promise<VersionSearchResult>;
  getVersionHistory: () => Promise<VersionMetadata[]>;

  // Branch management
  createBranch: (name: string, description?: string) => Promise<Branch>;
  deleteBranch: (branchId: BranchId) => Promise<void>;
  switchBranch: (branchId: BranchId) => Promise<void>;

  // Tag management
  createTag: (versionId: VersionId, name: string, type?: VersionTag["type"]) => Promise<VersionTag>;
  deleteTag: (tagId: TagId) => Promise<void>;

  // Metrics and performance
  getMetrics: () => Promise<StorageMetrics>;
  getPerformanceMetrics: () => Promise<PerformanceMetrics>;

  // Configuration
  updateConfig: (config: Partial<VersionHistoryConfig>) => void;

  // UI actions
  toggleTimeline: () => void;
  setSelectedVersionForDiff: (versionId: VersionId | null) => void;

  // Utility actions
  optimizeStorage: () => Promise<void>;
  exportVersionHistory: () => Promise<string>;
  importVersionHistory: (data: string) => Promise<void>;

  // Auto-save functionality
  enableAutoSave: () => void;
  disableAutoSave: () => void;
}

type VersionHistoryStore = VersionHistoryState & VersionHistoryActions;

const DEFAULT_CONFIG: VersionHistoryConfig = {
  maxVersions: 100,
  maxStorageSize: 10 * 1024 * 1024, // 10MB
  autoSaveInterval: 30000, // 30 seconds
  compressionLevel: 6,
  snapshotInterval: 10,
  enableBranching: true,
  enableTagging: true,
};

const DEFAULT_BRANCH_ID = "main";

let autoSaveInterval: NodeJS.Timeout | null = null;

export const useVersionHistory = create<VersionHistoryStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentContent: "",
    currentVersionId: null,
    hasUnsavedChanges: false,

    storage: createVersionStorage(),
    diffEngine: new JsonDiffEngine(),

    config: DEFAULT_CONFIG,

    versions: [],
    branches: [],
    tags: [],
    storageMetrics: null,
    performanceMetrics: null,

    isTimelineOpen: false,
    selectedVersionForDiff: null,
    isLoading: false,
    error: null,

    // Content management
    setCurrentContent: (content: string) => {
      set({ currentContent: content });

      // Check if we should auto-save
      const state = get();
      if (state.config.autoSaveInterval > 0) {
        get().markUnsavedChanges(true);
      }
    },

    markUnsavedChanges: (hasChanges: boolean) => {
      set({ hasUnsavedChanges: hasChanges });
    },

    // Version management
    createVersion: async (content: string, metadata = {}) => {
      set({ isLoading: true, error: null });

      try {
        const state = get();
        const versionId = generateVersionId();
        const timestamp = Date.now();

        // Calculate diff from previous version
        let delta: VersionDelta | undefined;
        let changeType: ChangeType = ChangeType.AUTO;
        let changeImpact: ChangeImpact = ChangeImpact.MINIMAL;

        if (state.currentVersionId) {
          const previousContent = await get().getVersionContent(state.currentVersionId);
          if (previousContent) {
            try {
              const oldObj = JSON.parse(previousContent);
              const newObj = JSON.parse(content);
              delta = await state.diffEngine.calculateDiff(oldObj, newObj);
              changeImpact = calculateChangeImpact(delta) as ChangeImpact;

              // Determine change type based on impact
              if (changeImpact === ChangeImpact.MAJOR) {
                changeType = ChangeType.MAJOR;
              } else if (changeImpact === ChangeImpact.SIGNIFICANT) {
                changeType = ChangeType.MINOR;
              } else {
                changeType = ChangeType.PATCH;
              }
            } catch (error) {
              // If JSON parsing fails, treat as text diff
              console.warn("Failed to parse JSON for diff, treating as text:", error);
            }
          }
        }

        const versionMetadata: VersionMetadata = {
          id: versionId,
          version: generateVersionNumber(state.versions.length),
          timestamp,
          message: metadata.message,
          changeType: metadata.changeType || changeType,
          changeImpact: metadata.changeImpact || changeImpact,
          status: metadata.status || VersionStatus.COMMITTED,
          branchId: metadata.branchId || DEFAULT_BRANCH_ID,
          parentId: state.currentVersionId || undefined,
          tags: metadata.tags || [],
          contentSize: content.length,
          deltaSize: delta ? JSON.stringify(delta).length : content.length,
          author: metadata.author,
          checksum: generateChecksum(content),
        };

        const version: Version = {
          metadata: versionMetadata,
          delta,
          fullContent: !state.currentVersionId ? content : undefined, // First version gets full content
          isSnapshot: !state.currentVersionId || changeType === ChangeType.MAJOR,
        };

        await state.storage.saveVersion(version);

        // Update state
        set({
          currentVersionId: versionId,
          hasUnsavedChanges: false,
          versions: [versionMetadata, ...state.versions],
        });

        // Refresh metrics
        await get().getMetrics();

        return version;
      } catch (error) {
        set({ error: `Failed to create version: ${error}` });
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },

    restoreVersion: async (options: RestoreOptions) => {
      set({ isLoading: true, error: null });

      try {
        const state = get();
        const version = await state.storage.loadVersion(options.targetVersionId);

        if (!version) {
          throw new Error(`Version ${options.targetVersionId} not found`);
        }

        let restoredContent: string;

        if (version.fullContent) {
          restoredContent = version.fullContent;
        } else if (version.delta) {
          // Reconstruct content from deltas
          restoredContent = await reconstructContentFromDeltas(
            options.targetVersionId,
            state.storage,
            state.diffEngine
          );
        } else {
          throw new Error("Version has no content or delta");
        }

        // Validate JSON if requested
        if (options.validateBeforeRestore) {
          try {
            JSON.parse(restoredContent);
          } catch (error) {
            throw new Error(`Restored content is not valid JSON: ${error}`);
          }
        }

        // Create backup if requested
        let backupVersionId: VersionId | undefined;
        if (options.createBackup && state.currentContent) {
          const backup = await get().createVersion(state.currentContent, {
            message: `Backup before restoring to ${version.metadata.version}`,
          });
          backupVersionId = backup.metadata.id;
        }

        // Update current content
        set({
          currentContent: restoredContent,
          currentVersionId: options.targetVersionId,
          hasUnsavedChanges: false,
        });

        return {
          success: true,
          restoredContent,
          backupVersionId,
        };
      } catch (error) {
        const errorMessage = `Failed to restore version: ${error}`;
        set({ error: errorMessage });
        return {
          success: false,
          errors: [errorMessage],
        };
      } finally {
        set({ isLoading: false });
      }
    },

    deleteVersion: async (versionId: VersionId) => {
      set({ isLoading: true, error: null });

      try {
        const state = get();
        await state.storage.deleteVersion(versionId);

        // Update state
        set({
          versions: state.versions.filter(v => v.id !== versionId),
          currentVersionId: state.currentVersionId === versionId ? null : state.currentVersionId,
        });

        // Refresh metrics
        await get().getMetrics();
      } catch (error) {
        set({ error: `Failed to delete version: ${error}` });
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },

    // Diff and comparison
    diffVersions: async (version1Id: VersionId, version2Id: VersionId) => {
      const state = get();

      const [content1, content2] = await Promise.all([
        get().getVersionContent(version1Id),
        get().getVersionContent(version2Id),
      ]);

      if (!content1 || !content2) {
        throw new Error("Could not load version content for comparison");
      }

      try {
        const obj1 = JSON.parse(content1);
        const obj2 = JSON.parse(content2);
        return await state.diffEngine.calculateDiff(obj1, obj2);
      } catch (error) {
        throw new Error(`Failed to parse JSON for diff: ${error}`);
      }
    },

    getVersionContent: async (versionId: VersionId) => {
      const state = get();
      const version = await state.storage.loadVersion(versionId);

      if (!version) {
        return null;
      }

      if (version.fullContent) {
        return version.fullContent;
      }

      if (version.delta) {
        return await reconstructContentFromDeltas(versionId, state.storage, state.diffEngine);
      }

      return null;
    },

    // Search and filtering
    searchVersions: async (criteria: VersionSearchCriteria) => {
      const state = get();
      let filteredVersions = [...state.versions];

      // Apply filters
      if (criteria.messageContains) {
        const searchTerm = criteria.messageContains.toLowerCase();
        filteredVersions = filteredVersions.filter(v =>
          v.message?.toLowerCase().includes(searchTerm)
        );
      }

      if (criteria.branchIds && criteria.branchIds.length > 0) {
        filteredVersions = filteredVersions.filter(v => criteria.branchIds!.includes(v.branchId));
      }

      if (criteria.changeTypes && criteria.changeTypes.length > 0) {
        filteredVersions = filteredVersions.filter(v =>
          criteria.changeTypes!.includes(v.changeType)
        );
      }

      if (criteria.dateRange) {
        const start = criteria.dateRange.start.getTime();
        const end = criteria.dateRange.end.getTime();
        filteredVersions = filteredVersions.filter(v => v.timestamp >= start && v.timestamp <= end);
      }

      if (criteria.tags && criteria.tags.length > 0) {
        filteredVersions = filteredVersions.filter(v =>
          v.tags.some(tag => criteria.tags!.includes(tag))
        );
      }

      // Apply sorting
      if (criteria.sortBy) {
        filteredVersions.sort((a, b) => {
          let comparison = 0;

          switch (criteria.sortBy) {
            case "timestamp":
              comparison = a.timestamp - b.timestamp;
              break;
            case "version":
              comparison = a.version.localeCompare(b.version);
              break;
            case "changeImpact":
              const impactOrder = { minimal: 0, moderate: 1, significant: 2, major: 3 };
              comparison = impactOrder[a.changeImpact] - impactOrder[b.changeImpact];
              break;
          }

          return criteria.sortOrder === "desc" ? -comparison : comparison;
        });
      }

      // Apply pagination
      const offset = criteria.offset || 0;
      const limit = criteria.limit || filteredVersions.length;
      const paginatedVersions = filteredVersions.slice(offset, offset + limit);

      // Load full versions
      const versions = await Promise.all(
        paginatedVersions.map(async metadata => {
          const version = await state.storage.loadVersion(metadata.id);
          return version!;
        })
      );

      return {
        versions,
        totalCount: filteredVersions.length,
        hasMore: offset + limit < filteredVersions.length,
      };
    },

    getVersionHistory: async () => {
      const state = get();
      const versions = await state.storage.getVersionList();
      set({ versions });
      return versions;
    },

    // Branch management
    createBranch: async (name: string, description?: string) => {
      const branchId = generateBranchId();
      const state = get();

      const branch: Branch = {
        id: branchId,
        name,
        description,
        headVersionId: state.currentVersionId || "",
        color: generateBranchColor(),
        createdAt: Date.now(),
        isDefault: false,
      };

      set({ branches: [...state.branches, branch] });
      return branch;
    },

    deleteBranch: async (branchId: BranchId) => {
      const state = get();
      set({ branches: state.branches.filter(b => b.id !== branchId) });
    },

    switchBranch: async (branchId: BranchId) => {
      const state = get();
      const branch = state.branches.find(b => b.id === branchId);
      if (branch && branch.headVersionId) {
        const result = await get().restoreVersion({
          targetVersionId: branch.headVersionId,
          createBackup: true,
        });

        if (!result.success) {
          throw new Error("Failed to switch branch");
        }
      }
    },

    // Tag management
    createTag: async (versionId: VersionId, name: string, type = "custom" as const) => {
      const tagId = generateTagId();
      const state = get();

      const tag: VersionTag = {
        id: tagId,
        name,
        versionId,
        type,
        createdAt: Date.now(),
      };

      set({ tags: [...state.tags, tag] });
      return tag;
    },

    deleteTag: async (tagId: TagId) => {
      const state = get();
      set({ tags: state.tags.filter(t => t.id !== tagId) });
    },

    // Metrics and performance
    getMetrics: async () => {
      const state = get();
      const metrics = await state.storage.getStorageMetrics();
      set({ storageMetrics: metrics });
      return metrics;
    },

    getPerformanceMetrics: async () => {
      // Implementation would track real performance metrics
      const metrics: PerformanceMetrics = {
        averageCompressionTime: 50,
        averageDecompressionTime: 30,
        averageDiffTime: 25,
        cacheHitRate: 0.85,
        memoryUsage: 1024 * 1024, // 1MB
      };

      set({ performanceMetrics: metrics });
      return metrics;
    },

    // Configuration
    updateConfig: (newConfig: Partial<VersionHistoryConfig>) => {
      const state = get();
      set({ config: { ...state.config, ...newConfig } });
    },

    // UI actions
    toggleTimeline: () => {
      const state = get();
      set({ isTimelineOpen: !state.isTimelineOpen });
    },

    setSelectedVersionForDiff: (versionId: VersionId | null) => {
      set({ selectedVersionForDiff: versionId });
    },

    // Utility actions
    optimizeStorage: async () => {
      const state = get();
      await state.storage.optimizeStorage();
      await get().getMetrics();
    },

    exportVersionHistory: async () => {
      const state = get();
      const versions = await state.storage.getVersionList();

      const exportData = {
        versions,
        branches: state.branches,
        tags: state.tags,
        config: state.config,
        exportedAt: Date.now(),
      };

      return JSON.stringify(exportData, null, 2);
    },

    importVersionHistory: async (data: string) => {
      try {
        const importData = JSON.parse(data);

        // Validate import data structure
        if (!importData.versions || !Array.isArray(importData.versions)) {
          throw new Error("Invalid import data format");
        }

        // Import data (simplified implementation)
        set({
          versions: importData.versions,
          branches: importData.branches || [],
          tags: importData.tags || [],
          config: { ...get().config, ...importData.config },
        });
      } catch (error) {
        throw new Error(`Failed to import version history: ${error}`);
      }
    },

    // Auto-save functionality
    enableAutoSave: () => {
      const state = get();

      if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
      }

      autoSaveInterval = setInterval(async () => {
        const currentState = get();
        if (currentState.hasUnsavedChanges && currentState.currentContent) {
          try {
            await get().createVersion(currentState.currentContent, {
              message: "Auto-save",
              changeType: ChangeType.AUTO,
            });
          } catch (error) {
            console.error("Auto-save failed:", error);
          }
        }
      }, state.config.autoSaveInterval);
    },

    disableAutoSave: () => {
      if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
      }
    },
  }))
);

// Utility functions
function generateVersionId(): VersionId {
  return `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateBranchId(): BranchId {
  return `b_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateTagId(): TagId {
  return `t_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateVersionNumber(count: number): string {
  const major = Math.floor(count / 100);
  const minor = Math.floor((count % 100) / 10);
  const patch = count % 10;
  return `${major}.${minor}.${patch}`;
}

function generateChecksum(content: string): string {
  // Simple hash function for checksum
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

function generateBranchColor(): string {
  const colors = ["#3498db", "#e74c3c", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c"];
  return colors[Math.floor(Math.random() * colors.length)];
}

async function reconstructContentFromDeltas(
  targetVersionId: VersionId,
  storage: ReturnType<typeof createVersionStorage>,
  diffEngine: JsonDiffEngine
): Promise<string> {
  // Find the chain of versions leading to the target
  const versionChain: Version[] = [];
  let currentVersionId: VersionId | null = targetVersionId;

  while (currentVersionId) {
    const version = await storage.loadVersion(currentVersionId);
    if (!version) {
      throw new Error(`Version ${currentVersionId} not found`);
    }

    versionChain.unshift(version);

    if (version.fullContent) {
      // Found a snapshot, stop here
      break;
    }

    currentVersionId = version.metadata.parentId || null;
  }

  // Start with the snapshot content
  const baseVersion = versionChain[0];
  if (!baseVersion.fullContent) {
    throw new Error("No snapshot found in version chain");
  }

  let content = JSON.parse(baseVersion.fullContent);

  // Apply deltas in sequence
  for (let i = 1; i < versionChain.length; i++) {
    const version = versionChain[i];
    if (version.delta) {
      content = diffEngine.applyDiff(content, version.delta);
    }
  }

  return JSON.stringify(content, null, 2);
}

export default useVersionHistory;
