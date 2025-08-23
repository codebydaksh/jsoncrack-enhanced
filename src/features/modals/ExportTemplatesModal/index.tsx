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
  ScrollArea,
  Tabs,
  SimpleGrid,
  Progress,
  Alert,
  Code,
  TextInput,
  Switch,
  Menu,
  FileInput,
} from "@mantine/core";
import { event as gaEvent } from "nextjs-google-analytics";
import { toast } from "react-hot-toast";
import {
  FiDownload,
  FiEye,
  FiPlay,
  FiPlus,
  FiSettings,
  FiTrash2,
  FiCopy,
  FiEdit,
  FiUpload,
  FiRefreshCw,
  FiInfo,
  FiChevronDown,
  FiFile,
  FiCode,
  FiImage,
} from "react-icons/fi";
import { MdTransform } from "react-icons/md";
import type { ExportTemplate, ExportResult } from "../../../store/useExportTemplates";
import useExportTemplates from "../../../store/useExportTemplates";
import useJson from "../../../store/useJson";

interface TemplateCardProps {
  template: ExportTemplate;
  onSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  isSelected: boolean;
  isCustom?: boolean;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
  isSelected,
  isCustom = false,
}) => {
  const getFormatIcon = () => {
    switch (template.format) {
      case "json":
        return <FiFile size={14} />;
      case "html":
      case "markdown":
        return <FiCode size={14} />;
      case "pdf":
      case "docx":
        return <FiImage size={14} />;
      default:
        return <FiFile size={14} />;
    }
  };

  const getCategoryColor = () => {
    switch (template.category) {
      case "document":
        return "blue";
      case "code":
        return "green";
      case "data":
        return "purple";
      case "visualization":
        return "orange";
      default:
        return "gray";
    }
  };

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
            {getFormatIcon()}
            <Text fw={500} size="sm">
              {template.name}
            </Text>
          </Group>

          <Group gap="xs">
            <Badge variant="light" color={getCategoryColor()}>
              {template.category}
            </Badge>
            <Badge variant="outline" size="xs">
              {template.format.toUpperCase()}
            </Badge>
            {isCustom && (
              <Badge variant="outline" size="xs" color="orange">
                Custom
              </Badge>
            )}
          </Group>
        </Group>

        <Text size="xs" c="dimmed" lineClamp={2}>
          {template.description}
        </Text>

        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            {template.transformations.length} transformation
            {template.transformations.length !== 1 ? "s" : ""}
          </Text>

          {isCustom && (
            <Menu>
              <Menu.Target>
                <ActionIcon size="sm" variant="subtle" onClick={e => e.stopPropagation()}>
                  <FiChevronDown size={12} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                {onEdit && (
                  <Menu.Item leftSection={<FiEdit size={12} />} onClick={onEdit}>
                    Edit
                  </Menu.Item>
                )}
                {onDuplicate && (
                  <Menu.Item leftSection={<FiCopy size={12} />} onClick={onDuplicate}>
                    Duplicate
                  </Menu.Item>
                )}
                {onDelete && (
                  <Menu.Item leftSection={<FiTrash2 size={12} />} color="red" onClick={onDelete}>
                    Delete
                  </Menu.Item>
                )}
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      </Stack>
    </Card>
  );
};

interface ExportResultCardProps {
  result: ExportResult;
  onDownload: () => void;
  onDelete: () => void;
  onPreview: () => void;
}

const ExportResultCard: React.FC<ExportResultCardProps> = ({
  result,
  onDownload,
  onDelete,
  onPreview,
}) => {
  return (
    <Card withBorder padding="md" radius="sm">
      <Stack gap="sm">
        <Group justify="space-between">
          <div>
            <Text fw={500} size="sm">
              {result.metadata.title}
            </Text>
            <Text size="xs" c="dimmed">
              {new Date(result.generatedAt).toLocaleString()}
            </Text>
          </div>
          <Badge variant="light">{result.format.toUpperCase()}</Badge>
        </Group>

        <Text size="xs" c="dimmed">
          Template: {result.templateName} • Size: {(result.size / 1024).toFixed(1)} KB
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
            Download
          </Button>
          <ActionIcon size="sm" variant="subtle" color="red" onClick={onDelete}>
            <FiTrash2 size={12} />
          </ActionIcon>
        </Group>
      </Stack>
    </Card>
  );
};

export const ExportTemplatesModal = ({ opened, onClose }: ModalProps) => {
  const {
    templates,
    customTemplates,
    recentExports,
    selectedTemplate,
    isExporting,
    exportProgress,
    previewContent,
    enablePreview,
    setSelectedTemplate,
    setEnablePreview,
    exportData,
    generatePreview,
    clearPreview,
    deleteExportResult,
    duplicateTemplate,
    deleteTemplate,
    importTemplate,
    exportTemplate,
  } = useExportTemplates();

  const getJson = useJson(state => state.getJson);
  const [activeTab, setActiveTab] = React.useState("export");
  const [showTemplateEditor, setShowTemplateEditor] = React.useState(false);
  const [_editingTemplate, setEditingTemplate] = React.useState<ExportTemplate | null>(null);
  const [customTitle, setCustomTitle] = React.useState("");
  const [customAuthor, setCustomAuthor] = React.useState("JSON Crack User");

  const allTemplates = [...templates, ...customTemplates];

  const handleExport = async () => {
    if (!selectedTemplate) {
      toast.error("Please select a template first");
      return;
    }

    const jsonData = getJson();
    if (!jsonData) {
      toast.error("No JSON data to export");
      return;
    }

    try {
      const parsedData = JSON.parse(jsonData);
      const _result = await exportData(parsedData, selectedTemplate, {
        title: customTitle || `Export - ${selectedTemplate.name}`,
        author: customAuthor,
      });

      toast.success("Export completed successfully!");
      gaEvent("advanced_export", {
        template: selectedTemplate.name,
        format: selectedTemplate.format,
      });

      // Switch to results tab
      setActiveTab("results");
    } catch (error) {
      toast.error("Failed to export data");
    }
  };

  const handlePreview = () => {
    if (!selectedTemplate) {
      toast.error("Please select a template first");
      return;
    }

    const jsonData = getJson();
    if (!jsonData) {
      toast.error("No JSON data to preview");
      return;
    }

    try {
      const parsedData = JSON.parse(jsonData);
      generatePreview(parsedData, selectedTemplate);
    } catch (error) {
      toast.error("Failed to generate preview");
    }
  };

  const handleDownloadResult = (result: ExportResult) => {
    const blob = new Blob([result.content], {
      type: getContentType(result.format),
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.metadata.title.replace(/\s+/g, "_")}.${result.format}`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("File downloaded successfully!");
  };

  const handleImportTemplate = (file: File | null) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      const content = e.target?.result as string;
      if (importTemplate(content)) {
        toast.success("Template imported successfully!");
      } else {
        toast.error("Failed to import template - invalid format");
      }
    };
    reader.readAsText(file);
  };

  const handleExportTemplate = (templateId: string) => {
    const templateData = exportTemplate(templateId);
    if (templateData) {
      const blob = new Blob([templateData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `template_${templateId}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Template exported successfully!");
    }
  };

  const getContentType = (format: string): string => {
    const types: Record<string, string> = {
      json: "application/json",
      xml: "application/xml",
      html: "text/html",
      css: "text/css",
      csv: "text/csv",
      sql: "application/sql",
      yaml: "application/yaml",
      markdown: "text/markdown",
      typescript: "text/typescript",
      javascript: "application/javascript",
      python: "text/x-python",
    };
    return types[format] || "text/plain";
  };

  return (
    <Modal
      title={
        <Group gap="sm">
          <MdTransform size={20} />
          <Text fw={600}>Advanced Export Templates</Text>
        </Group>
      }
      size="xl"
      opened={opened}
      onClose={onClose}
      centered
    >
      <Stack gap="md">
        <Tabs value={activeTab} onChange={value => setActiveTab(value || "export")}>
          <Tabs.List>
            <Tabs.Tab value="export" leftSection={<FiDownload size={14} />}>
              Export Data
            </Tabs.Tab>
            <Tabs.Tab value="results" leftSection={<FiFile size={14} />}>
              Recent Exports ({recentExports.length})
            </Tabs.Tab>
            <Tabs.Tab value="templates" leftSection={<FiSettings size={14} />}>
              Manage Templates
            </Tabs.Tab>
          </Tabs.List>

          {/* Export Data Tab */}
          <Tabs.Panel value="export">
            <Stack gap="md" mt="md">
              <Alert icon={<FiInfo size={16} />} color="blue" variant="light">
                <Text size="sm">
                  Transform and export your JSON data using powerful templates. Generate documents,
                  code, visualizations, and more.
                </Text>
              </Alert>

              <Group justify="space-between">
                <Text fw={500}>Select Export Template</Text>
                <Switch
                  size="sm"
                  label="Live Preview"
                  checked={enablePreview}
                  onChange={e => setEnablePreview(e.currentTarget.checked)}
                />
              </Group>

              <ScrollArea h={250}>
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
                        if (enablePreview) {
                          setTimeout(handlePreview, 100);
                        }
                      }}
                      onDuplicate={() => {
                        duplicateTemplate(template.id);
                        toast.success("Template duplicated!");
                      }}
                      onDelete={() => {
                        deleteTemplate(template.id);
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
                      <Text fw={500}>Export Settings</Text>
                      <Group gap="xs">
                        <Button
                          size="xs"
                          variant="light"
                          leftSection={<FiEye size={12} />}
                          onClick={handlePreview}
                        >
                          Preview
                        </Button>
                        <Button
                          size="xs"
                          variant="light"
                          leftSection={<FiUpload size={12} />}
                          onClick={() => handleExportTemplate(selectedTemplate.id)}
                        >
                          Export Template
                        </Button>
                      </Group>
                    </Group>

                    <SimpleGrid cols={2} spacing="md">
                      <TextInput
                        label="Export Title"
                        placeholder="My Data Export"
                        value={customTitle}
                        onChange={e => setCustomTitle(e.target.value)}
                      />
                      <TextInput
                        label="Author"
                        placeholder="Your name"
                        value={customAuthor}
                        onChange={e => setCustomAuthor(e.target.value)}
                      />
                    </SimpleGrid>

                    {isExporting && (
                      <div>
                        <Group justify="space-between" mb="xs">
                          <Text size="sm">Exporting data...</Text>
                          <Text size="sm">{exportProgress}%</Text>
                        </Group>
                        <Progress value={exportProgress} animated />
                      </div>
                    )}

                    <Button
                      leftSection={<FiPlay size={16} />}
                      onClick={handleExport}
                      loading={isExporting}
                      disabled={!selectedTemplate}
                    >
                      Export Data
                    </Button>
                  </Stack>
                </Card>
              )}

              {previewContent && (
                <Card withBorder padding="md" radius="sm">
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Text fw={500}>Preview</Text>
                      <ActionIcon size="sm" variant="subtle" onClick={clearPreview}>
                        <FiRefreshCw size={12} />
                      </ActionIcon>
                    </Group>
                    <ScrollArea h={300}>
                      <Code block>{previewContent}</Code>
                    </ScrollArea>
                  </Stack>
                </Card>
              )}
            </Stack>
          </Tabs.Panel>

          {/* Recent Exports Tab */}
          <Tabs.Panel value="results">
            <Stack gap="md" mt="md">
              <Group justify="space-between">
                <Text fw={500}>Recent Exports</Text>
                <Text size="xs" c="dimmed">
                  Last 20 exports
                </Text>
              </Group>

              {recentExports.length === 0 ? (
                <Alert icon={<FiInfo size={16} />} color="gray" variant="light">
                  <Text size="sm">
                    No exports yet. Go to the Export Data tab to create your first export.
                  </Text>
                </Alert>
              ) : (
                <ScrollArea h={400}>
                  <Stack gap="sm">
                    {recentExports.map(result => (
                      <ExportResultCard
                        key={result.id}
                        result={result}
                        onDownload={() => handleDownloadResult(result)}
                        onDelete={() => {
                          deleteExportResult(result.id);
                          toast.success("Export deleted!");
                        }}
                        onPreview={() => {
                          // Show preview in modal or new tab
                          toast.success("Preview feature coming soon!");
                        }}
                      />
                    ))}
                  </Stack>
                </ScrollArea>
              )}
            </Stack>
          </Tabs.Panel>

          {/* Manage Templates Tab */}
          <Tabs.Panel value="templates">
            <Stack gap="md" mt="md">
              <Group justify="space-between">
                <Text fw={500}>Custom Templates</Text>
                <Group gap="xs">
                  <FileInput
                    placeholder="Import template"
                    accept=".json"
                    onChange={handleImportTemplate}
                    size="xs"
                    style={{ width: 150 }}
                  />
                  <Button
                    size="xs"
                    leftSection={<FiPlus size={12} />}
                    onClick={() => {
                      setEditingTemplate(null);
                      setShowTemplateEditor(true);
                    }}
                  >
                    Create Template
                  </Button>
                </Group>
              </Group>

              {customTemplates.length === 0 ? (
                <Alert icon={<FiInfo size={16} />} color="gray" variant="light">
                  <Text size="sm">
                    No custom templates created yet. Click "Create Template" to build your own
                    export format.
                  </Text>
                </Alert>
              ) : (
                <ScrollArea h={400}>
                  <SimpleGrid cols={2} spacing="sm">
                    {customTemplates.map(template => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        isSelected={false}
                        isCustom={true}
                        onSelect={() => {
                          setSelectedTemplate(template);
                          setActiveTab("export");
                        }}
                        onEdit={() => {
                          setEditingTemplate(template);
                          setShowTemplateEditor(true);
                        }}
                        onDuplicate={() => {
                          duplicateTemplate(template.id);
                          toast.success("Template duplicated!");
                        }}
                        onDelete={() => {
                          deleteTemplate(template.id);
                          toast.success("Template deleted!");
                        }}
                      />
                    ))}
                  </SimpleGrid>
                </ScrollArea>
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>

        {/* Template Editor would go here */}
        {showTemplateEditor && (
          <Alert icon={<FiInfo size={16} />} color="yellow" variant="light">
            <Text size="sm">
              Custom template editor is coming soon! For now, you can use and duplicate the
              predefined templates.
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
