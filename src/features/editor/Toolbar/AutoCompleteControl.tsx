import React from "react";
import { ActionIcon, Tooltip, Text, Flex, Badge } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { MdAutoAwesome } from "react-icons/md";
import { useModal } from "../../../store/useModal";
import useAutoComplete from "../../../store/useAutoComplete";

export const AutoCompleteControl = () => {
  const setVisible = useModal(state => state.setVisible);
  const { 
    isEnabled, 
    learningEnabled, 
    customPatterns,
    commonPatterns 
  } = useAutoComplete();

  const openAutoComplete = React.useCallback(() => {
    setVisible("AutoCompleteModal", true);
  }, [setVisible]);

  useHotkeys([
    ["mod+shift+a", openAutoComplete],
  ]);

  const totalPatterns = Object.keys(customPatterns).length + Object.keys(commonPatterns).length;
  const hasPatterns = totalPatterns > 0;

  const getStatusColor = () => {
    if (!isEnabled) return "gray";
    if (learningEnabled) return "green";
    return "blue";
  };

  const getStatusText = () => {
    if (!isEnabled) return "Disabled";
    if (learningEnabled) return "Learning Mode";
    return "Basic Mode";
  };

  return (
    <Tooltip
      label={
        <Flex direction="column" gap="xs">
          <Flex fz="xs" gap="md">
            <Text fz="xs">Auto-Complete Settings</Text>
            <Text fz="xs" c="dimmed">
              Ctrl + Shift + A
            </Text>
          </Flex>
          <Flex direction="column" gap={2}>
            <Text fz="xs" c="dimmed">
              Status: {getStatusText()}
            </Text>
            {hasPatterns && (
              <Text fz="xs" c="dimmed">
                {totalPatterns} pattern{totalPatterns !== 1 ? "s" : ""} available
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
        onClick={openAutoComplete}
        style={{
          position: "relative",
          opacity: isEnabled ? 1 : 0.6,
        }}
      >
        <MdAutoAwesome />
        {isEnabled && learningEnabled && (
          <div
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: "var(--mantine-color-green-filled)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          />
        )}
        {hasPatterns && (
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
            {totalPatterns > 99 ? "99+" : totalPatterns}
          </Badge>
        )}
      </ActionIcon>
    </Tooltip>
  );
};