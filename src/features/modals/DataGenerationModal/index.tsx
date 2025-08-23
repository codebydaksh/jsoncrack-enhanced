import React from "react";
import type { ModalProps } from "@mantine/core";
import {
  Modal,
  Stack,
  Group,
  Button,
  Text,
  Card,
  Badge,
  ActionIcon,
  NumberInput,
  Select,
  ScrollArea,
  Tabs,
  SimpleGrid,
  Progress,
  Alert,
  Code,
} from "@mantine/core";
import { event as gaEvent } from "nextjs-google-analytics";
import { toast } from "react-hot-toast";
import {
  FiDatabase,
  FiDownload,
  FiEye,
  FiPlay,
  FiPlus,
  FiSettings,
  FiTrash2,
  FiRefreshCw,
  FiInfo,
  FiCopy,
  FiEdit,
} from "react-icons/fi";
import { MdDataUsage } from "react-icons/md";
import type { DataTemplate, GeneratedDataset } from "../../../store/useDataGeneration";
import useDataGeneration from "../../../store/useDataGeneration";

interface TemplateCardProps {
  template: DataTemplate;
  onSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isSelected: boolean;
  isCustom?: boolean;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onSelect,
  onEdit,
  onDelete,
  isSelected,
  isCustom = false,
}) => {
  return (
    <Card
      withBorder
      padding="md"
      radius="sm"
      style={{
        cursor: "pointer",
        border: isSelected ? "2px solid var(--mantine-color-blue-filled)" : undefined,
        backgroundColor: isSelected ? "var(--mantine-color-blue-light)" : undefined,
      }}
      onClick={onSelect}
    >
      <Stack gap="sm">
        <Group justify="space-between">
          <Group gap="xs">
            <Badge
              variant="light"
              color={
                template.category === "users"
                  ? "blue"
                  : template.category === "products"
                    ? "green"
                    : template.category === "api"
                      ? "purple"
                      : template.category === "companies"
                        ? "orange"
                        : "gray"
              }
            >
              {template.category}
            </Badge>
            {isCustom && (
              <Badge variant="outline" size="xs">
                Custom
              </Badge>
            )}
          </Group>

          {isCustom && (
            <Group gap="xs">
              {onEdit && (
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  onClick={e => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  <FiEdit size={12} />
                </ActionIcon>
              )}
              {onDelete && (
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  color="red"
                  onClick={e => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <FiTrash2 size={12} />
                </ActionIcon>
              )}
            </Group>
          )}
        </Group>

        <div>
          <Text fw={500} size="sm">
            {template.name}
          </Text>
          <Text size="xs" c="dimmed">
            {template.description}
          </Text>
        </div>

        <Group gap="xs">
          <Text size="xs" c="dimmed">
            {template.mockFields.length} fields
          </Text>
          <Text size="xs" c="dimmed">
            •
          </Text>
          <Text size="xs" c="dimmed">
            {template.sampleSize} samples
          </Text>
        </Group>
      </Stack>
    </Card>
  );
};

interface DatasetCardProps {
  dataset: GeneratedDataset;
  onDownload: () => void;
  onDelete: () => void;
  onPreview: () => void;
}

const DatasetCard: React.FC<DatasetCardProps> = ({ dataset, onDownload, onDelete, onPreview }) => {
  return (
    <Card withBorder padding="md" radius="sm">
      <Stack gap="sm">
        <Group justify="space-between">
          <div>
            <Text fw={500} size="sm">
              {dataset.name}
            </Text>
            <Text size="xs" c="dimmed">
              {new Date(dataset.generatedAt).toLocaleString()}
            </Text>
          </div>
          <Badge variant="light">{dataset.size} records</Badge>
        </Group>

        <Text size="xs" c="dimmed">
          Template: {dataset.template.name}
        </Text>

        <Group gap="xs">
          <Button size="xs" variant="light" leftSection={<FiEye size={12} />} onClick={onPreview}>
            Preview
          </Button>
          <Button
            size="xs"
            variant="light"
            leftSection={<FiDownload size={12} />}
            onClick={onDownload}
          >
            Export
          </Button>
          <ActionIcon size="sm" variant="subtle" color="red" onClick={onDelete}>
            <FiTrash2 size={12} />
          </ActionIcon>
        </Group>
      </Stack>
    </Card>
  );
};

export const DataGenerationModal = ({ opened, onClose }: ModalProps) => {
  const {
    templates,
    customTemplates,
    recentDatasets,
    isGenerating,
    generationProgress,
    selectedTemplate,
    previewData,
    outputFormat,
    setSelectedTemplate,
    setOutputFormat,
    generateData,
    generatePreview,
    clearPreview,
    deleteDataset,
    exportDataset,
    addCustomTemplate,
    deleteTemplate,
  } = useDataGeneration();

  const [generateCount, setGenerateCount] = React.useState(100);
  const [showCustomTemplateEditor, setShowCustomTemplateEditor] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<DataTemplate | null>(null);

  const allTemplates = [...templates, ...customTemplates];

  const handleGenerate = async () => {
    if (!selectedTemplate) {
      toast.error("Please select a template first");
      return;
    }

    try {
      const dataset = await generateData(selectedTemplate, generateCount);
      toast.success(`Generated ${dataset.size} records successfully!`);
      gaEvent("data_generated", {
        template: selectedTemplate.name,
        count: generateCount,
      });
    } catch (error) {
      toast.error("Failed to generate data");
    }
  };

  const handlePreview = () => {
    if (!selectedTemplate) {
      toast.error("Please select a template first");
      return;
    }

    generatePreview(selectedTemplate, 3);
  };

  const handleExportDataset = (dataset: GeneratedDataset) => {
    const exported = exportDataset(dataset, outputFormat);

    const blob = new Blob([exported], {
      type: outputFormat === "json" ? "application/json" : "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${dataset.name.replace(/\s+/g, "_")}.${outputFormat}`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("Dataset exported successfully!");
    gaEvent("dataset_exported", { format: outputFormat });
  };

  const handleCopyToEditor = () => {
    if (!previewData) return;

    // This would integrate with the main JSON editor
    // For now, we'll copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(previewData, null, 2));
    toast.success("Preview data copied to clipboard!");
  };

  return (
    <Modal
      title={
        <Group gap="sm">
          <MdDataUsage size={20} />
          <Text fw={600}>Data Generation Tools</Text>
        </Group>
      }
      size="xl"
      opened={opened}
      onClose={onClose}
      centered
    >
      <Stack gap="md">
        <Tabs defaultValue="generate">
          <Tabs.List>
            <Tabs.Tab value="generate" leftSection={<FiDatabase size={14} />}>
              Generate Data
            </Tabs.Tab>
            <Tabs.Tab value="datasets" leftSection={<FiDownload size={14} />}>
              Recent Datasets
            </Tabs.Tab>
            <Tabs.Tab value="templates" leftSection={<FiSettings size={14} />}>
              Custom Templates
            </Tabs.Tab>
          </Tabs.List>

          {/* Generate Data Tab */}
          <Tabs.Panel value="generate">
            <Stack gap="md" mt="md">
              <Alert icon={<FiInfo size={16} />} color="blue" variant="light">
                <Text size="sm">
                  Generate realistic test data for your applications. Choose from predefined
                  templates or create custom data structures.
                </Text>
              </Alert>

              <Group justify="space-between">
                <Text fw={500}>Select Template</Text>
                <Group gap="xs">
                  <Select
                    size="xs"
                    value={outputFormat}
                    onChange={value => setOutputFormat(value as any)}
                    data={[
                      { value: "json", label: "JSON" },
                      { value: "csv", label: "CSV" },
                      { value: "sql", label: "SQL" },
                      { value: "javascript", label: "JavaScript" },
                      { value: "typescript", label: "TypeScript" },
                    ]}
                    style={{ width: 120 }}
                  />
                </Group>
              </Group>

              <ScrollArea h={200}>
                <SimpleGrid cols={2} spacing="sm">
                  {allTemplates.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      isSelected={selectedTemplate?.id === template.id}
                      isCustom={customTemplates.includes(template)}
                      onSelect={() => {
                        setSelectedTemplate(template);
                        clearPreview();
                      }}
                      onEdit={() => {
                        setEditingTemplate(template);
                        setShowCustomTemplateEditor(true);
                      }}
                      onDelete={() => {
                        deleteTemplate(template.id);
                        if (selectedTemplate?.id === template.id) {
                          setSelectedTemplate(null);
                        }
                        toast.success("Template deleted!");
                      }}
                    />
                  ))}
                </SimpleGrid>
              </ScrollArea>

              {selectedTemplate && (
                <Card withBorder padding="md" radius="sm">
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Text fw={500}>Generation Settings</Text>
                      <Button
                        size="xs"
                        variant="light"
                        leftSection={<FiEye size={12} />}
                        onClick={handlePreview}
                      >
                        Preview
                      </Button>
                    </Group>

                    <NumberInput
                      label="Number of Records"
                      description="How many records to generate"
                      value={generateCount}
                      onChange={value => setGenerateCount(Number(value) || 100)}
                      min={1}
                      max={10000}
                      style={{ width: 200 }}
                    />

                    {isGenerating && (
                      <div>
                        <Group justify="space-between" mb="xs">
                          <Text size="sm">Generating data...</Text>
                          <Text size="sm">{generationProgress}%</Text>
                        </Group>
                        <Progress value={generationProgress} animated />
                      </div>
                    )}

                    <Button
                      leftSection={<FiPlay size={16} />}
                      onClick={handleGenerate}
                      loading={isGenerating}
                      disabled={!selectedTemplate}
                    >
                      Generate Data
                    </Button>
                  </Stack>
                </Card>
              )}

              {previewData && (
                <Card withBorder padding="md" radius="sm">
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Text fw={500}>Preview ({previewData.length} samples)</Text>
                      <Group gap="xs">
                        <Button
                          size="xs"
                          variant="light"
                          leftSection={<FiCopy size={12} />}
                          onClick={handleCopyToEditor}
                        >
                          Copy to Editor
                        </Button>
                        <ActionIcon size="sm" variant="subtle" onClick={clearPreview}>
                          <FiRefreshCw size={12} />
                        </ActionIcon>
                      </Group>
                    </Group>
                    <ScrollArea h={300}>
                      <Code block>{JSON.stringify(previewData, null, 2)}</Code>
                    </ScrollArea>
                  </Stack>
                </Card>
              )}
            </Stack>
          </Tabs.Panel>

          {/* Recent Datasets Tab */}
          <Tabs.Panel value="datasets">
            <Stack gap="md" mt="md">
              <Group justify="space-between">
                <Text fw={500}>Recent Datasets ({recentDatasets.length})</Text>
                <Text size="xs" c="dimmed">
                  Last 10 generated datasets
                </Text>
              </Group>

              {recentDatasets.length === 0 ? (
                <Alert icon={<FiInfo size={16} />} color="gray" variant="light">
                  <Text size="sm">
                    No datasets generated yet. Go to the Generate Data tab to create your first
                    dataset.
                  </Text>
                </Alert>
              ) : (
                <ScrollArea h={400}>
                  <Stack gap="sm">
                    {recentDatasets.map(dataset => (
                      <DatasetCard
                        key={dataset.id}
                        dataset={dataset}
                        onDownload={() => handleExportDataset(dataset)}
                        onDelete={() => {
                          deleteDataset(dataset.id);
                          toast.success("Dataset deleted!");
                        }}
                        onPreview={() => {
                          // Show first 3 items as preview
                          const preview = dataset.data.slice(0, 3);
                          // Set preview (you'd need to add this to the store)
                          toast.success("Preview feature coming soon!");
                        }}
                      />
                    ))}
                  </Stack>
                </ScrollArea>
              )}
            </Stack>
          </Tabs.Panel>

          {/* Custom Templates Tab */}
          <Tabs.Panel value="templates">
            <Stack gap="md" mt="md">
              <Group justify="space-between">
                <Text fw={500}>Custom Templates</Text>
                <Button
                  size="xs"
                  leftSection={<FiPlus size={12} />}
                  onClick={() => {
                    setEditingTemplate(null);
                    setShowCustomTemplateEditor(true);
                  }}
                >
                  Create Template
                </Button>
              </Group>

              {customTemplates.length === 0 ? (
                <Alert icon={<FiInfo size={16} />} color="gray" variant="light">
                  <Text size="sm">
                    No custom templates created yet. Click "Create Template" to build your own data
                    structure.
                  </Text>
                </Alert>
              ) : (
                <SimpleGrid cols={2} spacing="sm">
                  {customTemplates.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      isSelected={false}
                      isCustom={true}
                      onSelect={() => {
                        setSelectedTemplate(template);
                        // Switch to generate tab
                      }}
                      onEdit={() => {
                        setEditingTemplate(template);
                        setShowCustomTemplateEditor(true);
                      }}
                      onDelete={() => {
                        deleteTemplate(template.id);
                        toast.success("Template deleted!");
                      }}
                    />
                  ))}
                </SimpleGrid>
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>

        {/* Template Editor Modal would go here */}
        {showCustomTemplateEditor && (
          <Alert icon={<FiInfo size={16} />} color="yellow" variant="light">
            <Text size="sm">
              Custom template editor is coming soon! For now, you can use the predefined templates.
            </Text>
          </Alert>
        )}

        <Group justify="right">
          <Button onClick={onClose}>Close</Button>
        </Group>
      </Stack>
    </Modal>
  );
};
