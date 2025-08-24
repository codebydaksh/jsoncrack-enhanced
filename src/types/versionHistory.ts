/**
 * Version History System Types
 * Core type definitions for the version management system
 */

// Basic identifiers
export type VersionId = string;
export type BranchId = string;
export type TagId = string;

// Enums for version management
export enum ChangeType {
  MAJOR = "major",
  MINOR = "minor",
  PATCH = "patch",
  AUTO = "auto",
}

export enum ChangeImpact {
  MINIMAL = "minimal",
  MODERATE = "moderate",
  SIGNIFICANT = "significant",
  MAJOR = "major",
}

export enum VersionStatus {
  DRAFT = "draft",
  COMMITTED = "committed",
  TAGGED = "tagged",
  ARCHIVED = "archived",
}

export enum DiffOperationType {
  ADD = "add",
  REMOVE = "remove",
  REPLACE = "replace",
  MOVE = "move",
  COPY = "copy",
}

// Core interfaces
export interface VersionMetadata {
  id: VersionId;
  version: string;
  timestamp: number;
  message?: string;
  changeType: ChangeType;
  changeImpact: ChangeImpact;
  status: VersionStatus;
  branchId: BranchId;
  parentId?: VersionId;
  tags: TagId[];
  contentSize: number;
  deltaSize: number;
  author?: string;
  checksum: string;
}

export interface DiffOperation {
  op: DiffOperationType;
  path: string;
  value?: any;
  oldValue?: any;
  from?: string;
}

export interface VersionDelta {
  operations: DiffOperation[];
  metadata: {
    totalOperations: number;
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
    changeComplexity: number;
  };
}

export interface Version {
  metadata: VersionMetadata;
  delta?: VersionDelta;
  fullContent?: string;
  isSnapshot: boolean;
}

export interface Branch {
  id: BranchId;
  name: string;
  description?: string;
  headVersionId: VersionId;
  color: string;
  createdAt: number;
  isDefault: boolean;
}

export interface VersionTag {
  id: TagId;
  name: string;
  description?: string;
  versionId: VersionId;
  color?: string;
  type: "release" | "milestone" | "feature" | "custom";
  createdAt: number;
}

// Storage and performance interfaces
export interface StorageMetrics {
  totalVersions: number;
  totalSize: number;
  compressionRatio: number;
  storageUsed: number;
  snapshotCount: number;
  deltaCount: number;
  // Additional metrics for detailed analysis
  originalSize?: number;
  compressionEfficiency?: number;
  compressedVersions?: number;
  averageVersionSize?: number;
}

export interface PerformanceMetrics {
  averageCompressionTime: number;
  averageDecompressionTime: number;
  averageDiffTime: number;
  cacheHitRate: number;
  memoryUsage: number;
}

// Configuration
export interface VersionHistoryConfig {
  maxVersions: number;
  maxStorageSize: number;
  autoSaveInterval: number;
  compressionLevel: number;
  snapshotInterval: number;
  enableBranching: boolean;
  enableTagging: boolean;
}

// Search and filtering
export interface VersionSearchCriteria {
  messageContains?: string;
  branchIds?: BranchId[];
  changeTypes?: ChangeType[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: TagId[];
  sortBy?: "timestamp" | "version" | "changeImpact";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface VersionSearchResult {
  versions: Version[];
  totalCount: number;
  hasMore: boolean;
}

// Restoration and operations
export interface RestoreOptions {
  targetVersionId: VersionId;
  createBackup?: boolean;
  validateBeforeRestore?: boolean;
  preserveWorkingChanges?: boolean;
}

export interface RestoreResult {
  success: boolean;
  restoredContent?: string;
  backupVersionId?: VersionId;
  errors?: string[];
  warnings?: string[];
}

// Events
export enum VersionHistoryEvent {
  VERSION_CREATED = "version_created",
  VERSION_RESTORED = "version_restored",
  VERSION_DELETED = "version_deleted",
  BRANCH_CREATED = "branch_created",
  TAG_CREATED = "tag_created",
  STORAGE_OPTIMIZED = "storage_optimized",
}

export interface VersionHistoryEventPayload {
  event: VersionHistoryEvent;
  versionId?: VersionId;
  branchId?: BranchId;
  tagId?: TagId;
  timestamp: number;
  data?: any;
}

// Storage backend interface
export interface VersionStorageBackend {
  saveVersion(version: Version): Promise<void>;
  loadVersion(id: VersionId): Promise<Version | null>;
  deleteVersion(id: VersionId): Promise<void>;
  getVersionList(): Promise<VersionMetadata[]>;
  getStorageMetrics(): Promise<StorageMetrics>;
  optimizeStorage(): Promise<void>;
  cleanup(): Promise<void>;
}

/**
 * Version history manager interface
 */
export interface VersionHistoryManager {
  // Configuration
  getConfig(): VersionHistoryConfig;
  updateConfig(config: Partial<VersionHistoryConfig>): void;

  // Version management
  createVersion(content: string, metadata?: Partial<VersionMetadata>): Promise<Version>;
  restoreVersion(options: RestoreOptions): Promise<RestoreResult>;
  deleteVersion(id: VersionId): Promise<void>;

  // Content operations
  getCurrentContent(): string;
  getVersionContent(id: VersionId): Promise<string>;
  diffVersions(v1: VersionId, v2: VersionId): Promise<DiffOperation[]>;

  // Branch operations
  createBranch(name: string, baseVersionId?: VersionId): Promise<Branch>;
  switchBranch(branchId: BranchId): Promise<void>;
  mergeBranch(sourceBranchId: BranchId, targetBranchId: BranchId): Promise<Version>;
  deleteBranch(branchId: BranchId): Promise<void>;

  // Tag operations
  createTag(name: string, versionId: VersionId, type?: VersionTag["type"]): Promise<VersionTag>;
  deleteTag(tagId: TagId): Promise<void>;

  // Search and navigation
  searchVersions(criteria: VersionSearchCriteria): Promise<VersionSearchResult>;
  getVersionHistory(branchId?: BranchId): Promise<VersionMetadata[]>;

  // Performance and maintenance
  getMetrics(): Promise<PerformanceMetrics>;
  cleanup(): Promise<void>;

  // Events
  addEventListener(
    event: VersionHistoryEvent,
    callback: (payload: VersionHistoryEventPayload) => void
  ): void;
  removeEventListener(
    event: VersionHistoryEvent,
    callback: (payload: VersionHistoryEventPayload) => void
  ): void;
}
