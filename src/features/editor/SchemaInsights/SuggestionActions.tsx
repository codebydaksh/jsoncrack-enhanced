import React, { useState } from "react";
import {
  Modal,
  Stack,
  Group,
  Text,
  Badge,
  Button,
  Code,
  SimpleGrid,
  Alert,
  Divider,
} from "@mantine/core";
import { FiAlertTriangle, FiInfo, FiX, FiPlay } from "react-icons/fi";
import type { SchemaSuggestion } from "../../../types/schema";
import { SuggestionSeverity } from "../../../types/schema";

interface SuggestionActionsProps {
  suggestion: SchemaSuggestion;
  onApply: (id: string) => Promise<void>;
  onDismiss: (id: string) => void;
  onClose: () => void;
}

export const SuggestionActions: React.FC<SuggestionActionsProps> = ({
  suggestion,
  onApply,
  onDismiss,
  onClose,
}) => {
  const [isApplying, setIsApplying] = useState(false);

  const getSeverityColor = (severity: SuggestionSeverity) => {
    switch (severity) {
      case SuggestionSeverity.CRITICAL:
        return "red";
      case SuggestionSeverity.HIGH:
        return "orange";
      case SuggestionSeverity.MEDIUM:
        return "yellow";
      case SuggestionSeverity.LOW:
        return "blue";
      default:
        return "gray";
    }
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await onApply(suggestion.id);
      onClose();
    } catch (error) {
      console.error("Apply failed:", error);
    } finally {
      setIsApplying(false);
    }
  };

  const handleDismiss = () => {
    onDismiss(suggestion.id);
    onClose();
  };

  return (
    <Modal opened onClose={onClose} title="Suggestion Details" size="lg">
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <Group gap="xs">
            <Text fw={600} size="lg">
              {suggestion.title}
            </Text>
            <Badge color={getSeverityColor(suggestion.severity)}>{suggestion.severity}</Badge>
          </Group>
          <Group gap="xs">
            <Badge size="xs" color="blue" variant="light">
              {Math.round(suggestion.confidence * 100)}% confidence
            </Badge>
            <Badge size="xs" color="orange" variant="light">
              {suggestion.impact} impact
            </Badge>
          </Group>
        </Group>

        <Text size="sm" c="dimmed">
          {suggestion.description}
        </Text>

        {suggestion.field && (
          <Group gap="xs">
            <Text size="sm" fw={500}>
              Target Field:
            </Text>
            <Code>{suggestion.field}</Code>
          </Group>
        )}

        {/* Values */}
        {(suggestion.currentValue || suggestion.suggestedValue) && (
          <SimpleGrid cols={suggestion.suggestedValue ? 2 : 1} spacing="md">
            {suggestion.currentValue && (
              <Stack gap="xs">
                <Text size="sm" fw={500}>
                  Current Value:
                </Text>
                <Code block>
                  {typeof suggestion.currentValue === "object"
                    ? JSON.stringify(suggestion.currentValue, null, 2)
                    : String(suggestion.currentValue)}
                </Code>
              </Stack>
            )}
            {suggestion.suggestedValue && (
              <Stack gap="xs">
                <Text size="sm" fw={500}>
                  Suggested Value:
                </Text>
                <Code block>
                  {typeof suggestion.suggestedValue === "object"
                    ? JSON.stringify(suggestion.suggestedValue, null, 2)
                    : String(suggestion.suggestedValue)}
                </Code>
              </Stack>
            )}
          </SimpleGrid>
        )}

        <Alert
          icon={
            suggestion.severity === SuggestionSeverity.CRITICAL ? (
              <FiAlertTriangle size={16} />
            ) : (
              <FiInfo size={16} />
            )
          }
          color={getSeverityColor(suggestion.severity)}
          variant="light"
        >
          <Text size="sm">
            This suggestion has {suggestion.impact.toLowerCase()} impact with{" "}
            {Math.round(suggestion.confidence * 100)}% confidence.
          </Text>
        </Alert>

        <Divider />

        <Group justify="flex-end" gap="xs">
          <Button variant="outline" color="gray" onClick={handleDismiss}>
            <Group gap="xs">
              <FiX size={14} />
              <Text>Dismiss</Text>
            </Group>
          </Button>
          <Button
            color="green"
            loading={isApplying}
            onClick={handleApply}
            leftSection={<FiPlay size={14} />}
          >
            Apply Suggestion
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
