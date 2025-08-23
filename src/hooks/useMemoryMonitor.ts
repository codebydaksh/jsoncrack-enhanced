import { useState, useEffect } from "react";
import useJson from "../store/useJson";

interface MemoryStats {
  jsonSize: number;
  formattedSize: string;
  nodeCount: number;
  performanceLevel: "good" | "warning" | "critical";
  recommendations: string[];
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const getPerformanceLevel = (size: number, nodeCount: number): "good" | "warning" | "critical" => {
  if (size > 10 * 1024 * 1024 || nodeCount > 10000) return "critical"; // 10MB or 10k nodes
  if (size > 1 * 1024 * 1024 || nodeCount > 1000) return "warning"; // 1MB or 1k nodes
  return "good";
};

const getRecommendations = (level: "good" | "warning" | "critical", size: number): string[] => {
  switch (level) {
    case "critical":
      return [
        "Consider breaking down large objects",
        "Use Tree View for better performance",
        "Enable lazy loading in settings",
        "Consider using external data processing tools",
      ];
    case "warning":
      return [
        "Performance may be affected with complex operations",
        "Consider using Tree View for large datasets",
        "Enable compression for better memory usage",
      ];
    default:
      return [];
  }
};

const countNodes = (obj: any, count = 0): number => {
  if (typeof obj !== "object" || obj === null) return count + 1;

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      count = countNodes(obj[key], count + 1);
    }
  }
  return count;
};

export const useMemoryMonitor = (): MemoryStats => {
  const getJson = useJson(state => state.getJson);
  const [stats, setStats] = useState<MemoryStats>({
    jsonSize: 0,
    formattedSize: "0 Bytes",
    nodeCount: 0,
    performanceLevel: "good",
    recommendations: [],
  });

  useEffect(() => {
    const updateStats = () => {
      try {
        const jsonString = getJson();
        const jsonSize = new Blob([jsonString]).size;
        const formattedSize = formatBytes(jsonSize);

        let nodeCount = 0;
        try {
          const parsedJson = JSON.parse(jsonString);
          nodeCount = countNodes(parsedJson);
        } catch {
          // If JSON is invalid, just count characters as rough estimate
          nodeCount = Math.floor(jsonString.length / 10);
        }

        const performanceLevel = getPerformanceLevel(jsonSize, nodeCount);
        const recommendations = getRecommendations(performanceLevel, jsonSize);

        setStats({
          jsonSize,
          formattedSize,
          nodeCount,
          performanceLevel,
          recommendations,
        });
      } catch (error) {
        console.warn("Memory monitor error:", error);
      }
    };

    updateStats();
    const interval = setInterval(updateStats, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [getJson]);

  return stats;
};
