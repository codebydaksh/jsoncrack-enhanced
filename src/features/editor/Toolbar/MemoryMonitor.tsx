import React from "react";
import { Text, Tooltip, ThemeIcon, Group, Badge, Stack } from "@mantine/core";
import { LuActivity } from "react-icons/lu";
import { useMemoryMonitor } from "../../../hooks/useMemoryMonitor";

const getStatusColor = (level: "good" | "warning" | "critical") => {
  switch (level) {
    case "critical":
      return "red";
    case "warning":
      return "yellow";
    default:
      return "green";
  }
};

const getStatusIcon = () => {
  return <LuActivity size={14} />;
};

export const MemoryMonitor = () => {
  const { formattedSize, nodeCount, performanceLevel, recommendations } = useMemoryMonitor();

  const tooltipContent = (
    <Stack gap="xs" p="xs">
      <Text size="sm" fw={500}>
        Performance Metrics
      </Text>
      <Text size="xs">Data Size: {formattedSize}</Text>
      <Text size="xs">Node Count: {nodeCount.toLocaleString()}</Text>
      {recommendations.length > 0 && (
        <>
          <Text size="xs" fw={500} mt="xs">
            Recommendations:
          </Text>
          {recommendations.map((rec, index) => (
            <Text key={index} size="xs" c="dimmed">
              • {rec}
            </Text>
          ))}
        </>
      )}
    </Stack>
  );

  return (
    <Tooltip label={tooltipContent} multiline withArrow position="bottom">
      <Group gap="xs" style={{ cursor: "help" }}>
        <ThemeIcon size="sm" variant="light" color={getStatusColor(performanceLevel)}>
          {getStatusIcon()}
        </ThemeIcon>
        <Text size="xs" c="dimmed">
          {formattedSize}
        </Text>
        {(performanceLevel === "warning" || performanceLevel === "critical") && (
          <Badge size="xs" color={getStatusColor(performanceLevel)} variant="light">
            {performanceLevel === "critical" ? "SLOW" : "WARN"}
          </Badge>
        )}
      </Group>
    </Tooltip>
  );
};
