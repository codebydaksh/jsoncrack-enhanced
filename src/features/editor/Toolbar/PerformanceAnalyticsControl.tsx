import React from "react";
import { ActionIcon, Tooltip, Text, Flex } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { MdAnalytics } from "react-icons/md";
import { useModal } from "../../../store/useModal";
import usePerformanceAnalytics from "../../../store/usePerformanceAnalytics";

export const PerformanceAnalyticsControl = () => {
  const setVisible = useModal(state => state.setVisible);
  const { isEnabled, isRecording, stats, alerts } = usePerformanceAnalytics();

  const openAnalytics = React.useCallback(() => {
    setVisible("PerformanceAnalyticsModal", true);
  }, [setVisible]);

  useHotkeys([["mod+shift+p", openAnalytics]]);

  const activeAlerts = alerts.filter(a => !a.dismissed);
  const hasAlerts = activeAlerts.length > 0;
  const performanceScore = stats.performanceScore;

  const getStatusColor = () => {
    if (!isEnabled) return "gray";
    if (hasAlerts) return "red";
    if (performanceScore >= 80) return "green";
    if (performanceScore >= 60) return "yellow";
    return "orange";
  };

  return (
    <Tooltip
      label={
        <Flex direction="column" gap="xs">
          <Flex fz="xs" gap="md">
            <Text fz="xs">Performance Analytics</Text>
            <Text fz="xs" c="dimmed">
              Ctrl + Shift + P
            </Text>
          </Flex>
          {isEnabled && (
            <Flex direction="column" gap={2}>
              <Text fz="xs" c="dimmed">
                Score: {performanceScore}/100 • {isRecording ? "Recording" : "Paused"}
              </Text>
              {hasAlerts && (
                <Text fz="xs" c="red">
                  {activeAlerts.length} active alert{activeAlerts.length !== 1 ? "s" : ""}
                </Text>
              )}
            </Flex>
          )}
        </Flex>
      }
      withArrow
    >
      <ActionIcon
        size="lg"
        variant="light"
        color={getStatusColor()}
        onClick={openAnalytics}
        style={{
          position: "relative",
          opacity: isEnabled ? 1 : 0.6,
        }}
      >
        <MdAnalytics />
        {isEnabled && (
          <div
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: isRecording
                ? "var(--mantine-color-green-filled)"
                : "var(--mantine-color-gray-filled)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          />
        )}
        {hasAlerts && (
          <div
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              width: 16,
              height: 16,
              borderRadius: "50%",
              backgroundColor: "var(--mantine-color-red-filled)",
              color: "white",
              fontSize: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 600,
              border: "2px solid white",
            }}
          >
            {activeAlerts.length > 9 ? "9+" : activeAlerts.length}
          </div>
        )}
      </ActionIcon>
    </Tooltip>
  );
};
