import { create } from "zustand";

export interface SearchResult {
  path: string;
  key: string;
  value: any;
  type: "key" | "value" | "both";
  line?: number;
  column?: number;
}

export interface SearchFilter {
  type: "equals" | "contains" | "startsWith" | "endsWith" | "regex" | "jsonPath";
  field: "key" | "value" | "both";
  query: string;
  caseSensitive: boolean;
  enabled: boolean;
}

interface AdvancedSearchState {
  isSearchActive: boolean;
  searchQuery: string;
  searchMode: "simple" | "regex" | "jsonPath";
  caseSensitive: boolean;
  searchField: "key" | "value" | "both";
  results: SearchResult[];
  currentResultIndex: number;
  filters: SearchFilter[];
  highlightResults: boolean;
  searchHistory: string[];
}

interface AdvancedSearchActions {
  setSearchActive: (active: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSearchMode: (mode: "simple" | "regex" | "jsonPath") => void;
  setCaseSensitive: (sensitive: boolean) => void;
  setSearchField: (field: "key" | "value" | "both") => void;
  setResults: (results: SearchResult[]) => void;
  setCurrentResultIndex: (index: number) => void;
  addFilter: (filter: SearchFilter) => void;
  removeFilter: (index: number) => void;
  updateFilter: (index: number, filter: Partial<SearchFilter>) => void;
  setHighlightResults: (highlight: boolean) => void;
  addToHistory: (query: string) => void;
  clearResults: () => void;
  searchInJson: (jsonData: any) => void;
  navigateResults: (direction: "next" | "prev") => void;
}

// JSONPath evaluation helper (simplified)
const evaluateJSONPath = (data: any, path: string): any[] => {
  try {
    // Simple JSONPath implementation for basic queries
    // In production, you'd use a library like jsonpath-plus
    if (path.startsWith("$.")) {
      const segments = path.slice(2).split(".");
      let results = [data];

      for (const segment of segments) {
        if (segment === "*") {
          results = results.flatMap(obj =>
            typeof obj === "object" && obj !== null ? Object.values(obj) : []
          );
        } else if (segment.includes("[") && segment.includes("]")) {
          // Handle array access like items[0] or items[*]
          const [key, indexPart] = segment.split("[");
          const index = indexPart.replace("]", "");

          results = results.flatMap(obj => {
            if (typeof obj === "object" && obj !== null && obj[key]) {
              if (index === "*") {
                return Array.isArray(obj[key]) ? obj[key] : [];
              } else {
                const idx = parseInt(index);
                return Array.isArray(obj[key]) && obj[key][idx] !== undefined
                  ? [obj[key][idx]]
                  : [];
              }
            }
            return [];
          });
        } else {
          results = results.flatMap(obj =>
            typeof obj === "object" && obj !== null && obj[segment] !== undefined
              ? [obj[segment]]
              : []
          );
        }
      }

      return results;
    }
    return [];
  } catch {
    return [];
  }
};

// Recursive search function
const searchInObject = (
  obj: any,
  query: string,
  mode: "simple" | "regex" | "jsonPath",
  field: "key" | "value" | "both",
  caseSensitive: boolean,
  path = "$"
): SearchResult[] => {
  const results: SearchResult[] = [];

  if (mode === "jsonPath") {
    try {
      const pathResults = evaluateJSONPath(obj, query);
      pathResults.forEach((result, index) => {
        results.push({
          path: `${query}[${index}]`,
          key: "",
          value: result,
          type: "value",
        });
      });
      return results;
    } catch {
      return [];
    }
  }

  const searchText = caseSensitive ? query : query.toLowerCase();
  const isRegex = mode === "regex";
  let regex: RegExp | null = null;

  if (isRegex) {
    try {
      regex = new RegExp(query, caseSensitive ? "g" : "gi");
    } catch {
      return results;
    }
  }

  const matches = (text: string, type: "key" | "value"): boolean => {
    if ((field === "key" && type === "value") || (field === "value" && type === "key")) {
      return false;
    }

    const textToSearch = caseSensitive ? text : text.toLowerCase();

    if (isRegex && regex) {
      return regex.test(textToSearch);
    }

    return textToSearch.includes(searchText);
  };

  const processValue = (key: string, value: any, currentPath: string) => {
    const keyStr = String(key);
    const valueStr = String(value);

    const keyMatches = matches(keyStr, "key");
    const valueMatches = matches(valueStr, "value");

    if (keyMatches || valueMatches) {
      results.push({
        path: currentPath,
        key: keyStr,
        value: value,
        type: keyMatches && valueMatches ? "both" : keyMatches ? "key" : "value",
      });
    }

    if (typeof value === "object" && value !== null) {
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          processValue(String(index), item, `${currentPath}[${index}]`);
        });
      } else {
        Object.entries(value).forEach(([nestedKey, nestedValue]) => {
          processValue(nestedKey, nestedValue, `${currentPath}.${nestedKey}`);
        });
      }
    }
  };

  if (typeof obj === "object" && obj !== null) {
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        processValue(String(index), item, `${path}[${index}]`);
      });
    } else {
      Object.entries(obj).forEach(([key, value]) => {
        processValue(key, value, `${path}.${key}`);
      });
    }
  }

  return results;
};

const useAdvancedSearch = create<AdvancedSearchState & AdvancedSearchActions>((set, get) => ({
  // Initial state
  isSearchActive: false,
  searchQuery: "",
  searchMode: "simple",
  caseSensitive: false,
  searchField: "both",
  results: [],
  currentResultIndex: -1,
  filters: [],
  highlightResults: true,
  searchHistory: [],

  // Actions
  setSearchActive: (active: boolean) => {
    set({ isSearchActive: active });
    if (!active) {
      set({ results: [], currentResultIndex: -1 });
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setSearchMode: (mode: "simple" | "regex" | "jsonPath") => {
    set({ searchMode: mode });
  },

  setCaseSensitive: (sensitive: boolean) => {
    set({ caseSensitive: sensitive });
  },

  setSearchField: (field: "key" | "value" | "both") => {
    set({ searchField: field });
  },

  setResults: (results: SearchResult[]) => {
    set({
      results,
      currentResultIndex: results.length > 0 ? 0 : -1,
    });
  },

  setCurrentResultIndex: (index: number) => {
    const { results } = get();
    if (index >= 0 && index < results.length) {
      set({ currentResultIndex: index });
    }
  },

  addFilter: (filter: SearchFilter) => {
    const { filters } = get();
    set({ filters: [...filters, filter] });
  },

  removeFilter: (index: number) => {
    const { filters } = get();
    set({ filters: filters.filter((_, i) => i !== index) });
  },

  updateFilter: (index: number, filterUpdate: Partial<SearchFilter>) => {
    const { filters } = get();
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...filterUpdate };
    set({ filters: newFilters });
  },

  setHighlightResults: (highlight: boolean) => {
    set({ highlightResults: highlight });
  },

  addToHistory: (query: string) => {
    const { searchHistory } = get();
    if (query && !searchHistory.includes(query)) {
      const newHistory = [query, ...searchHistory.slice(0, 9)]; // Keep last 10
      set({ searchHistory: newHistory });
    }
  },

  clearResults: () => {
    set({ results: [], currentResultIndex: -1 });
  },

  searchInJson: (jsonData: any) => {
    const { searchQuery, searchMode, searchField, caseSensitive } = get();

    if (!searchQuery.trim()) {
      set({ results: [], currentResultIndex: -1 });
      return;
    }

    try {
      const results = searchInObject(jsonData, searchQuery, searchMode, searchField, caseSensitive);
      set({
        results,
        currentResultIndex: results.length > 0 ? 0 : -1,
      });

      // Add to history
      get().addToHistory(searchQuery);
    } catch (error) {
      console.error("Search error:", error);
      set({ results: [], currentResultIndex: -1 });
    }
  },

  navigateResults: (direction: "next" | "prev") => {
    const { results, currentResultIndex } = get();
    if (results.length === 0) return;

    let newIndex = currentResultIndex;
    if (direction === "next") {
      newIndex = (currentResultIndex + 1) % results.length;
    } else {
      newIndex = currentResultIndex <= 0 ? results.length - 1 : currentResultIndex - 1;
    }

    set({ currentResultIndex: newIndex });
  },
}));

export default useAdvancedSearch;
