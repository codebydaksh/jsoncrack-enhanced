import React, { useState } from "react";
import {
  Modal,
  Stack,
  Group,
  Button,
  Text,
  Tabs,
  Card,
  Select,
  TextInput,
  PasswordInput,
  NumberInput,
  Switch,
  Badge,
  Alert,
  Code,
  ScrollArea,
  Grid,
  Paper,
  ActionIcon,
  Progress,
  Accordion,
  Textarea,
} from "@mantine/core";
import type { ModalProps } from "@mantine/core";
import {
  FiDownload,
  FiDatabase,
  FiTerminal,
  FiCode,
  FiCopy,
  FiPlay,
  FiCheck,
  FiX,
  FiCloud,
  FiBox,
} from "react-icons/fi";
import {
  EnhancedExportEngine,
  type DatabaseConnection,
  type ConnectionTestResult,
  type CLICommand,
} from "../../../lib/utils/enhancedExportIntegration";
import type { SchemaAnalysisResult, DatabaseType } from "../../../store/useSQLSchema";

interface EnhancedExportModalProps extends ModalProps {
  analysisResult: SchemaAnalysisResult;
  generatedSQL: string;
  databaseType: DatabaseType;
}

export const EnhancedExportModal: React.FC<EnhancedExportModalProps> = ({
  opened,
  onClose,
  analysisResult,
  generatedSQL,
  databaseType,
}) => {
  const [activeTab, setActiveTab] = useState("export");
  const [selectedFormat, setSelectedFormat] = useState<string>("sql");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Database connection state
  const [connection, setConnection] = useState<DatabaseConnection>({
    host: "localhost",
    port: 5432,
    database: "myapp",
    username: "postgres",
    ssl: false,
    connectionTimeout: 30,
  });
  const [connectionTest, setConnectionTest] = useState<ConnectionTestResult | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // CLI commands
  const [cliCommands, setCLICommands] = useState<CLICommand[]>([]);

  // Export options
  const [exportOptions, setExportOptions] = useState({
    includeData: false,
    includeMigration: true,
    includeDocumentation: true,
    customTemplate: "",
  });

  const exportFormats = [
    { value: "sql", label: "SQL Script", description: "Standard SQL DDL script" },
    {
      value: "migration",
      label: "Migration Script",
      description: "Versioned migration with rollback",
    },
    { value: "dockerCompose", label: "Docker Compose", description: "Complete Docker setup" },
    { value: "liquibase", label: "Liquibase", description: "XML changelog format" },
    { value: "flyway", label: "Flyway", description: "Flyway migration script" },
    { value: "terraform", label: "Terraform", description: "Infrastructure as code" },
    { value: "kubernetes", label: "Kubernetes", description: "K8s StatefulSet manifest" },
    { value: "documentation", label: "Documentation", description: "Comprehensive docs" },
  ];

  const frameworks = [
    { value: "express", label: "Express.js", description: "Node.js REST API" },
    { value: "fastapi", label: "FastAPI", description: "Python REST API" },
    { value: "spring", label: "Spring Boot", description: "Java REST API" },
    { value: "django", label: "Django", description: "Python web framework" },
  ];

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const result = await EnhancedExportEngine.exportSchema(analysisResult, generatedSQL, {
        format: selectedFormat as any,
        databaseType,
        ...exportOptions,
      });

      clearInterval(progressInterval);
      setExportProgress(100);

      // Download the file
      const blob = new Blob([result.content], { type: result.mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 1000);
    } catch (error) {
      console.error("Export failed:", error);
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    try {
      const result = await EnhancedExportEngine.testDatabaseConnection(connection, databaseType);
      setConnectionTest(result);
    } catch (error) {
      setConnectionTest({
        success: false,
        message: "Connection test failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const generateCLICommands = React.useCallback(() => {
    const commands = EnhancedExportEngine.generateCLICommands(
      analysisResult,
      databaseType,
      connection
    );
    setCLICommands(commands);
  }, [analysisResult, databaseType, connection]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  React.useEffect(() => {
    if (opened) {
      generateCLICommands();
    }
  }, [opened, connection, databaseType, generateCLICommands]);

  const renderExportTab = () => (
    <Stack gap="md">
      <Card withBorder>
        <Text size="sm" fw={500} mb="md">
          Export Format
        </Text>
        <Select
          data={exportFormats}
          value={selectedFormat}
          onChange={value => setSelectedFormat(value || "sql")}
          searchable
        />
        {exportFormats.find(f => f.value === selectedFormat)?.description && (
          <Text size="xs" c="dimmed" mt="xs">
            {exportFormats.find(f => f.value === selectedFormat)?.description}
          </Text>
        )}
      </Card>

      <Card withBorder>
        <Text size="sm" fw={500} mb="md">
          Export Options
        </Text>
        <Stack gap="sm">
          <Switch
            label="Include Data Migration"
            description="Generate INSERT statements with the schema"
            checked={exportOptions.includeMigration}
            onChange={event =>
              setExportOptions(prev => ({
                ...prev,
                includeMigration: event.currentTarget.checked,
              }))
            }
          />
          <Switch
            label="Include Documentation"
            description="Generate comprehensive documentation"
            checked={exportOptions.includeDocumentation}
            onChange={event =>
              setExportOptions(prev => ({
                ...prev,
                includeDocumentation: event.currentTarget.checked,
              }))
            }
          />
          <Switch
            label="Include Sample Data"
            description="Add sample INSERT statements"
            checked={exportOptions.includeData}
            onChange={event =>
              setExportOptions(prev => ({
                ...prev,
                includeData: event.currentTarget.checked,
              }))
            }
          />
        </Stack>
      </Card>

      {exportOptions.customTemplate && (
        <Card withBorder>
          <Text size="sm" fw={500} mb="sm">
            Custom Template
          </Text>
          <Textarea
            placeholder="Enter custom export template..."
            rows={4}
            value={exportOptions.customTemplate}
            onChange={event =>
              setExportOptions(prev => ({
                ...prev,
                customTemplate: event.currentTarget.value,
              }))
            }
          />
        </Card>
      )}

      <Group justify="center">
        <Button
          size="lg"
          leftSection={<FiDownload size={16} />}
          onClick={handleExport}
          loading={isExporting}
          disabled={!selectedFormat}
        >
          {isExporting ? "Exporting..." : "Export Schema"}
        </Button>
      </Group>

      {isExporting && (
        <Card withBorder>
          <Group mb="sm">
            <Text size="sm">Export Progress</Text>
            <Text size="sm" c="dimmed">
              {exportProgress}%
            </Text>
          </Group>
          <Progress value={exportProgress} animated />
        </Card>
      )}
    </Stack>
  );

  const renderConnectionTab = () => (
    <Stack gap="md">
      <Card withBorder>
        <Text size="sm" fw={500} mb="md">
          Database Connection
        </Text>

        <Grid>
          <Grid.Col span={6}>
            <TextInput
              label="Host"
              value={connection.host}
              onChange={event =>
                setConnection(prev => ({
                  ...prev,
                  host: event.currentTarget.value,
                }))
              }
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <NumberInput
              label="Port"
              value={connection.port}
              onChange={value =>
                setConnection(prev => ({
                  ...prev,
                  port: Number(value) || 5432,
                }))
              }
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <TextInput
              label="Database"
              value={connection.database}
              onChange={event =>
                setConnection(prev => ({
                  ...prev,
                  database: event.currentTarget.value,
                }))
              }
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <TextInput
              label="Username"
              value={connection.username}
              onChange={event =>
                setConnection(prev => ({
                  ...prev,
                  username: event.currentTarget.value,
                }))
              }
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <PasswordInput
              label="Password"
              value={connection.password || ""}
              onChange={event =>
                setConnection(prev => ({
                  ...prev,
                  password: event.currentTarget.value,
                }))
              }
            />
          </Grid.Col>
        </Grid>

        <Group mt="md">
          <Switch
            label="Use SSL"
            checked={connection.ssl}
            onChange={event =>
              setConnection(prev => ({
                ...prev,
                ssl: event.currentTarget.checked,
              }))
            }
          />
        </Group>
      </Card>

      <Group justify="center">
        <Button
          leftSection={<FiPlay size={16} />}
          onClick={testConnection}
          loading={isTestingConnection}
          disabled={!connection.host || !connection.username}
        >
          Test Connection
        </Button>
      </Group>

      {connectionTest && (
        <Alert
          color={connectionTest.success ? "green" : "red"}
          icon={connectionTest.success ? <FiCheck size={16} /> : <FiX size={16} />}
        >
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              {connectionTest.message}
            </Text>
            {connectionTest.success && connectionTest.latency && (
              <Text size="xs" c="dimmed">
                Connection time: {connectionTest.latency}ms
              </Text>
            )}
            {connectionTest.serverVersion && (
              <Text size="xs" c="dimmed">
                Server version: {connectionTest.serverVersion}
              </Text>
            )}
            {connectionTest.error && (
              <Text size="xs" c="red">
                Error: {connectionTest.error}
              </Text>
            )}
          </Stack>
        </Alert>
      )}
    </Stack>
  );

  const renderCLITab = () => (
    <Stack gap="md">
      <Card withBorder>
        <Group justify="between" mb="md">
          <Text size="sm" fw={500}>
            CLI Commands
          </Text>
          <Badge variant="light" color="blue">
            {cliCommands.length} commands
          </Badge>
        </Group>

        <Accordion>
          {cliCommands.map((cmd, index) => (
            <Accordion.Item key={index} value={index.toString()}>
              <Accordion.Control>
                <Group justify="between">
                  <Text size="sm">{cmd.description}</Text>
                  <ActionIcon
                    variant="light"
                    size="sm"
                    onClick={e => {
                      e.stopPropagation();
                      copyToClipboard(cmd.command);
                    }}
                  >
                    <FiCopy size={12} />
                  </ActionIcon>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="sm">
                  <Paper p="sm" bg="var(--mantine-color-gray-0)" withBorder>
                    <Code block>{cmd.command}</Code>
                  </Paper>
                  <Text size="xs" c="dimmed">
                    Example: {cmd.example}
                  </Text>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Card>

      <Card withBorder>
        <Text size="sm" fw={500} mb="md">
          Deployment Scripts
        </Text>
        <Group>
          <Button variant="light" size="sm" leftSection={<FiBox size={14} />}>
            Generate Docker Script
          </Button>
          <Button variant="light" size="sm" leftSection={<FiCloud size={14} />}>
            Generate K8s Manifest
          </Button>
        </Group>
      </Card>
    </Stack>
  );

  const renderAPITab = () => (
    <Stack gap="md">
      <Card withBorder>
        <Text size="sm" fw={500} mb="md">
          API Generator
        </Text>
        <Text size="xs" c="dimmed" mb="md">
          Generate REST API endpoints based on your schema
        </Text>

        <Select label="Framework" data={frameworks} searchable />
      </Card>

      <Card withBorder>
        <Text size="sm" fw={500} mb="md">
          API Options
        </Text>
        <Stack gap="sm">
          <Switch label="Include Authentication" />
          <Switch label="Generate CRUD Operations" defaultChecked />
          <Switch label="Include Validation" defaultChecked />
          <Switch label="Add OpenAPI Documentation" />
        </Stack>
      </Card>

      <Group justify="center">
        <Button leftSection={<FiCode size={16} />}>Generate API Code</Button>
      </Group>
    </Stack>
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group>
          <FiDownload size={20} />
          <Text size="lg" fw={600}>
            Enhanced Export & Integration
          </Text>
        </Group>
      }
      size="xl"
      centered
    >
      <Tabs value={activeTab} onChange={value => setActiveTab(value || "export")}>
        <Tabs.List>
          <Tabs.Tab value="export" leftSection={<FiDownload size={16} />}>
            Export
          </Tabs.Tab>
          <Tabs.Tab value="connection" leftSection={<FiDatabase size={16} />}>
            Connection
          </Tabs.Tab>
          <Tabs.Tab value="cli" leftSection={<FiTerminal size={16} />}>
            CLI
          </Tabs.Tab>
          <Tabs.Tab value="api" leftSection={<FiCode size={16} />}>
            API
          </Tabs.Tab>
        </Tabs.List>

        <ScrollArea.Autosize mah={600} mt="md">
          <Tabs.Panel value="export">{renderExportTab()}</Tabs.Panel>
          <Tabs.Panel value="connection">{renderConnectionTab()}</Tabs.Panel>
          <Tabs.Panel value="cli">{renderCLITab()}</Tabs.Panel>
          <Tabs.Panel value="api">{renderAPITab()}</Tabs.Panel>
        </ScrollArea.Autosize>
      </Tabs>
    </Modal>
  );
};
