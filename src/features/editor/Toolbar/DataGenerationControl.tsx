import React from "react";
import { ActionIcon, Tooltip, Text, Flex, Badge } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { MdDataUsage } from "react-icons/md";
import { useModal } from "../../../store/useModal";
import useDataGeneration from "../../../store/useDataGeneration";

export const DataGenerationControl = () => {
  const setVisible = useModal(state => state.setVisible);
  const { recentDatasets, customTemplates, isGenerating } = useDataGeneration();

  const openDataGeneration = React.useCallback(() => {
    setVisible("DataGenerationModal", true);
  }, [setVisible]);

  useHotkeys([
    ["mod+shift+d", openDataGeneration],
  ]);

  const totalAssets = recentDatasets.length + customTemplates.length;
  const hasAssets = totalAssets > 0;

  const getStatusColor = () => {
    if (isGenerating) return "orange";
    if (hasAssets) return "green";
    return "blue";
  };

  return (
    <Tooltip
      label={
        <Flex direction="column" gap="xs">
          <Flex fz="xs" gap="md">
            <Text fz="xs">Data Generation Tools</Text>
            <Text fz="xs" c="dimmed">
              Ctrl + Shift + D
            </Text>
          </Flex>
          <Flex direction="column" gap={2}>
            <Text fz="xs" c="dimmed">
              {isGenerating ? "Generating data..." : "Ready to generate"}
            </Text>
            {hasAssets && (
              <Text fz="xs" c="dimmed">
                {recentDatasets.length} dataset{recentDatasets.length !== 1 ? "s" : ""} • {customTemplates.length} template{customTemplates.length !== 1 ? "s" : ""}
              </Text>
            )}
          </Flex>
        </Flex>
      }
      withArrow
    >
      <ActionIcon
        size="lg"
        variant="light"
        color={getStatusColor()}
        onClick={openDataGeneration}
        style={{
          position: "relative",
        }}
      >
        <MdDataUsage />
        {isGenerating && (
          <div
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: "var(--mantine-color-orange-filled)",
              animation: "pulse 2s infinite",
            }}
          />
        )}
        {hasAssets && (
          <Badge
            size="xs"
            variant="filled"
            color={getStatusColor()}
            style={{
              position: "absolute",
              top: -8,
              right: -8,
              minWidth: 16,
              height: 16,
              padding: "0 4px",
              fontSize: 8,
              fontWeight: 600,
            }}
          >
            {totalAssets > 99 ? "99+" : totalAssets}
          </Badge>
        )}
      </ActionIcon>
    </Tooltip>
  );
};