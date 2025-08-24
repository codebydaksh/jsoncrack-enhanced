import React, { useState, useCallback } from "react";
import {
  Stack,
  Group,
  Card,
  Text,
  Badge,
  Alert,
  Button,
  Grid,
  ActionIcon,
  ScrollArea,
  Paper,
  Code,
  Tabs,
  NumberInput,
  Select,
  Switch,
  Center,
  RingProgress,
  Accordion,
} from "@mantine/core";
import {
  FiDatabase,
  FiPlay,
  FiDownload,
  FiCopy,
  FiAlertTriangle,
  FiSettings,
  FiRefreshCw,
  FiFileText,
  FiZap,
} from "react-icons/fi";
import type { MigrationConfig, MigrationResult } from "../../../lib/utils/dataMigration";
import { migrateJSONToSQL } from "../../../lib/utils/dataMigration";
import useJson from "../../../store/useJson";
import type { SchemaAnalysisResult } from "../../../store/useSQLSchema";
import useSQLSchema from "../../../store/useSQLSchema";

interface MigrationPanelProps {
  analysisResult: SchemaAnalysisResult;
}

export const MigrationPanel: React.FC<MigrationPanelProps> = ({ analysisResult }) => {
  const { config } = useSQLSchema();
  const { json } = useJson();

  const [migrationConfig, setMigrationConfig] = useState<MigrationConfig>({
    batchSize: 1000,
    includeSchema: true,
    handleDuplicates: "SKIP",
    dateFormat: "YYYY-MM-DD HH:mm:ss",
    nullHandling: "NULL",
    escapeStrategy: "STANDARD",
    validateData: true,
    generateTransactionBlocks: true,
  });

  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<string>("config");
  const [migrationStatus, setMigrationStatus] = useState<
    "idle" | "running" | "completed" | "error"
  >("idle");

  const runMigration = useCallback(async () => {
    if (!json || !analysisResult.tables.length) {
      return;
    }

    setIsProcessing(true);
    setMigrationStatus("running");
    setProgress(0);

    try {
      const result = await migrateJSONToSQL(
        json,
        analysisResult.tables,
        analysisResult.relationships,
        config,
        migrationConfig,
        progress => setProgress(progress)
      );

      setMigrationResult(result);
      setMigrationStatus(result.errors.length > 0 ? "error" : "completed");
    } catch (error) {
      console.error("Migration failed:", error);
      setMigrationStatus("error");
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  }, [json, analysisResult, config, migrationConfig]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  const downloadSQL = () => {
    if (!migrationResult) return;

    const sqlContent = migrationResult.insertStatements.join("\n\n");
    const blob = new Blob([sqlContent], { type: "text/sql" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `migration_${Date.now()}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetMigration = () => {
    setMigrationResult(null);
    setProgress(0);
    setMigrationStatus("idle");
  };

  const renderConfigurationPanel = () => (
    <Stack gap="md">
      <Card withBorder>
        <Text size="sm" fw={500} mb="md">
          Migration Settings
        </Text>

        <Grid>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <NumberInput
              label="Batch Size"
              description="Number of records to process per batch"
              value={migrationConfig.batchSize}
              onChange={value =>
                setMigrationConfig(prev => ({ ...prev, batchSize: Number(value) || 1000 }))
              }
              min={1}
              max={10000}
              step={100}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Select
              label="Handle Duplicates"
              description="Strategy for handling duplicate records"
              value={migrationConfig.handleDuplicates}
              onChange={value =>
                setMigrationConfig(prev => ({
                  ...prev,
                  handleDuplicates: value as "SKIP" | "UPDATE" | "ERROR",
                }))
              }
              data={[
                { value: "SKIP", label: "Skip duplicates" },
                { value: "UPDATE", label: "Update existing" },
                { value: "ERROR", label: "Throw error" },
              ]}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Select
              label="Null Handling"
              description="How to handle null/undefined values"
              value={migrationConfig.nullHandling}
              onChange={value =>
                setMigrationConfig(prev => ({
                  ...prev,
                  nullHandling: value as "NULL" | "EMPTY_STRING" | "DEFAULT_VALUE",
                }))
              }
              data={[
                { value: "NULL", label: "Use NULL" },
                { value: "EMPTY_STRING", label: "Empty string" },
                { value: "DEFAULT_VALUE", label: "Default value" },
              ]}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Select
              label="Escape Strategy"
              description="String escaping strategy for SQL safety"
              value={migrationConfig.escapeStrategy}
              onChange={value =>
                setMigrationConfig(prev => ({
                  ...prev,
                  escapeStrategy: value as "STANDARD" | "AGGRESSIVE",
                }))
              }
              data={[
                { value: "STANDARD", label: "Standard escaping" },
                { value: "AGGRESSIVE", label: "Aggressive escaping" },
              ]}
            />
          </Grid.Col>
        </Grid>

        <Stack gap="xs" mt="md">
          <Switch
            label="Include Schema Creation"
            description="Include CREATE TABLE statements before INSERT statements"
            checked={migrationConfig.includeSchema}
            onChange={event =>
              setMigrationConfig(prev => ({
                ...prev,
                includeSchema: event.currentTarget.checked,
              }))
            }
          />

          <Switch
            label="Validate Data"
            description="Perform data validation before generating INSERT statements"
            checked={migrationConfig.validateData}
            onChange={event =>
              setMigrationConfig(prev => ({
                ...prev,
                validateData: event.currentTarget.checked,
              }))
            }
          />

          <Switch
            label="Generate Transaction Blocks"
            description="Wrap INSERT statements in BEGIN/COMMIT blocks"
            checked={migrationConfig.generateTransactionBlocks}
            onChange={event =>
              setMigrationConfig(prev => ({
                ...prev,
                generateTransactionBlocks: event.currentTarget.checked,
              }))
            }
          />
        </Stack>
      </Card>

      <Card withBorder>
        <Group justify="apart" mb="md">
          <Text size="sm" fw={500}>
            Migration Preview
          </Text>
          <Badge variant="light" color="blue">
            {analysisResult.tables.length} tables
          </Badge>
        </Group>

        <Stack gap="xs">
          <Text size="xs" c="dimmed">
            Tables to migrate: {analysisResult.tables.map(t => t.name).join(", ")}
          </Text>
          <Text size="xs" c="dimmed">
            Estimated records: {Array.isArray(json) ? json.length : "1 record"}
          </Text>
          <Text size="xs" c="dimmed">
            Target database: {config.databaseType}
          </Text>
        </Stack>
      </Card>
    </Stack>
  );

  const renderProgressPanel = () => (
    <Stack gap="md">
      <Card withBorder>
        <Group justify="apart" mb="md">
          <Group>
            <FiDatabase size={20} />
            <Text size="sm" fw={500}>
              Migration Status
            </Text>
          </Group>
          <Badge
            variant="light"
            color={
              migrationStatus === "completed"
                ? "green"
                : migrationStatus === "error"
                  ? "red"
                  : migrationStatus === "running"
                    ? "blue"
                    : "gray"
            }
          >
            {migrationStatus.toUpperCase()}
          </Badge>
        </Group>

        <Center>
          <RingProgress
            size={180}
            thickness={16}
            sections={[
              {
                value: progress,
                color:
                  migrationStatus === "completed"
                    ? "green"
                    : migrationStatus === "error"
                      ? "red"
                      : "blue",
              },
            ]}
            label={
              <Center>
                <Stack align="center" gap={0}>
                  <Text size="xl" fw={700}>
                    {Math.round(progress)}%
                  </Text>
                  <Text size="xs" c="dimmed">
                    {isProcessing ? "Processing..." : "Complete"}
                  </Text>
                </Stack>
              </Center>
            }
          />
        </Center>
      </Card>

      <Group justify="center">
        <Button
          leftSection={<FiPlay size={16} />}
          onClick={runMigration}
          loading={isProcessing}
          disabled={!json || migrationStatus === "running"}
          color="blue"
        >
          {migrationStatus === "idle" ? "Start Migration" : "Run Again"}
        </Button>

        {migrationStatus !== "idle" && (
          <Button
            variant="light"
            leftSection={<FiRefreshCw size={16} />}
            onClick={resetMigration}
            disabled={isProcessing}
          >
            Reset
          </Button>
        )}
      </Group>
    </Stack>
  );

  const renderResultsPanel = () => {
    if (!migrationResult) {
      return (
        <Center py="xl">
          <Stack align="center" gap="md">
            <FiFileText size={48} color="var(--mantine-color-gray-4)" />
            <Text size="lg" fw={500} c="dimmed">
              No migration results available
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              Run a migration to see the generated SQL statements
            </Text>
          </Stack>
        </Center>
      );
    }

    return (
      <Stack gap="md">
        <Group justify="apart">
          <Group>
            <Text size="sm" fw={500}>
              Generated SQL Statements
            </Text>
            <Badge variant="light" color="blue">
              {migrationResult.insertStatements.length} statements
            </Badge>
          </Group>

          <Group>
            <Button
              variant="light"
              size="xs"
              leftSection={<FiCopy size={14} />}
              onClick={() => copyToClipboard(migrationResult.insertStatements.join("\n\n"))}
            >
              Copy All
            </Button>
            <Button
              variant="light"
              size="xs"
              leftSection={<FiDownload size={14} />}
              onClick={downloadSQL}
            >
              Download SQL
            </Button>
          </Group>
        </Group>

        <ScrollArea.Autosize mah={400}>
          <Stack gap="sm">
            {migrationResult.insertStatements.map((statement, index) => (
              <Paper key={index} p="sm" withBorder>
                <Group justify="apart" mb="xs">
                  <Text size="xs" c="dimmed">
                    Statement {index + 1}
                  </Text>
                  <ActionIcon variant="subtle" size="sm" onClick={() => copyToClipboard(statement)}>
                    <FiCopy size={12} />
                  </ActionIcon>
                </Group>
                <Code block>
                  {statement.length > 500 ? `${statement.substring(0, 500)}...` : statement}
                </Code>
              </Paper>
            ))}
          </Stack>
        </ScrollArea.Autosize>

        {migrationResult.errors.length > 0 && (
          <Card withBorder>
            <Text size="sm" fw={500} mb="md">
              Errors
            </Text>

            <Accordion variant="contained">
              <Accordion.Item value="errors">
                <Accordion.Control
                  icon={<FiAlertTriangle size={16} color="var(--mantine-color-red-6)" />}
                >
                  <Group>
                    <Text size="sm" fw={500}>
                      Errors
                    </Text>
                    <Badge variant="light" color="red" size="xs">
                      {migrationResult.errors.length}
                    </Badge>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="xs">
                    {migrationResult.errors.map((error, index) => (
                      <Alert key={index} variant="light" color="red">
                        <Text size="xs" fw={500}>
                          {error.tableName} (Record {error.recordIndex})
                        </Text>
                        <Text size="xs">{error.message}</Text>
                      </Alert>
                    ))}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          </Card>
        )}
      </Stack>
    );
  };

  return (
    <Stack gap="md">
      <Group justify="apart">
        <Group>
          <FiZap size={20} />
          <Text size="sm" fw={500}>
            Data Migration
          </Text>
        </Group>
        <Badge
          variant="light"
          color={
            migrationStatus === "completed" ? "green" : migrationStatus === "error" ? "red" : "blue"
          }
        >
          {migrationStatus === "idle" ? "Ready" : migrationStatus.toUpperCase()}
        </Badge>
      </Group>

      <Tabs value={activeTab} onChange={value => setActiveTab(value || "config")}>
        <Tabs.List>
          <Tabs.Tab value="config" leftSection={<FiSettings size={14} />}>
            Configuration
          </Tabs.Tab>
          <Tabs.Tab value="progress" leftSection={<FiPlay size={14} />}>
            Migration
          </Tabs.Tab>
          <Tabs.Tab value="results" leftSection={<FiFileText size={14} />}>
            Results
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="config" pt="md">
          {renderConfigurationPanel()}
        </Tabs.Panel>

        <Tabs.Panel value="progress" pt="md">
          {renderProgressPanel()}
        </Tabs.Panel>

        <Tabs.Panel value="results" pt="md">
          {renderResultsPanel()}
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};
