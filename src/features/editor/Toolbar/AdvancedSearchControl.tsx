import React from "react";
import { ActionIcon, Tooltip, Text, Flex } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { FiSearch } from "react-icons/fi";
import { useModal } from "../../../store/useModal";
import useAdvancedSearch from "../../../store/useAdvancedSearch";

export const AdvancedSearchControl = () => {
  const setVisible = useModal(state => state.setVisible);
  const { results, isSearchActive } = useAdvancedSearch();

  const openAdvancedSearch = React.useCallback(() => {
    setVisible("AdvancedSearchModal", true);
  }, [setVisible]);

  useHotkeys([
    ["mod+shift+f", openAdvancedSearch],
  ]);

  return (
    <Tooltip
      label={
        <Flex fz="xs" gap="md">
          <Text fz="xs">Advanced Search</Text>
          <Text fz="xs" c="dimmed">
            Ctrl + Shift + F
          </Text>
        </Flex>
      }
      withArrow
    >
      <ActionIcon
        size="lg"
        variant="light"
        color={isSearchActive ? "blue" : "gray"}
        onClick={openAdvancedSearch}
        style={{
          position: "relative",
          opacity: isSearchActive ? 1 : 0.8,
        }}
      >
        <FiSearch />
        {results.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: "var(--mantine-color-blue-filled)",
              color: "white",
              fontSize: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 600,
            }}
          >
            {results.length > 9 ? "9+" : results.length}
          </div>
        )}
      </ActionIcon>
    </Tooltip>
  );
};