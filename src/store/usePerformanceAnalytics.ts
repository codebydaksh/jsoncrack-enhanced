import { create } from "zustand";

export interface PerformanceMetric {
  timestamp: number;
  parseTime: number; // milliseconds
  memoryUsage: number; // bytes
  jsonSize: number; // bytes
  nodeCount: number;
  complexity: number; // 1-10 scale
  operations: string[]; // Recent operations
}

export interface PerformanceAlert {
  id: string;
  type: "warning" | "error" | "info";
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: number;
  dismissed: boolean;
}

export interface PerformanceStats {
  avgParseTime: number;
  maxParseTime: number;
  avgMemoryUsage: number;
  maxMemoryUsage: number;
  totalOperations: number;
  sessionsAnalyzed: number;
  performanceScore: number; // 0-100
}

interface PerformanceAnalyticsState {
  isEnabled: boolean;
  isRecording: boolean;
  metrics: PerformanceMetric[];
  alerts: PerformanceAlert[];
  stats: PerformanceStats;
  maxMetrics: number;
  performanceThresholds: {
    parseTimeWarning: number; // ms
    parseTimeError: number; // ms
    memoryWarning: number; // bytes
    memoryError: number; // bytes
    complexityWarning: number; // scale 1-10
  };
  autoOptimize: boolean;
  showRealTimeGraph: boolean;
}

interface PerformanceAnalyticsActions {
  setEnabled: (enabled: boolean) => void;
  setRecording: (recording: boolean) => void;
  addMetric: (metric: Omit<PerformanceMetric, "timestamp">) => void;
  addAlert: (alert: Omit<PerformanceAlert, "id" | "timestamp" | "dismissed">) => void;
  dismissAlert: (alertId: string) => void;
  clearMetrics: () => void;
  clearAlerts: () => void;
  setThresholds: (thresholds: Partial<PerformanceAnalyticsState["performanceThresholds"]>) => void;
  setAutoOptimize: (optimize: boolean) => void;
  setShowRealTimeGraph: (show: boolean) => void;
  trackOperation: (operation: string, jsonData: string) => Promise<void>;
  calculateComplexity: (jsonData: any) => number;
  generatePerformanceReport: () => string;
  getMetricsInTimeRange: (startTime: number, endTime: number) => PerformanceMetric[];
  getPerformanceTrend: (period: "hour" | "day" | "week") => PerformanceMetric[];
}

// Calculate JSON complexity (1-10 scale)
const calculateComplexity = (data: any, depth = 0): number => {
  if (depth > 10) return 10; // Prevent infinite recursion

  let complexity = 1;

  if (typeof data === "object" && data !== null) {
    if (Array.isArray(data)) {
      complexity += Math.min(data.length * 0.1, 2); // Arrays add complexity
      for (const item of data.slice(0, 10)) {
        // Sample first 10 items
        complexity += calculateComplexity(item, depth + 1) * 0.1;
      }
    } else {
      const keys = Object.keys(data);
      complexity += Math.min(keys.length * 0.2, 3); // Objects add complexity
      for (const key of keys.slice(0, 10)) {
        // Sample first 10 properties
        complexity += calculateComplexity(data[key], depth + 1) * 0.1;
      }
    }
  }

  return Math.min(Math.round(complexity), 10);
};

// Count total nodes in JSON
const countNodes = (data: any): number => {
  if (typeof data !== "object" || data === null) return 1;

  let count = 1; // Current node
  if (Array.isArray(data)) {
    for (const item of data) {
      count += countNodes(item);
    }
  } else {
    for (const value of Object.values(data)) {
      count += countNodes(value);
    }
  }

  return count;
};

// Estimate memory usage
const estimateMemoryUsage = (jsonString: string): number => {
  // Rough estimation: each character is ~2 bytes in memory (UTF-16)
  // Plus overhead for objects, arrays, etc.
  const baseSize = jsonString.length * 2;

  try {
    const data = JSON.parse(jsonString);
    const nodeCount = countNodes(data);
    const overhead = nodeCount * 8; // Estimated overhead per node
    return baseSize + overhead;
  } catch {
    return baseSize;
  }
};

// Generate performance recommendations
const generateRecommendations = (metric: PerformanceMetric): string[] => {
  const recommendations: string[] = [];

  if (metric.parseTime > 1000) {
    recommendations.push("Consider breaking down large JSON files into smaller chunks");
  }

  if (metric.complexity > 7) {
    recommendations.push("High complexity detected - consider flattening nested structures");
  }

  if (metric.nodeCount > 10000) {
    recommendations.push("Large number of nodes - enable pagination or filtering");
  }

  if (metric.memoryUsage > 50 * 1024 * 1024) {
    // 50MB
    recommendations.push("High memory usage - consider streaming for large files");
  }

  return recommendations;
};

const usePerformanceAnalytics = create<PerformanceAnalyticsState & PerformanceAnalyticsActions>(
  (set, get) => ({
    // Initial state
    isEnabled: true,
    isRecording: true,
    metrics: [],
    alerts: [],
    stats: {
      avgParseTime: 0,
      maxParseTime: 0,
      avgMemoryUsage: 0,
      maxMemoryUsage: 0,
      totalOperations: 0,
      sessionsAnalyzed: 0,
      performanceScore: 100,
    },
    maxMetrics: 100, // Keep last 100 metrics
    performanceThresholds: {
      parseTimeWarning: 500, // 500ms
      parseTimeError: 2000, // 2s
      memoryWarning: 10 * 1024 * 1024, // 10MB
      memoryError: 50 * 1024 * 1024, // 50MB
      complexityWarning: 7,
    },
    autoOptimize: true,
    showRealTimeGraph: false,

    // Actions
    setEnabled: (enabled: boolean) => {
      set({ isEnabled: enabled });
      if (!enabled) {
        set({ metrics: [], alerts: [] });
      }
    },

    setRecording: (recording: boolean) => {
      set({ isRecording: recording });
    },

    addMetric: (metricData: Omit<PerformanceMetric, "timestamp">) => {
      const { isEnabled, isRecording, maxMetrics, performanceThresholds } = get();
      if (!isEnabled || !isRecording) return;

      const metric: PerformanceMetric = {
        ...metricData,
        timestamp: Date.now(),
      };

      // Check thresholds and create alerts
      const alerts: Omit<PerformanceAlert, "id" | "timestamp" | "dismissed">[] = [];

      if (metric.parseTime > performanceThresholds.parseTimeError) {
        alerts.push({
          type: "error",
          message: `Parse time is critically slow (${metric.parseTime}ms)`,
          metric: "parseTime",
          value: metric.parseTime,
          threshold: performanceThresholds.parseTimeError,
        });
      } else if (metric.parseTime > performanceThresholds.parseTimeWarning) {
        alerts.push({
          type: "warning",
          message: `Parse time is slower than expected (${metric.parseTime}ms)`,
          metric: "parseTime",
          value: metric.parseTime,
          threshold: performanceThresholds.parseTimeWarning,
        });
      }

      if (metric.memoryUsage > performanceThresholds.memoryError) {
        alerts.push({
          type: "error",
          message: `Memory usage is critically high (${(metric.memoryUsage / 1024 / 1024).toFixed(1)}MB)`,
          metric: "memoryUsage",
          value: metric.memoryUsage,
          threshold: performanceThresholds.memoryError,
        });
      } else if (metric.memoryUsage > performanceThresholds.memoryWarning) {
        alerts.push({
          type: "warning",
          message: `Memory usage is higher than expected (${(metric.memoryUsage / 1024 / 1024).toFixed(1)}MB)`,
          metric: "memoryUsage",
          value: metric.memoryUsage,
          threshold: performanceThresholds.memoryWarning,
        });
      }

      if (metric.complexity > performanceThresholds.complexityWarning) {
        alerts.push({
          type: "warning",
          message: `JSON complexity is high (${metric.complexity}/10)`,
          metric: "complexity",
          value: metric.complexity,
          threshold: performanceThresholds.complexityWarning,
        });
      }

      // Add alerts
      alerts.forEach(alert => get().addAlert(alert));

      set(state => {
        const newMetrics = [...state.metrics, metric].slice(-maxMetrics);

        // Update statistics
        const totalOps = state.stats.totalOperations + 1;
        const avgParseTime =
          (state.stats.avgParseTime * (totalOps - 1) + metric.parseTime) / totalOps;
        const avgMemoryUsage =
          (state.stats.avgMemoryUsage * (totalOps - 1) + metric.memoryUsage) / totalOps;

        const newStats: PerformanceStats = {
          avgParseTime,
          maxParseTime: Math.max(state.stats.maxParseTime, metric.parseTime),
          avgMemoryUsage,
          maxMemoryUsage: Math.max(state.stats.maxMemoryUsage, metric.memoryUsage),
          totalOperations: totalOps,
          sessionsAnalyzed: state.stats.sessionsAnalyzed,
          performanceScore: Math.max(
            0,
            100 - metric.complexity * 5 - (metric.parseTime > 1000 ? 20 : 0)
          ),
        };

        return {
          metrics: newMetrics,
          stats: newStats,
        };
      });
    },

    addAlert: (alertData: Omit<PerformanceAlert, "id" | "timestamp" | "dismissed">) => {
      const alert: PerformanceAlert = {
        ...alertData,
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        dismissed: false,
      };

      set(state => ({
        alerts: [...state.alerts, alert],
      }));
    },

    dismissAlert: (alertId: string) => {
      set(state => ({
        alerts: state.alerts.map(alert =>
          alert.id === alertId ? { ...alert, dismissed: true } : alert
        ),
      }));
    },

    clearMetrics: () => {
      set({ metrics: [] });
    },

    clearAlerts: () => {
      set({ alerts: [] });
    },

    setThresholds: thresholds => {
      set(state => ({
        performanceThresholds: { ...state.performanceThresholds, ...thresholds },
      }));
    },

    setAutoOptimize: (optimize: boolean) => {
      set({ autoOptimize: optimize });
    },

    setShowRealTimeGraph: (show: boolean) => {
      set({ showRealTimeGraph: show });
    },

    trackOperation: async (operation: string, jsonData: string) => {
      const { isEnabled, isRecording } = get();
      if (!isEnabled || !isRecording) return;

      const startTime = performance.now();

      try {
        // Parse and analyze JSON
        const parsedData = JSON.parse(jsonData);
        const endTime = performance.now();

        const parseTime = Math.round(endTime - startTime);
        const memoryUsage = estimateMemoryUsage(jsonData);
        const nodeCount = countNodes(parsedData);
        const complexity = calculateComplexity(parsedData);

        get().addMetric({
          parseTime,
          memoryUsage,
          jsonSize: jsonData.length,
          nodeCount,
          complexity,
          operations: [operation],
        });
      } catch (error) {
        // Track parse errors
        const endTime = performance.now();
        const parseTime = Math.round(endTime - startTime);

        get().addAlert({
          type: "error",
          message: `JSON parsing failed during ${operation}`,
          metric: "parseTime",
          value: parseTime,
          threshold: 0,
        });
      }
    },

    calculateComplexity: (jsonData: any): number => {
      return calculateComplexity(jsonData);
    },

    generatePerformanceReport: (): string => {
      const { metrics, stats, alerts } = get();

      const report = {
        generatedAt: new Date().toISOString(),
        summary: {
          totalMetrics: metrics.length,
          averageParseTime: `${stats.avgParseTime.toFixed(2)}ms`,
          maxParseTime: `${stats.maxParseTime}ms`,
          averageMemoryUsage: `${(stats.avgMemoryUsage / 1024 / 1024).toFixed(2)}MB`,
          maxMemoryUsage: `${(stats.maxMemoryUsage / 1024 / 1024).toFixed(2)}MB`,
          performanceScore: `${stats.performanceScore}/100`,
        },
        recentAlerts: alerts.filter(a => !a.dismissed).slice(-10),
        recommendations:
          metrics.length > 0 ? generateRecommendations(metrics[metrics.length - 1]) : [],
        metrics: metrics.slice(-20), // Last 20 metrics
      };

      return JSON.stringify(report, null, 2);
    },

    getMetricsInTimeRange: (startTime: number, endTime: number): PerformanceMetric[] => {
      const { metrics } = get();
      return metrics.filter(m => m.timestamp >= startTime && m.timestamp <= endTime);
    },

    getPerformanceTrend: (period: "hour" | "day" | "week"): PerformanceMetric[] => {
      const now = Date.now();
      const periodMs = {
        hour: 60 * 60 * 1000,
        day: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
      };

      const startTime = now - periodMs[period];
      return get().getMetricsInTimeRange(startTime, now);
    },
  })
);

export default usePerformanceAnalytics;
