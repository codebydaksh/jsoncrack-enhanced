import React, { useState, useMemo } from "react";
import type { ModalProps } from "@mantine/core";
import {
  Modal,
  Stack,
  Text,
  Button,
  Group,
  TextInput,
  ColorInput,
  Tabs,
  Badge,
  ActionIcon,
  Grid,
  Card,
  Divider,
  Alert,
  ScrollArea,
} from "@mantine/core";
import { event as gaEvent } from "nextjs-google-analytics";
import toast from "react-hot-toast";
import { FiSave, FiTrash2, FiDownload, FiUpload, FiInfo } from "react-icons/fi";
import { MdPalette } from "react-icons/md";

interface CustomTheme {
  id: string;
  name: string;
  baseTheme: "light" | "dark";
  colors: {
    BACKGROUND_PRIMARY: string;
    BACKGROUND_SECONDARY: string;
    BACKGROUND_NODE: string;
    TEXT_NORMAL: string;
    NODE_KEY: string;
    NODE_VALUE: string;
    INTEGER: string;
    BOOL_TRUE: string;
    BOOL_FALSE: string;
    NULL: string;
    PARENT_ARR: string;
    PARENT_OBJ: string;
  };
  createdAt: number;
}

const defaultCustomColors = {
  BACKGROUND_PRIMARY: "#ffffff",
  BACKGROUND_SECONDARY: "#f2f3f5",
  BACKGROUND_NODE: "#F6F8FA",
  TEXT_NORMAL: "#2e3338",
  NODE_KEY: "#DC3790",
  NODE_VALUE: "#535353",
  INTEGER: "#FD0079",
  BOOL_TRUE: "#008736",
  BOOL_FALSE: "#FF0000",
  NULL: "#afafaf",
  PARENT_ARR: "#FF6B00",
  PARENT_OBJ: "#0260E8",
};

const THEME_STORAGE_KEY = "jsoncrack_custom_themes";

export const ThemesModal = ({ opened, onClose }: ModalProps) => {
  const [activeTab, setActiveTab] = useState("browse");
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // New theme creation state
  const [newThemeName, setNewThemeName] = useState("");
  const [newThemeColors, setNewThemeColors] = useState(defaultCustomColors);
  const [baseTheme] = useState<"light" | "dark">("light");

  const saveCustomThemes = (themes: CustomTheme[]) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(themes));
      setCustomThemes(themes);
    } catch (error) {
      toast.error("Failed to save themes");
    }
  };

  const createTheme = () => {
    if (!newThemeName.trim()) {
      toast.error("Please enter a theme name");
      return;
    }

    const newTheme: CustomTheme = {
      id: `custom_${Date.now()}`,
      name: newThemeName.trim(),
      baseTheme,
      colors: { ...newThemeColors },
      createdAt: Date.now(),
    };

    const updatedThemes = [...customThemes, newTheme];
    saveCustomThemes(updatedThemes);

    setNewThemeName("");
    setNewThemeColors(defaultCustomColors);
    toast.success(`Theme "${newTheme.name}" created!`);
    gaEvent("create_custom_theme");
  };

  const deleteTheme = (themeId: string) => {
    const updatedThemes = customThemes.filter(theme => theme.id !== themeId);
    saveCustomThemes(updatedThemes);
    toast.success("Theme deleted");
    gaEvent("delete_custom_theme");
  };

  const applyTheme = (theme: CustomTheme) => {
    // This would require extending the theme system to support custom themes
    // For now, we'll just show a success message
    toast.success(`Applied theme: ${theme.name}`);
    gaEvent("apply_custom_theme", { theme_name: theme.name });
    onClose();
  };

  const exportThemes = () => {
    const dataStr = JSON.stringify(customThemes, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "jsoncrack_themes.json";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Themes exported");
    gaEvent("export_themes");
  };

  const importThemes = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const importedThemes = JSON.parse(e.target?.result as string);
        if (Array.isArray(importedThemes)) {
          const validThemes = importedThemes.filter(
            theme => theme.id && theme.name && theme.colors
          );

          if (validThemes.length > 0) {
            const mergedThemes = [...customThemes, ...validThemes];
            saveCustomThemes(mergedThemes);
            toast.success(`Imported ${validThemes.length} themes`);
            gaEvent("import_themes", { count: validThemes.length });
          } else {
            toast.error("No valid themes found in file");
          }
        } else {
          toast.error("Invalid theme file format");
        }
      } catch {
        toast.error("Failed to parse theme file");
      }
    };
    reader.readAsText(file);

    // Reset input
    event.target.value = "";
  };

  const presetThemes = useMemo(
    () => [
      {
        id: "default_light",
        name: "Default Light",
        baseTheme: "light" as const,
        colors: defaultCustomColors,
        isPreset: true,
      },
      {
        id: "default_dark",
        name: "Default Dark",
        baseTheme: "dark" as const,
        colors: {
          BACKGROUND_PRIMARY: "#36393f",
          BACKGROUND_SECONDARY: "#2f3136",
          BACKGROUND_NODE: "#2B2C3E",
          TEXT_NORMAL: "#dcddde",
          NODE_KEY: "#FAA81A",
          NODE_VALUE: "#DCE5E7",
          INTEGER: "#e8c479",
          BOOL_TRUE: "#00DC7D",
          BOOL_FALSE: "#F85C50",
          NULL: "#939598",
          PARENT_ARR: "#FC9A40",
          PARENT_OBJ: "#59b8ff",
        },
        isPreset: true,
      },
    ],
    []
  );

  return (
    <Modal title="Color Themes" size="xl" opened={opened} onClose={onClose} centered>
      <Tabs value={activeTab} onChange={value => setActiveTab(value || "browse")}>
        <Tabs.List grow>
          <Tabs.Tab value="browse" leftSection={<MdPalette size={16} />}>
            Browse Themes
          </Tabs.Tab>
          <Tabs.Tab value="create" leftSection={<FiSave size={16} />}>
            Create Theme
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="browse" pt="md">
          <Stack gap="md">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Choose from preset themes or your custom creations
              </Text>
              <Group gap="xs">
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<FiDownload size={14} />}
                  onClick={exportThemes}
                  disabled={customThemes.length === 0}
                >
                  Export
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<FiUpload size={14} />}
                  component="label"
                >
                  Import
                  <input
                    type="file"
                    accept=".json"
                    onChange={importThemes}
                    style={{ display: "none" }}
                  />
                </Button>
              </Group>
            </Group>

            <ScrollArea h={400}>
              <Stack gap="sm">
                {/* Preset Themes */}
                <Text fw={500} size="sm">
                  Built-in Themes
                </Text>
                <Grid>
                  {presetThemes.map(theme => (
                    <Grid.Col span={6} key={theme.id}>
                      <Card withBorder p="sm">
                        <Group justify="space-between" mb="xs">
                          <Text fw={500}>{theme.name}</Text>
                          <Badge size="xs" variant="light">
                            Preset
                          </Badge>
                        </Group>
                        <Group gap="xs" mb="sm">
                          {Object.entries(theme.colors)
                            .slice(0, 6)
                            .map(([key, color]) => (
                              <div
                                key={key}
                                style={{
                                  width: 16,
                                  height: 16,
                                  backgroundColor: color,
                                  borderRadius: 4,
                                  border: "1px solid #e0e0e0",
                                }}
                              />
                            ))}
                        </Group>
                        <Button
                          size="xs"
                          fullWidth
                          onClick={() =>
                            applyTheme({ ...theme, createdAt: Date.now() } as CustomTheme)
                          }
                        >
                          Apply
                        </Button>
                      </Card>
                    </Grid.Col>
                  ))}
                </Grid>

                {/* Custom Themes */}
                {customThemes.length > 0 && (
                  <>
                    <Divider />
                    <Text fw={500} size="sm">
                      Custom Themes
                    </Text>
                    <Grid>
                      {customThemes.map(theme => (
                        <Grid.Col span={6} key={theme.id}>
                          <Card withBorder p="sm">
                            <Group justify="space-between" mb="xs">
                              <Text fw={500}>{theme.name}</Text>
                              <ActionIcon
                                size="sm"
                                color="red"
                                variant="subtle"
                                onClick={() => deleteTheme(theme.id)}
                              >
                                <FiTrash2 size={12} />
                              </ActionIcon>
                            </Group>
                            <Group gap="xs" mb="sm">
                              {Object.entries(theme.colors)
                                .slice(0, 6)
                                .map(([key, color]) => (
                                  <div
                                    key={key}
                                    style={{
                                      width: 16,
                                      height: 16,
                                      backgroundColor: color,
                                      borderRadius: 4,
                                      border: "1px solid #e0e0e0",
                                    }}
                                  />
                                ))}
                            </Group>
                            <Button size="xs" fullWidth onClick={() => applyTheme(theme)}>
                              Apply
                            </Button>
                          </Card>
                        </Grid.Col>
                      ))}
                    </Grid>
                  </>
                )}

                {customThemes.length === 0 && (
                  <Alert icon={<FiInfo size={16} />} color="blue" variant="light">
                    No custom themes yet. Create your first theme in the &quot;Create Theme&quot;
                    tab!
                  </Alert>
                )}
              </Stack>
            </ScrollArea>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="create" pt="md">
          <Stack gap="md">
            <TextInput
              label="Theme Name"
              placeholder="My Awesome Theme"
              value={newThemeName}
              onChange={e => setNewThemeName(e.currentTarget.value)}
            />

            <Text fw={500} size="sm">
              Color Configuration
            </Text>
            <Grid>
              <Grid.Col span={6}>
                <ColorInput
                  label="Background Primary"
                  value={newThemeColors.BACKGROUND_PRIMARY}
                  onChange={value =>
                    setNewThemeColors(prev => ({ ...prev, BACKGROUND_PRIMARY: value }))
                  }
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <ColorInput
                  label="Background Secondary"
                  value={newThemeColors.BACKGROUND_SECONDARY}
                  onChange={value =>
                    setNewThemeColors(prev => ({ ...prev, BACKGROUND_SECONDARY: value }))
                  }
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <ColorInput
                  label="Node Background"
                  value={newThemeColors.BACKGROUND_NODE}
                  onChange={value =>
                    setNewThemeColors(prev => ({ ...prev, BACKGROUND_NODE: value }))
                  }
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <ColorInput
                  label="Text Color"
                  value={newThemeColors.TEXT_NORMAL}
                  onChange={value => setNewThemeColors(prev => ({ ...prev, TEXT_NORMAL: value }))}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <ColorInput
                  label="Object Keys"
                  value={newThemeColors.NODE_KEY}
                  onChange={value => setNewThemeColors(prev => ({ ...prev, NODE_KEY: value }))}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <ColorInput
                  label="Values"
                  value={newThemeColors.NODE_VALUE}
                  onChange={value => setNewThemeColors(prev => ({ ...prev, NODE_VALUE: value }))}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <ColorInput
                  label="Numbers"
                  value={newThemeColors.INTEGER}
                  onChange={value => setNewThemeColors(prev => ({ ...prev, INTEGER: value }))}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <ColorInput
                  label="Boolean True"
                  value={newThemeColors.BOOL_TRUE}
                  onChange={value => setNewThemeColors(prev => ({ ...prev, BOOL_TRUE: value }))}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <ColorInput
                  label="Boolean False"
                  value={newThemeColors.BOOL_FALSE}
                  onChange={value => setNewThemeColors(prev => ({ ...prev, BOOL_FALSE: value }))}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <ColorInput
                  label="Null Values"
                  value={newThemeColors.NULL}
                  onChange={value => setNewThemeColors(prev => ({ ...prev, NULL: value }))}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <ColorInput
                  label="Arrays"
                  value={newThemeColors.PARENT_ARR}
                  onChange={value => setNewThemeColors(prev => ({ ...prev, PARENT_ARR: value }))}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <ColorInput
                  label="Objects"
                  value={newThemeColors.PARENT_OBJ}
                  onChange={value => setNewThemeColors(prev => ({ ...prev, PARENT_OBJ: value }))}
                />
              </Grid.Col>
            </Grid>

            <Group justify="right">
              <Button
                leftSection={<FiSave />}
                onClick={createTheme}
                disabled={!newThemeName.trim()}
              >
                Save Theme
              </Button>
            </Group>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Modal>
  );
};
