import { create } from "zustand";

export interface ComparisonDiff {
  path: string;
  type: "added" | "removed" | "modified" | "moved";
  leftValue?: any;
  rightValue?: any;
  oldPath?: string; // For moved items
  severity: "high" | "medium" | "low";
}

export interface ComparisonStats {
  totalDifferences: number;
  additions: number;
  deletions: number;
  modifications: number;
  moves: number;
  similarity: number; // Percentage similarity (0-100)
}

interface ComparisonState {
  leftJson: string;
  rightJson: string;
  leftLabel: string;
  rightLabel: string;
  differences: ComparisonDiff[];
  stats: ComparisonStats;
  isComparing: boolean;
  showOnlyDifferences: boolean;
  expandAll: boolean;
  selectedDiff: number;
  searchQuery: string;
  groupSimilarChanges: boolean;
}

interface ComparisonActions {
  setLeftJson: (json: string) => void;
  setRightJson: (json: string) => void;
  setLeftLabel: (label: string) => void;
  setRightLabel: (label: string) => void;
  setDifferences: (diffs: ComparisonDiff[]) => void;
  setStats: (stats: ComparisonStats) => void;
  setIsComparing: (comparing: boolean) => void;
  setShowOnlyDifferences: (show: boolean) => void;
  setExpandAll: (expand: boolean) => void;
  setSelectedDiff: (index: number) => void;
  setSearchQuery: (query: string) => void;
  setGroupSimilarChanges: (group: boolean) => void;
  compareJsons: () => Promise<void>;
  clearComparison: () => void;
  navigateDifferences: (direction: "next" | "prev") => void;
  getFilteredDifferences: () => ComparisonDiff[];
}

// Deep comparison function
const deepCompare = (obj1: any, obj2: any, path = "$"): ComparisonDiff[] => {
  const differences: ComparisonDiff[] = [];

  // Handle null/undefined cases
  if (obj1 === null && obj2 === null) return differences;
  if (obj1 === undefined && obj2 === undefined) return differences;

  if (obj1 === null || obj1 === undefined) {
    differences.push({
      path,
      type: "added",
      rightValue: obj2,
      severity: "medium",
    });
    return differences;
  }

  if (obj2 === null || obj2 === undefined) {
    differences.push({
      path,
      type: "removed",
      leftValue: obj1,
      severity: "medium",
    });
    return differences;
  }

  // Handle primitive values
  if (typeof obj1 !== "object" || typeof obj2 !== "object") {
    if (obj1 !== obj2) {
      differences.push({
        path,
        type: "modified",
        leftValue: obj1,
        rightValue: obj2,
        severity: typeof obj1 !== typeof obj2 ? "high" : "low",
      });
    }
    return differences;
  }

  // Handle arrays
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    const maxLength = Math.max(obj1.length, obj2.length);

    for (let i = 0; i < maxLength; i++) {
      const currentPath = `${path}[${i}]`;

      if (i >= obj1.length) {
        differences.push({
          path: currentPath,
          type: "added",
          rightValue: obj2[i],
          severity: "medium",
        });
      } else if (i >= obj2.length) {
        differences.push({
          path: currentPath,
          type: "removed",
          leftValue: obj1[i],
          severity: "medium",
        });
      } else {
        differences.push(...deepCompare(obj1[i], obj2[i], currentPath));
      }
    }
    return differences;
  }

  // Handle array vs non-array
  if (Array.isArray(obj1) !== Array.isArray(obj2)) {
    differences.push({
      path,
      type: "modified",
      leftValue: obj1,
      rightValue: obj2,
      severity: "high",
    });
    return differences;
  }

  // Handle objects
  const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

  for (const key of allKeys) {
    const currentPath = path === "$" ? `$.${key}` : `${path}.${key}`;

    if (!(key in obj1)) {
      differences.push({
        path: currentPath,
        type: "added",
        rightValue: obj2[key],
        severity: "medium",
      });
    } else if (!(key in obj2)) {
      differences.push({
        path: currentPath,
        type: "removed",
        leftValue: obj1[key],
        severity: "medium",
      });
    } else {
      differences.push(...deepCompare(obj1[key], obj2[key], currentPath));
    }
  }

  return differences;
};

// Calculate similarity percentage
const calculateSimilarity = (diffs: ComparisonDiff[], totalElements: number): number => {
  if (totalElements === 0) return 100;
  const changedElements = diffs.length;
  return Math.max(0, ((totalElements - changedElements) / totalElements) * 100);
};

// Count total elements in an object
const countElements = (obj: any): number => {
  if (typeof obj !== "object" || obj === null) return 1;

  let count = 0;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      count += countElements(item);
    }
  } else {
    for (const value of Object.values(obj)) {
      count += countElements(value);
    }
  }
  return count;
};

const useComparison = create<ComparisonState & ComparisonActions>((set, get) => ({
  // Initial state
  leftJson: "",
  rightJson: "",
  leftLabel: "Original",
  rightLabel: "Modified",
  differences: [],
  stats: {
    totalDifferences: 0,
    additions: 0,
    deletions: 0,
    modifications: 0,
    moves: 0,
    similarity: 100,
  },
  isComparing: false,
  showOnlyDifferences: false,
  expandAll: false,
  selectedDiff: -1,
  searchQuery: "",
  groupSimilarChanges: true,

  // Actions
  setLeftJson: (json: string) => set({ leftJson: json }),
  setRightJson: (json: string) => set({ rightJson: json }),
  setLeftLabel: (label: string) => set({ leftLabel: label }),
  setRightLabel: (label: string) => set({ rightLabel: label }),
  setDifferences: (diffs: ComparisonDiff[]) => set({ differences: diffs }),
  setStats: (stats: ComparisonStats) => set({ stats }),
  setIsComparing: (comparing: boolean) => set({ isComparing: comparing }),
  setShowOnlyDifferences: (show: boolean) => set({ showOnlyDifferences: show }),
  setExpandAll: (expand: boolean) => set({ expandAll: expand }),
  setSelectedDiff: (index: number) => set({ selectedDiff: index }),
  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setGroupSimilarChanges: (group: boolean) => set({ groupSimilarChanges: group }),

  compareJsons: async () => {
    const { leftJson, rightJson } = get();

    if (!leftJson.trim() || !rightJson.trim()) {
      set({
        differences: [],
        stats: {
          totalDifferences: 0,
          additions: 0,
          deletions: 0,
          modifications: 0,
          moves: 0,
          similarity: 100,
        },
      });
      return;
    }

    set({ isComparing: true });

    try {
      const leftData = JSON.parse(leftJson);
      const rightData = JSON.parse(rightJson);

      const differences = deepCompare(leftData, rightData);

      // Calculate statistics
      const additions = differences.filter(d => d.type === "added").length;
      const deletions = differences.filter(d => d.type === "removed").length;
      const modifications = differences.filter(d => d.type === "modified").length;
      const moves = differences.filter(d => d.type === "moved").length;

      const leftElements = countElements(leftData);
      const rightElements = countElements(rightData);
      const totalElements = Math.max(leftElements, rightElements);
      const similarity = calculateSimilarity(differences, totalElements);

      const stats: ComparisonStats = {
        totalDifferences: differences.length,
        additions,
        deletions,
        modifications,
        moves,
        similarity: Math.round(similarity),
      };

      set({
        differences,
        stats,
        selectedDiff: differences.length > 0 ? 0 : -1,
        isComparing: false,
      });
    } catch (error) {
      console.error("Comparison error:", error);
      set({
        differences: [],
        stats: {
          totalDifferences: 0,
          additions: 0,
          deletions: 0,
          modifications: 0,
          moves: 0,
          similarity: 0,
        },
        isComparing: false,
      });
    }
  },

  clearComparison: () => {
    set({
      leftJson: "",
      rightJson: "",
      differences: [],
      stats: {
        totalDifferences: 0,
        additions: 0,
        deletions: 0,
        modifications: 0,
        moves: 0,
        similarity: 100,
      },
      selectedDiff: -1,
      searchQuery: "",
    });
  },

  navigateDifferences: (direction: "next" | "prev") => {
    const { differences, selectedDiff } = get();
    if (differences.length === 0) return;

    let newIndex = selectedDiff;
    if (direction === "next") {
      newIndex = (selectedDiff + 1) % differences.length;
    } else {
      newIndex = selectedDiff <= 0 ? differences.length - 1 : selectedDiff - 1;
    }

    set({ selectedDiff: newIndex });
  },

  getFilteredDifferences: (): ComparisonDiff[] => {
    const { differences, searchQuery } = get();

    let filtered = differences;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        diff =>
          diff.path.toLowerCase().includes(query) ||
          JSON.stringify(diff.leftValue).toLowerCase().includes(query) ||
          JSON.stringify(diff.rightValue).toLowerCase().includes(query)
      );
    }

    return filtered;
  },
}));

export default useComparison;
