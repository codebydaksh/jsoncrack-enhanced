import React from "react";
import { ActionIcon, Flex, Tooltip, Text } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { event as gaEvent } from "nextjs-google-analytics";
import toast from "react-hot-toast";
import { LuUndo2, LuRedo2 } from "react-icons/lu";
import useFile from "../../../store/useFile";
import useHistory from "../../../store/useHistory";

export const UndoRedoControl = () => {
  const { canUndo, canRedo, undo, redo } = useHistory();
  const setContents = useFile(state => state.setContents);

  const handleUndo = React.useCallback(() => {
    const previousState = undo();
    if (previousState !== null) {
      setContents({ contents: previousState, hasChanges: true });
      toast.success("Undo successful");
      gaEvent("undo_action");
    }
  }, [undo, setContents]);

  const handleRedo = React.useCallback(() => {
    const nextState = redo();
    if (nextState !== null) {
      setContents({ contents: nextState, hasChanges: true });
      toast.success("Redo successful");
      gaEvent("redo_action");
    }
  }, [redo, setContents]);

  useHotkeys([
    ["mod+z", handleUndo],
    ["mod+shift+z", handleRedo],
    ["mod+y", handleRedo], // Alternative redo shortcut
  ]);

  return (
    <ActionIcon.Group borderWidth={0}>
      <Tooltip
        label={
          <Flex fz="xs" gap="md">
            <Text fz="xs">Undo</Text>
            <Text fz="xs" c="dimmed">
              Ctrl + Z
            </Text>
          </Flex>
        }
        withArrow
      >
        <ActionIcon
          size="lg"
          variant="light"
          color="gray"
          onClick={handleUndo}
          disabled={!canUndo}
          style={{ opacity: canUndo ? 1 : 0.5 }}
        >
          <LuUndo2 />
        </ActionIcon>
      </Tooltip>
      <Tooltip
        label={
          <Flex fz="xs" gap="md">
            <Text fz="xs">Redo</Text>
            <Text fz="xs" c="dimmed">
              Ctrl + Shift + Z
            </Text>
          </Flex>
        }
        withArrow
      >
        <ActionIcon
          size="lg"
          variant="light"
          color="gray"
          onClick={handleRedo}
          disabled={!canRedo}
          style={{ opacity: canRedo ? 1 : 0.5 }}
        >
          <LuRedo2 />
        </ActionIcon>
      </Tooltip>
    </ActionIcon.Group>
  );
};
