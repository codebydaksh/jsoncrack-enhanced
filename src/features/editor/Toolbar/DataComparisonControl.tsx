import React from "react";
import { ActionIcon, Tooltip, Text, Flex } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { MdCompare } from "react-icons/md";
import { useModal } from "../../../store/useModal";
import useComparison from "../../../store/useComparison";

export const DataComparisonControl = () => {
  const setVisible = useModal(state => state.setVisible);
  const { differences, stats } = useComparison();

  const openComparison = React.useCallback(() => {
    setVisible("DataComparisonModal", true);
  }, [setVisible]);

  useHotkeys([
    ["mod+shift+c", openComparison],
  ]);

  const hasComparison = differences.length > 0;

  return (
    <Tooltip
      label={
        <Flex fz="xs" gap="md">
          <Text fz="xs">Data Comparison</Text>
          <Text fz="xs" c="dimmed">
            Ctrl + Shift + C
          </Text>
        </Flex>
      }
      withArrow
    >
      <ActionIcon
        size="lg"
        variant="light"
        color={hasComparison ? "blue" : "gray"}
        onClick={openComparison}
        style={{
          position: "relative",
          opacity: hasComparison ? 1 : 0.8,
        }}
      >
        <MdCompare />
        {hasComparison && (
          <div
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              width: 16,
              height: 16,
              borderRadius: "50%",
              backgroundColor: stats.similarity > 80 ? "var(--mantine-color-green-filled)" : 
                             stats.similarity > 50 ? "var(--mantine-color-yellow-filled)" : 
                             "var(--mantine-color-red-filled)",
              color: "white",
              fontSize: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 600,
            }}
          >
            {stats.similarity}%
          </div>
        )}
      </ActionIcon>
    </Tooltip>
  );
};