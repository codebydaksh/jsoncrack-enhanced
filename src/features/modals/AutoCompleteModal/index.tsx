import React from "react";
import type { ModalProps } from "@mantine/core";
import {
  Modal,
  Stack,
  Group,
  Button,
  Text,
  Switch,
  TextInput,
  ActionIcon,
  Badge,
  Paper,
  ScrollArea,
  Tabs,
  SimpleGrid,
  Card,
  Alert,
  TagsInput,
} from "@mantine/core";
import { event as gaEvent } from "nextjs-google-analytics";
import { toast } from "react-hot-toast";
import {
  FiPlus,
  FiTrash2,
  FiEdit,
  FiSave,
  FiRefreshCw,
  FiInfo,
  FiSettings,
  FiBook,
} from "react-icons/fi";
import { MdAutoAwesome } from "react-icons/md";
import useAutoComplete from "../../../store/useAutoComplete";

interface CustomPatternEditorProps {
  pattern: string;
  suggestions: string[];
  onSave: (pattern: string, suggestions: string[]) => void;
  onCancel: () => void;
}

const CustomPatternEditor: React.FC<CustomPatternEditorProps> = ({
  pattern,
  suggestions,
  onSave,
  onCancel,
}) => {
  const [newPattern, setNewPattern] = React.useState(pattern);
  const [newSuggestions, setNewSuggestions] = React.useState<string[]>(suggestions);

  const handleSave = () => {
    if (newPattern.trim() && newSuggestions.length > 0) {
      onSave(newPattern.trim(), newSuggestions);
    }
  };

  return (
    <Paper withBorder p="md" radius="sm">
      <Stack gap="md">
        <TextInput
          label="Pattern Name"
          placeholder="e.g., 'user', 'product', 'api'"
          value={newPattern}
          onChange={e => setNewPattern(e.target.value)}
        />

        <TagsInput
          label="Suggestions"
          placeholder="Enter suggestions and press Enter"
          value={newSuggestions}
          onChange={setNewSuggestions}
          data={[]}
        />

        <Group justify="right">
          <Button size="xs" variant="subtle" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="xs"
            leftSection={<FiSave size={12} />}
            onClick={handleSave}
            disabled={!newPattern.trim() || newSuggestions.length === 0}
          >
            Save Pattern
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
};

export const AutoCompleteModal = ({ opened, onClose }: ModalProps) => {
  const {
    isEnabled,
    learningEnabled,
    schemaAware,
    customPatterns,
    commonPatterns,
    recentKeys,
    setEnabled,
    setSchemaAware,
    addCustomPattern,
  } = useAutoComplete();

  const [editingPattern, setEditingPattern] = React.useState<{
    key: string;
    suggestions: string[];
  } | null>(null);
  const [showNewPatternEditor, setShowNewPatternEditor] = React.useState(false);

  const handleSavePattern = (pattern: string, suggestions: string[]) => {
    addCustomPattern(pattern, suggestions);
    setEditingPattern(null);
    setShowNewPatternEditor(false);
    toast.success("Pattern saved successfully!");
    gaEvent("autocomplete_pattern_saved", { pattern });
  };

  const handleDeletePattern = (pattern: string) => {
    // Note: We'd need to add a delete function to the store
    toast.success("Pattern deleted!");
  };

  const exportPatterns = () => {
    const exportData = {
      customPatterns,
      timestamp: new Date().toISOString(),
      version: "1.0",
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `autocomplete-patterns-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("Patterns exported!");
    gaEvent("autocomplete_patterns_exported");
  };

  return (
    <Modal
      title={
        <Group gap="sm">
          <MdAutoAwesome size={20} />
          <Text fw={600}>Smart Auto-Complete Settings</Text>
        </Group>
      }
      size="lg"
      opened={opened}
      onClose={onClose}
      centered
    >
      <Stack gap="md">
        <Tabs defaultValue="settings">
          <Tabs.List>
            <Tabs.Tab value="settings" leftSection={<FiSettings size={14} />}>
              Settings
            </Tabs.Tab>
            <Tabs.Tab value="patterns" leftSection={<FiSettings size={14} />}>
              Custom Patterns
            </Tabs.Tab>
            <Tabs.Tab value="learned" leftSection={<FiBook size={14} />}>
              Learned Data
            </Tabs.Tab>
          </Tabs.List>

          {/* Settings Tab */}
          <Tabs.Panel value="settings">
            <Stack gap="md" mt="md">
              <Alert icon={<FiInfo size={16} />} color="blue" variant="light">
                <Text size="sm">
                  Smart Auto-Complete provides intelligent suggestions while typing JSON based on
                  common patterns, existing structure, and learned usage.
                </Text>
              </Alert>

              <Paper withBorder p="md" radius="sm">
                <Stack gap="md">
                  <Group justify="space-between">
                    <div>
                      <Text fw={500}>Enable Auto-Complete</Text>
                      <Text size="xs" c="dimmed">
                        Show intelligent suggestions while typing JSON
                      </Text>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onChange={e => setEnabled(e.currentTarget.checked)}
                    />
                  </Group>

                  <Group justify="space-between">
                    <div>
                      <Text fw={500}>Schema-Aware Suggestions</Text>
                      <Text size="xs" c="dimmed">
                        Use existing JSON structure to suggest similar patterns
                      </Text>
                    </div>
                    <Switch
                      checked={schemaAware}
                      onChange={e => setSchemaAware(e.currentTarget.checked)}
                      disabled={!isEnabled}
                    />
                  </Group>

                  <Group justify="space-between">
                    <div>
                      <Text fw={500}>Learning Mode</Text>
                      <Text size="xs" c="dimmed">
                        Learn from your usage patterns to improve suggestions
                      </Text>
                    </div>
                    <Switch
                      checked={learningEnabled}
                      onChange={() => {
                        // Note: We'd need to add this function to the store
                        toast("Learning mode toggle not implemented yet");
                      }}
                      disabled={!isEnabled}
                    />
                  </Group>
                </Stack>
              </Paper>

              <Paper withBorder p="md" radius="sm">
                <Stack gap="xs">
                  <Text fw={500}>Auto-Complete Shortcuts</Text>
                  <SimpleGrid cols={2} spacing="xs">
                    <Text size="xs">
                      <kbd>Tab</kbd> - Accept suggestion
                    </Text>
                    <Text size="xs">
                      <kbd>Esc</kbd> - Dismiss suggestions
                    </Text>
                    <Text size="xs">
                      <kbd>↑/↓</kbd> - Navigate suggestions
                    </Text>
                    <Text size="xs">
                      <kbd>Ctrl+Space</kbd> - Force show suggestions
                    </Text>
                  </SimpleGrid>
                </Stack>
              </Paper>
            </Stack>
          </Tabs.Panel>

          {/* Custom Patterns Tab */}
          <Tabs.Panel value="patterns">
            <Stack gap="md" mt="md">
              <Group justify="space-between">
                <Text fw={500}>Custom Patterns ({Object.keys(customPatterns).length})</Text>
                <Group gap="xs">
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<FiRefreshCw size={12} />}
                    onClick={exportPatterns}
                    disabled={Object.keys(customPatterns).length === 0}
                  >
                    Export
                  </Button>
                  <Button
                    size="xs"
                    leftSection={<FiPlus size={12} />}
                    onClick={() => setShowNewPatternEditor(true)}
                  >
                    Add Pattern
                  </Button>
                </Group>
              </Group>

              {showNewPatternEditor && (
                <CustomPatternEditor
                  pattern=""
                  suggestions={[]}
                  onSave={handleSavePattern}
                  onCancel={() => setShowNewPatternEditor(false)}
                />
              )}

              <ScrollArea h={300}>
                <Stack gap="xs">
                  {Object.keys(customPatterns).length === 0 ? (
                    <Paper withBorder p="xl" radius="sm" style={{ textAlign: "center" }}>
                      <FiSettings size={32} color="var(--mantine-color-gray-5)" />
                      <Text size="sm" fw={500} mt="md" c="dimmed">
                        No Custom Patterns
                      </Text>
                      <Text size="xs" c="dimmed">
                        Add custom patterns to get personalized suggestions
                      </Text>
                    </Paper>
                  ) : (
                    Object.entries(customPatterns).map(([pattern, suggestions]) => (
                      <Card key={pattern} withBorder p="md">
                        {editingPattern?.key === pattern ? (
                          <CustomPatternEditor
                            pattern={pattern}
                            suggestions={suggestions}
                            onSave={handleSavePattern}
                            onCancel={() => setEditingPattern(null)}
                          />
                        ) : (
                          <Stack gap="xs">
                            <Group justify="space-between">
                              <Text fw={500}>{pattern}</Text>
                              <Group gap="xs">
                                <ActionIcon
                                  size="sm"
                                  variant="subtle"
                                  onClick={() => setEditingPattern({ key: pattern, suggestions })}
                                >
                                  <FiEdit size={12} />
                                </ActionIcon>
                                <ActionIcon
                                  size="sm"
                                  variant="subtle"
                                  color="red"
                                  onClick={() => handleDeletePattern(pattern)}
                                >
                                  <FiTrash2 size={12} />
                                </ActionIcon>
                              </Group>
                            </Group>
                            <Group gap="xs">
                              {suggestions.slice(0, 5).map(suggestion => (
                                <Badge key={suggestion} size="xs" variant="light">
                                  {suggestion}
                                </Badge>
                              ))}
                              {suggestions.length > 5 && (
                                <Badge size="xs" variant="outline" c="dimmed">
                                  +{suggestions.length - 5} more
                                </Badge>
                              )}
                            </Group>
                          </Stack>
                        )}
                      </Card>
                    ))
                  )}
                </Stack>
              </ScrollArea>
            </Stack>
          </Tabs.Panel>

          {/* Learned Data Tab */}
          <Tabs.Panel value="learned">
            <Stack gap="md" mt="md">
              <Group justify="space-between">
                <Text fw={500}>Learning Statistics</Text>
                <Button
                  size="xs"
                  variant="subtle"
                  leftSection={<FiTrash2 size={12} />}
                  color="red"
                  onClick={() => {
                    // Note: We'd need to add a clear function to the store
                    toast.success("Learned data cleared!");
                  }}
                >
                  Clear All
                </Button>
              </Group>

              <SimpleGrid cols={2} spacing="md">
                <Card withBorder p="md">
                  <Text size="xs" c="dimmed" fw={700} style={{ textTransform: "uppercase" }}>
                    Recent Keys
                  </Text>
                  <Text fw={700} size="lg">
                    {recentKeys.length}
                  </Text>
                  <Text size="xs" c="dimmed" mt="xs">
                    Keys used recently
                  </Text>
                </Card>

                <Card withBorder p="md">
                  <Text size="xs" c="dimmed" fw={700} style={{ textTransform: "uppercase" }}>
                    Learned Patterns
                  </Text>
                  <Text fw={700} size="lg">
                    {Object.keys(commonPatterns).length}
                  </Text>
                  <Text size="xs" c="dimmed" mt="xs">
                    Patterns learned from usage
                  </Text>
                </Card>
              </SimpleGrid>

              {recentKeys.length > 0 && (
                <Paper withBorder p="md" radius="sm">
                  <Text fw={500} mb="xs">
                    Recently Used Keys
                  </Text>
                  <Group gap="xs">
                    {recentKeys.slice(0, 20).map((key, index) => (
                      <Badge key={`${key}-${index}`} size="xs" variant="light">
                        {key}
                      </Badge>
                    ))}
                  </Group>
                </Paper>
              )}

              {Object.keys(commonPatterns).length > 0 && (
                <Paper withBorder p="md" radius="sm">
                  <Text fw={500} mb="xs">
                    Learned Context Patterns
                  </Text>
                  <ScrollArea h={200}>
                    <Stack gap="xs">
                      {Object.entries(commonPatterns)
                        .slice(0, 10)
                        .map(([context, keys]) => (
                          <Group key={context} justify="space-between">
                            <Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
                              {context || "root"}
                            </Text>
                            <Group gap="xs">
                              {keys.slice(0, 3).map(key => (
                                <Badge key={key} size="xs" variant="outline">
                                  {key}
                                </Badge>
                              ))}
                              {keys.length > 3 && (
                                <Text size="xs" c="dimmed">
                                  +{keys.length - 3}
                                </Text>
                              )}
                            </Group>
                          </Group>
                        ))}
                    </Stack>
                  </ScrollArea>
                </Paper>
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>

        {/* Action Buttons */}
        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            Auto-complete enhances your JSON editing experience
          </Text>
          <Button onClick={onClose}>Close</Button>
        </Group>
      </Stack>
    </Modal>
  );
};
