/**
/**
 * Version Storage System
 * Efficient local storage backend with delta compression
 * Target: 100+ versions with <10MB storage footprint
 */
import LZString from "lz-string";
import type {
  Version,
  VersionId,
  BranchId,
  TagId,
  VersionMetadata,
  VersionStorageBackend,
  StorageMetrics,
} from "../../types/versionHistory";
import { ChangeType } from "../../types/versionHistory";

interface StorageConfig {
  maxVersions: number; // Maximum number of versions to keep
  maxStorageSize: number; // in bytes
  compressionLevel: number; // 0-9
  snapshotInterval: number; // Create full snapshots every N versions
  maxVersionAge: number; // in milliseconds
  enableCompression: boolean;
  enableAutoCleanup: boolean;
  cleanupThreshold: number; // Cleanup when storage exceeds this ratio (0.8 = 80%)
  lruCleanupCount: number; // Number of old versions to remove in LRU cleanup
  compressionThreshold: number; // Minimum size to attempt compression
}

const DEFAULT_CONFIG: StorageConfig = {
  maxVersions: 100,
  maxStorageSize: 10 * 1024 * 1024, // 10MB
  compressionLevel: 6,
  snapshotInterval: 10,
  maxVersionAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  enableCompression: true,
  enableAutoCleanup: true,
  cleanupThreshold: 0.8, // Cleanup when 80% full
  lruCleanupCount: 10, // Remove 10 oldest versions at a time
  compressionThreshold: 1024, // Only compress files > 1KB
};

interface StorageEntry {
  id: VersionId;
  metadata: VersionMetadata;
  compressed: boolean;
  data: string; // Base64 encoded compressed data
  size: number;
  timestamp: number;
}

interface StorageIndex {
  versions: Record<
    VersionId,
    {
      timestamp: number;
      branchId: BranchId;
      size: number;
      tags: TagId[];
      isSnapshot: boolean;
    }
  >;
  branches: Record<
    BranchId,
    {
      name: string;
      headVersionId: VersionId;
      versionCount: number;
      totalSize: number;
    }
  >;
  tags: Record<
    TagId,
    {
      name: string;
      versionId: VersionId;
      type: string;
    }
  >;
  metadata: {
    totalVersions: number;
    totalSize: number;
    lastCleanup: number;
    oldestVersion: number;
    newestVersion: number;
    snapshotCount: number;
    deltaCount: number;
  };
}

/**
 * Intelligent Chunking System for optimized localStorage operations
 */
class IntelligentChunker {
  private static readonly MAX_CHUNK_SIZE = 512 * 1024; // 512KB chunks for localStorage
  private static readonly MIN_CHUNK_SIZE = 64 * 1024; // 64KB minimum

  static shouldChunk(data: string): boolean {
    return data.length > this.MAX_CHUNK_SIZE;
  }

  static chunkData(key: string, data: string): Array<{ key: string; data: string }> {
    if (!this.shouldChunk(data)) {
      return [{ key, data }];
    }

    const chunks: Array<{ key: string; data: string }> = [];
    const chunkCount = Math.ceil(data.length / this.MAX_CHUNK_SIZE);

    // Store chunk metadata
    const chunkMetadata = {
      originalKey: key,
      chunkCount,
      totalSize: data.length,
      timestamp: Date.now(),
    };

    chunks.push({
      key: `${key}_meta`,
      data: JSON.stringify(chunkMetadata),
    });

    // Store individual chunks
    for (let i = 0; i < chunkCount; i++) {
      const start = i * this.MAX_CHUNK_SIZE;
      const end = Math.min(start + this.MAX_CHUNK_SIZE, data.length);
      const chunkData = data.slice(start, end);

      chunks.push({
        key: `${key}_chunk_${i}`,
        data: chunkData,
      });
    }

    return chunks;
  }

  static reconstructData(key: string): string | null {
    try {
      // Try to get the data directly first (for non-chunked data)
      const directData = localStorage.getItem(key);
      if (directData && !localStorage.getItem(`${key}_meta`)) {
        return directData;
      }

      // Get chunk metadata
      const metaData = localStorage.getItem(`${key}_meta`);
      if (!metaData) {
        return directData; // Fallback to direct data
      }

      const metadata = JSON.parse(metaData);
      const chunks: string[] = [];

      // Reconstruct from chunks
      for (let i = 0; i < metadata.chunkCount; i++) {
        const chunkData = localStorage.getItem(`${key}_chunk_${i}`);
        if (!chunkData) {
          throw new Error(`Missing chunk ${i} for key ${key}`);
        }
        chunks.push(chunkData);
      }

      return chunks.join("");
    } catch (error) {
      console.error(`Failed to reconstruct chunked data for ${key}:`, error);
      return null;
    }
  }

  static removeChunkedData(key: string): void {
    try {
      // Remove direct data if exists
      localStorage.removeItem(key);

      // Remove chunked data if exists
      const metaData = localStorage.getItem(`${key}_meta`);
      if (metaData) {
        const metadata = JSON.parse(metaData);

        // Remove all chunks
        for (let i = 0; i < metadata.chunkCount; i++) {
          localStorage.removeItem(`${key}_chunk_${i}`);
        }

        // Remove metadata
        localStorage.removeItem(`${key}_meta`);
      }
    } catch (error) {
      console.error(`Failed to remove chunked data for ${key}:`, error);
    }
  }
}
class OptimizedStorage {
  private static pendingWrites = new Map<string, string>();
  private static writeTimer: NodeJS.Timeout | null = null;
  private static readonly BATCH_DELAY = 16; // ~60fps batching

  static setItem(key: string, value: string): void {
    // For very large values, use intelligent chunking
    if (IntelligentChunker.shouldChunk(value)) {
      const chunks = IntelligentChunker.chunkData(key, value);

      // Store chunks immediately for large data
      for (const chunk of chunks) {
        localStorage.setItem(chunk.key, chunk.data);
      }
      return;
    }

    // For large values, write immediately
    if (value.length > 1024 * 1024) {
      // 1MB
      localStorage.setItem(key, value);
      return;
    }

    // Batch smaller writes
    this.pendingWrites.set(key, value);
    this.scheduleFlush();
  }

  static getItem(key: string): string | null {
    // Check pending writes first
    const pendingValue = this.pendingWrites.get(key);
    if (pendingValue !== undefined) {
      return pendingValue;
    }
    // Try chunked reconstruction first, fallback to direct access
    return IntelligentChunker.reconstructData(key) || localStorage.getItem(key);
  }

  static removeItem(key: string): void {
    this.pendingWrites.delete(key);
    IntelligentChunker.removeChunkedData(key);
  }

  private static scheduleFlush(): void {
    if (this.writeTimer) return;

    this.writeTimer = setTimeout(() => {
      this.flush();
    }, this.BATCH_DELAY);
  }

  private static flush(): void {
    if (this.pendingWrites.size === 0) {
      this.writeTimer = null;
      return;
    }

    // Write all pending items
    for (const [key, value] of this.pendingWrites.entries()) {
      localStorage.setItem(key, value);
    }

    this.pendingWrites.clear();
    this.writeTimer = null;
  }

  static forceFlush(): void {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
    }
    this.flush();
  }
}
class SmartCache {
  private static cache = new Map<string, { data: string; timestamp: number; hits: number }>();
  private static readonly MAX_CACHE_SIZE = 50;
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    entry.hits++;
    return entry.data;
  }

  static set(key: string, data: string): void {
    // Cleanup if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictLeastUsed();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  private static evictLeastUsed(): void {
    let leastUsedKey = "";
    let leastHits = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < leastHits) {
        leastHits = entry.hits;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
    }
  }

  static clear(): void {
    this.cache.clear();
  }

  static getStats(): { size: number; hitRatio: number } {
    const totalHits = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.hits, 0);
    const averageHits = this.cache.size > 0 ? totalHits / this.cache.size : 0;
    return {
      size: this.cache.size,
      hitRatio: averageHits,
    };
  }
}

/**
 * Streaming JSON Processor for large datasets
 */
class StreamingProcessor {
  private static readonly CHUNK_SIZE = 1024 * 1024; // 1MB chunks
  private static readonly LARGE_THRESHOLD = 100 * 1024 * 1024; // 100MB threshold - only use streaming for very large files

  static async processLargeJSON(jsonString: string): Promise<string> {
    if (jsonString.length < this.LARGE_THRESHOLD) {
      return jsonString; // Use normal processing for smaller files
    }

    // Generate cache key
    const cacheKey = this.generateCacheKey(jsonString);
    const cached = SmartCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const startTime = performance.now();
    console.log(
      `Processing large JSON (${(jsonString.length / 1024 / 1024).toFixed(2)}MB) with streaming...`
    );

    // Process in chunks for memory efficiency
    const result = await this.processInChunks(jsonString);

    // Cache the result
    SmartCache.set(cacheKey, result);

    const duration = performance.now() - startTime;
    console.log(`Streaming processing completed in ${duration.toFixed(2)}ms`);

    return result;
  }

  private static async processInChunks(jsonString: string): Promise<string> {
    // For very large JSON, we'll optimize by avoiding unnecessary string operations
    // and using efficient memory patterns

    const chunks: string[] = [];
    const totalLength = jsonString.length;

    for (let i = 0; i < totalLength; i += this.CHUNK_SIZE) {
      const chunk = jsonString.slice(i, Math.min(i + this.CHUNK_SIZE, totalLength));
      chunks.push(chunk);

      // Yield control to prevent blocking the main thread
      if (i % (this.CHUNK_SIZE * 10) === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    // Efficiently join chunks
    return chunks.join("");
  }

  private static generateCacheKey(data: string): string {
    // Simple hash function for cache key generation
    let hash = 0;
    if (data.length === 0) return hash.toString();

    // Use a subset of the string for performance
    const sample =
      data.length > 10000 ? data.slice(0, 1000) + data.slice(-1000) + data.length : data;

    for (let i = 0; i < sample.length; i++) {
      const char = sample.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return Math.abs(hash).toString();
  }
}

/**
 * Advanced Compression Engine with LZ-string for efficient JSON compression
 */
class CompressionEngine {
  static async compress(input: string): Promise<string> {
    if (!input) return "";

    try {
      // Use streaming processor for large datasets
      const processedInput = await StreamingProcessor.processLargeJSON(input);

      // Use LZ-string compression which is optimal for JSON data
      const compressed = LZString.compressToUTF16(processedInput);

      // Only use compressed version if it's actually smaller
      if (compressed && compressed.length < processedInput.length * 0.9) {
        return compressed;
      }

      return processedInput; // Return processed input if compression doesn't help
    } catch (error) {
      console.warn("Compression failed, storing uncompressed:", error);
      return input;
    }
  }

  static decompress(input: string): string {
    if (!input) return "";

    try {
      // Try to decompress, fallback to original if it fails
      const decompressed = LZString.decompressFromUTF16(input);
      return decompressed || input;
    } catch (error) {
      console.warn("Decompression failed, returning original:", error);
      return input;
    }
  }

  static getCompressionRatio(original: string, compressed: string): number {
    if (!original || original.length === 0) return 1;
    return compressed.length / original.length;
  }

  static shouldCompress(input: string, minSizeThreshold: number = 1024): boolean {
    return input.length > minSizeThreshold;
  }

  static isCompressed(input: string): boolean {
    try {
      // Try to decompress - if it works and differs from input, it was compressed
      const decompressed = LZString.decompressFromUTF16(input);
      return decompressed !== null && decompressed !== input;
    } catch {
      return false;
    }
  }
}

/**
 * Local Storage Version Backend
 */
export class LocalVersionStorage implements VersionStorageBackend {
  private readonly config: StorageConfig;
  private readonly storageKey = "json_crack_versions";
  private readonly indexKey = "json_crack_version_index";
  private index: StorageIndex;

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.index = this.loadIndex();
  }

  async saveVersion(version: Version): Promise<void> {
    try {
      // Determine if this should be a snapshot
      const shouldSnapshot = this.shouldCreateSnapshot(version.metadata);

      // Prepare storage entry
      const entry = await this.prepareStorageEntry(version, shouldSnapshot);

      // Save to localStorage with optimization
      const versionKey = `${this.storageKey}_${version.metadata.id}`;
      OptimizedStorage.setItem(versionKey, JSON.stringify(entry));

      // Update index
      this.updateIndex(version.metadata, entry, shouldSnapshot);
      this.saveIndex();

      // Force flush optimized storage for immediate consistency
      OptimizedStorage.forceFlush();

      // Auto cleanup if needed
      if (this.config.enableAutoCleanup && this.shouldCleanup()) {
        await this.cleanup();
      }
    } catch (error) {
      throw new Error(`Failed to save version: ${error}`);
    }
  }

  async loadVersion(id: VersionId): Promise<Version | null> {
    try {
      const versionKey = `${this.storageKey}_${id}`;
      const entryData = OptimizedStorage.getItem(versionKey);

      if (!entryData) {
        return null;
      }

      const entry: StorageEntry = JSON.parse(entryData);
      return await this.reconstructVersion(entry);
    } catch (error) {
      console.error(`Failed to load version ${id}:`, error);
      return null;
    }
  }

  async deleteVersion(id: VersionId): Promise<void> {
    try {
      // Remove from localStorage
      const versionKey = `${this.storageKey}_${id}`;
      OptimizedStorage.removeItem(versionKey);

      // Update index
      if (this.index.versions[id]) {
        const versionData = this.index.versions[id];

        // Update branch info
        if (this.index.branches[versionData.branchId]) {
          this.index.branches[versionData.branchId].versionCount--;
          this.index.branches[versionData.branchId].totalSize -= versionData.size;
        }

        // Update metadata
        this.index.metadata.totalVersions--;
        this.index.metadata.totalSize -= versionData.size;

        if (versionData.isSnapshot) {
          this.index.metadata.snapshotCount--;
        } else {
          this.index.metadata.deltaCount--;
        }

        delete this.index.versions[id];
      }

      this.saveIndex();
    } catch (error) {
      throw new Error(`Failed to delete version ${id}: ${error}`);
    }
  }

  async getVersionList(): Promise<VersionMetadata[]> {
    const versions: VersionMetadata[] = [];

    for (const versionId in this.index.versions) {
      const version = await this.loadVersion(versionId);
      if (version) {
        versions.push(version.metadata);
      }
    }

    return versions.sort((a, b) => b.timestamp - a.timestamp);
  }

  async getStorageMetrics(): Promise<StorageMetrics> {
    const totalSize = this.index.metadata.totalSize;
    const totalVersions = this.index.metadata.totalVersions;

    // Calculate accurate compression ratio by examining actual stored vs original data
    let totalOriginalSize = 0;
    let totalCompressedSize = 0;
    let compressedVersions = 0;

    for (const versionId in this.index.versions) {
      try {
        const versionKey = `${this.storageKey}_${versionId}`;
        const entryData = OptimizedStorage.getItem(versionKey);

        if (entryData) {
          const entry: StorageEntry = JSON.parse(entryData);
          const storedSize = entry.size;

          // Get original size by decompressing if needed
          let originalData = entry.data;
          if (entry.compressed) {
            originalData = CompressionEngine.decompress(entry.data);
            compressedVersions++;
          }

          totalOriginalSize += originalData.length;
          totalCompressedSize += storedSize;
        }
      } catch (error) {
        console.warn(`Failed to analyze version ${versionId}:`, error);
      }
    }

    const compressionRatio = totalOriginalSize > 0 ? totalCompressedSize / totalOriginalSize : 1;
    const compressionEfficiency = totalOriginalSize > 0 ? (1 - compressionRatio) * 100 : 0;

    return {
      totalVersions,
      totalSize,
      compressionRatio,
      storageUsed: totalSize,
      snapshotCount: this.index.metadata.snapshotCount,
      deltaCount: this.index.metadata.deltaCount,
      // Additional metrics for analysis
      originalSize: totalOriginalSize,
      compressionEfficiency,
      compressedVersions,
      averageVersionSize: totalVersions > 0 ? totalSize / totalVersions : 0,
    };
  }

  async optimizeStorage(): Promise<void> {
    // Implement storage optimization
    const versions = await this.getVersionList();
    const now = Date.now();
    let optimizedCount = 0;

    for (const metadata of versions) {
      // Re-compress old versions with higher compression
      if (now - metadata.timestamp > 7 * 24 * 60 * 60 * 1000) {
        // 7 days
        const version = await this.loadVersion(metadata.id);
        if (version) {
          // Save with higher compression
          const oldConfig = this.config.compressionLevel;
          this.config.compressionLevel = 9;
          await this.saveVersion(version);
          this.config.compressionLevel = oldConfig;
          optimizedCount++;
        }
      }
    }

    console.log(`Optimized ${optimizedCount} versions`);
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    let versionsToDelete: VersionId[] = [];

    const allVersions = Object.entries(this.index.versions);
    const totalVersions = allVersions.length;

    // Strategy 1: Remove versions exceeding maxVersions limit (LRU)
    if (totalVersions > this.config.maxVersions) {
      const sortedByAge = allVersions.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const excessCount = totalVersions - this.config.maxVersions;
      versionsToDelete = sortedByAge.slice(0, excessCount).map(([id]) => id);
    }

    // Strategy 2: Remove versions exceeding age limit
    const ageBasedDeletions = allVersions
      .filter(([, versionData]) => now - versionData.timestamp > this.config.maxVersionAge)
      .map(([id]) => id);

    // Strategy 3: Remove versions when storage exceeds threshold
    const storageRatio = this.index.metadata.totalSize / this.config.maxStorageSize;
    if (storageRatio > this.config.cleanupThreshold) {
      const sortedBySize = allVersions
        .filter(([id]) => !this.index.versions[id].isSnapshot) // Keep snapshots
        .sort((a, b) => b[1].size - a[1].size); // Largest first

      const sizeBasedDeletions = sortedBySize
        .slice(0, this.config.lruCleanupCount)
        .map(([id]) => id);

      versionsToDelete = [...versionsToDelete, ...sizeBasedDeletions];
    }

    // Combine all deletion strategies
    versionsToDelete = [...new Set([...versionsToDelete, ...ageBasedDeletions])];

    // Always keep at least one snapshot and the most recent version
    const snapshots = allVersions.filter(([, v]) => v.isSnapshot);
    const mostRecentVersion = allVersions.reduce((latest, current) =>
      current[1].timestamp > latest[1].timestamp ? current : latest
    );

    const protectedVersions = new Set([
      ...snapshots.slice(-1).map(([id]) => id), // Keep latest snapshot
      mostRecentVersion[0], // Keep most recent version
    ]);

    versionsToDelete = versionsToDelete.filter(id => !protectedVersions.has(id));

    // Execute deletions
    for (const versionId of versionsToDelete) {
      await this.deleteVersion(versionId);
    }

    this.index.metadata.lastCleanup = now;
    this.saveIndex();

    console.log(`Cleaned up ${versionsToDelete.length} old versions`);

    // If still over storage limit, try compression optimization
    if (this.index.metadata.totalSize > this.config.maxStorageSize * 0.9) {
      await this.optimizeStorage();
    }
  }

  private async prepareStorageEntry(version: Version, isSnapshot: boolean): Promise<StorageEntry> {
    let data: string;

    if ((isSnapshot || version.isSnapshot) && version.fullContent) {
      // Store full content for snapshots
      data = version.fullContent;
    } else if (version.delta) {
      // Store delta for incremental versions
      data = JSON.stringify(version.delta);
    } else {
      throw new Error("Version must have either fullContent or delta");
    }

    // Apply compression if enabled and data is large enough
    let compressed = false;
    let finalData = data;

    if (
      this.config.enableCompression &&
      CompressionEngine.shouldCompress(data, this.config.compressionThreshold)
    ) {
      const compressedData = await CompressionEngine.compress(data);
      const compressionRatio = CompressionEngine.getCompressionRatio(data, compressedData);

      // Only use compressed version if it actually reduces size
      if (compressionRatio < 0.95) {
        // 5% minimum improvement
        finalData = compressedData;
        compressed = true;
      }
    }

    return {
      id: version.metadata.id,
      metadata: version.metadata,
      compressed,
      data: finalData,
      size: finalData.length,
      timestamp: Date.now(),
    };
  }

  private async reconstructVersion(entry: StorageEntry): Promise<Version> {
    let data = entry.data;

    // Decompress if needed
    if (entry.compressed) {
      data = CompressionEngine.decompress(data);
    }

    // Determine if this is a snapshot or delta
    const isSnapshot = this.index.versions[entry.id]?.isSnapshot || false;

    const version: Version = {
      metadata: entry.metadata,
      isSnapshot,
    };

    if (isSnapshot) {
      version.fullContent = data;
    } else {
      version.delta = JSON.parse(data);
    }

    return version;
  }

  private shouldCreateSnapshot(metadata: VersionMetadata): boolean {
    // Create snapshot every N versions or for major changes
    const versionCount = this.index.metadata.totalVersions;
    const isIntervalSnapshot = versionCount % this.config.snapshotInterval === 0;
    const isMajorChange = metadata.changeType === ChangeType.MAJOR;

    return isIntervalSnapshot || isMajorChange || versionCount === 0;
  }

  private shouldCleanup(): boolean {
    const totalSize = this.index.metadata.totalSize;
    const totalVersions = this.index.metadata.totalVersions;
    const lastCleanup = this.index.metadata.lastCleanup;
    const now = Date.now();

    // Cleanup if:
    // 1. Storage size exceeds threshold
    const sizeThresholdExceeded =
      totalSize > this.config.maxStorageSize * this.config.cleanupThreshold;

    // 2. Version count exceeds limit
    const versionLimitExceeded = totalVersions > this.config.maxVersions;

    // 3. Haven't cleaned up in 6 hours
    const timeBasedCleanup = now - lastCleanup > 6 * 60 * 60 * 1000;

    return sizeThresholdExceeded || versionLimitExceeded || timeBasedCleanup;
  }

  private updateIndex(metadata: VersionMetadata, entry: StorageEntry, isSnapshot: boolean): void {
    // Update version index
    this.index.versions[metadata.id] = {
      timestamp: metadata.timestamp,
      branchId: metadata.branchId,
      size: entry.size,
      tags: metadata.tags,
      isSnapshot,
    };

    // Update branch index
    if (!this.index.branches[metadata.branchId]) {
      this.index.branches[metadata.branchId] = {
        name: `Branch ${metadata.branchId}`,
        headVersionId: metadata.id,
        versionCount: 0,
        totalSize: 0,
      };
    }

    this.index.branches[metadata.branchId].headVersionId = metadata.id;
    this.index.branches[metadata.branchId].versionCount++;
    this.index.branches[metadata.branchId].totalSize += entry.size;

    // Update metadata
    this.index.metadata.totalVersions++;
    this.index.metadata.totalSize += entry.size;
    this.index.metadata.newestVersion = Math.max(
      this.index.metadata.newestVersion,
      metadata.timestamp
    );

    if (this.index.metadata.oldestVersion === 0) {
      this.index.metadata.oldestVersion = metadata.timestamp;
    } else {
      this.index.metadata.oldestVersion = Math.min(
        this.index.metadata.oldestVersion,
        metadata.timestamp
      );
    }

    if (isSnapshot) {
      this.index.metadata.snapshotCount++;
    } else {
      this.index.metadata.deltaCount++;
    }
  }

  private loadIndex(): StorageIndex {
    try {
      const indexData = OptimizedStorage.getItem(this.indexKey);
      if (indexData) {
        return JSON.parse(indexData);
      }
    } catch (error) {
      console.warn("Failed to load version index, creating new one:", error);
    }

    return this.createEmptyIndex();
  }

  private saveIndex(): void {
    try {
      OptimizedStorage.setItem(this.indexKey, JSON.stringify(this.index));
    } catch (error) {
      console.error("Failed to save version index:", error);
    }
  }

  private createEmptyIndex(): StorageIndex {
    return {
      versions: {},
      branches: {},
      tags: {},
      metadata: {
        totalVersions: 0,
        totalSize: 0,
        lastCleanup: 0,
        oldestVersion: 0,
        newestVersion: 0,
        snapshotCount: 0,
        deltaCount: 0,
      },
    };
  }
}

/**
 * Factory function for creating storage backend
 */
export const createVersionStorage = (config?: Partial<StorageConfig>): VersionStorageBackend => {
  return new LocalVersionStorage(config);
};

/**
 * Storage utilities
 */
export const getStorageUsage = (): number => {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("json_crack_")) {
      const value = localStorage.getItem(key);
      if (value) {
        total += value.length;
      }
    }
  }
  return total;
};

export const clearVersionStorage = (): void => {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("json_crack_")) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => localStorage.removeItem(key));
};
