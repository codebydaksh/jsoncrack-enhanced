import React from "react";
import { ActionIcon, Tooltip, Text, Flex, Badge } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { MdTransform } from "react-icons/md";
import { useModal } from "../../../store/useModal";
import useExportTemplates from "../../../store/useExportTemplates";

export const ExportTemplatesControl = () => {
  const setVisible = useModal(state => state.setVisible);
  const { customTemplates, recentExports, isExporting } = useExportTemplates();

  const openExportTemplates = React.useCallback(() => {
    setVisible("ExportTemplatesModal", true);
  }, [setVisible]);

  useHotkeys([
    ["mod+shift+e", openExportTemplates],
  ]);

  const totalAssets = customTemplates.length + recentExports.length;
  const hasAssets = totalAssets > 0;

  const getStatusColor = () => {
    if (isExporting) return "orange";
    if (hasAssets) return "green";
    return "blue";
  };

  return (
    <Tooltip
      label={
        <Flex direction="column" gap="xs">
          <Flex fz="xs" gap="md">
            <Text fz="xs">Advanced Export Templates</Text>
            <Text fz="xs" c="dimmed">
              Ctrl + Shift + E
            </Text>
          </Flex>
          <Flex direction="column" gap={2}>
            <Text fz="xs" c="dimmed">
              {isExporting ? "Exporting..." : "Ready to export"}
            </Text>
            {hasAssets && (
              <Text fz="xs" c="dimmed">
                {customTemplates.length} template{customTemplates.length !== 1 ? "s" : ""} • {recentExports.length} export{recentExports.length !== 1 ? "s" : ""}
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
        onClick={openExportTemplates}
        style={{
          position: "relative",
        }}
      >
        <MdTransform />
        {isExporting && (
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