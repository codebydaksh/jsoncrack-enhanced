import React from "react";
import type { ModalProps } from "@mantine/core";
import { 
  Modal, 
  Stack, 
  Group, 
  Button, 
  Text, 
  Loader, 
  Alert, 
  Tabs, 
  Card,
  Badge,
  ScrollArea,
  ActionIcon,
  Tooltip,
  Switch,
  Flex
} from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import { event as gaEvent } from "nextjs-google-analytics";
import { 
  FiDatabase, 
  FiGrid, 
  FiGitCommit, 
  FiDownload, 
  FiRefreshCw,
  FiSettings,
  FiEye,
  FiCode,
  FiAlertTriangle,
  FiCheck,
  FiInfo
} from "react-icons/fi";
import useJson from "../../../store/useJson";
import useSQLSchema, { 
  DatabaseType, 
  NormalizationLevel, 
  NamingConvention 
} from "../../../store/useSQLSchema";
import { SchemaConfigurationPanel } from "./SchemaConfigurationPanel";
import { TableVisualization } from "./TableVisualization";
import { RelationshipDiagram } from "./RelationshipDiagram";
import { SchemaStatistics } from "./SchemaStatistics";
import { ValidationResults } from "./ValidationResults";

export const SQLSchemaModal = ({ opened, onClose }: ModalProps) => {
  const getJson = useJson(state => state.getJson);
  
  const {
    config,
    analysisResult,
    generatedSQL,
    isGenerating,
    error,
    previewMode,
    selectedTable,
    generateSchema,
    exportSQL,
    setPreviewMode,
    clear
  } = useSQLSchema();

  const [activeTab, setActiveTab] = React.useState<string>("config");
  const [validationResults, setValidationResults] = React.useState<any>(null);
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  // Generate schema when modal opens or config changes
  React.useEffect(() => {
    if (opened) {
      const jsonData = getJson();
      if (jsonData && jsonData.trim()) {
        handleGenerateSchema();
      }
    }
  }, [opened, config.databaseType, config.normalizationLevel]);

  // Cleanup when modal closes
  React.useEffect(() => {
    if (!opened) {
      clear();
      setValidationResults(null);
      setActiveTab("config");
    }
  }, [opened]);

  const handleGenerateSchema = async () => {
    try {
      const jsonData = getJson();
      if (!jsonData || !jsonData.trim()) {
        throw new Error("No JSON data available to analyze");
      }

      await generateSchema(jsonData);
      setActiveTab("preview");
      
      gaEvent("sql_schema_generated", { 
        database: config.databaseType,
        normalization: config.normalizationLevel 
      });
    } catch (err) {
      console.error("Schema generation failed:", err);
    }
  };

  const handleExport = () => {
    exportSQL();
    gaEvent("sql_schema_exported", { database: config.databaseType });
  };

  const handleValidateSchema = async () => {
    if (!generatedSQL) return;
    
    try {
      const { validateGeneratedSQL } = await import("../../../lib/utils/sqlSchemaGeneration");
      const results = await validateGeneratedSQL(generatedSQL, config.databaseType);
      setValidationResults(results);
      gaEvent("sql_schema_validated", { database: config.databaseType });
    } catch (err) {
      console.error("Validation failed:", err);
    }
  };

  const renderConfigurationTab = () => (
    <Stack gap="md">
      <SchemaConfigurationPanel />
      
      <Card withBorder>
        <Group justify="apart" mb="sm">
          <Text size="sm" fw={500}>Advanced Options</Text>
          <Switch
            checked={showAdvanced}
            onChange={(event) => setShowAdvanced(event.currentTarget.checked)}
          />
        </Group>
        
        {showAdvanced && (
          <Stack gap="sm">
            <Group>
              <Text size="xs" c="dimmed">
                Enable advanced features like performance optimization and custom constraints
              </Text>
            </Group>
          </Stack>
        )}
      </Card>

      <Group justify="center">
        <Button
          onClick={handleGenerateSchema}
          loading={isGenerating}
          leftSection={<FiRefreshCw size={16} />}
          size="lg"
          disabled={!getJson()?.trim()}
        >
          {isGenerating ? "Analyzing JSON..." : "Generate SQL Schema"}
        </Button>
      </Group>
    </Stack>
  );

  const renderPreviewTab = () => {
    if (!analysisResult) {
      return (
        <Stack align="center" gap="md">
          <Text c="dimmed">No schema generated yet. Configure settings and generate a schema first.</Text>
        </Stack>
      );
    }

    return (
      <Stack gap="md">
        {/* Schema Statistics */}
        <SchemaStatistics analysisResult={analysisResult} />

        {/* Preview Mode Selector */}
        <Group justify="center">
          <Button.Group>
            <Button
              variant={previewMode === "TABLES" ? "filled" : "outline"}
              leftSection={<FiGrid size={16} />}
              onClick={() => setPreviewMode("TABLES")}
            >
              Tables
            </Button>
            <Button
              variant={previewMode === "RELATIONSHIPS" ? "filled" : "outline"}
              leftSection={<FiGitCommit size={16} />}
              onClick={() => setPreviewMode("RELATIONSHIPS")}
            >
              Relationships
            </Button>
            <Button
              variant={previewMode === "SQL" ? "filled" : "outline"}
              leftSection={<FiCode size={16} />}
              onClick={() => setPreviewMode("SQL")}
            >
              SQL Code
            </Button>
          </Button.Group>
        </Group>

        {/* Preview Content */}
        {previewMode === "TABLES" && (
          <TableVisualization 
            tables={analysisResult.tables}
            selectedTable={selectedTable}
            onTableSelect={(tableName) => {
              // Handle table selection for detailed view
              console.log("Selected table:", tableName);
            }}
          />
        )}

        {previewMode === "RELATIONSHIPS" && (
          <RelationshipDiagram 
            tables={analysisResult.tables}
            relationships={analysisResult.relationships}
          />
        )}

        {previewMode === "SQL" && (
          <Card withBorder>
            <Group justify="apart" mb="md">
              <Text size="sm" fw={500}>
                Generated SQL Schema ({config.databaseType})
              </Text>
              <Group>
                <Tooltip label="Validate SQL syntax">
                  <ActionIcon
                    variant="light"
                    onClick={handleValidateSchema}
                    loading={false}
                  >
                    <FiCheck size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Export SQL file">
                  <ActionIcon
                    variant="light"
                    color="blue"
                    onClick={handleExport}
                  >
                    <FiDownload size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
            
            <ScrollArea.Autosize mah={500}>
              <CodeHighlight
                language="sql"
                code={generatedSQL || "-- No SQL generated yet"}
                copyLabel="Copy SQL to clipboard"
                copiedLabel="SQL copied to clipboard"
                styles={{ root: { borderRadius: 6 } }}
              />
            </ScrollArea.Autosize>
          </Card>
        )}

        {/* Validation Results */}
        {validationResults && (
          <ValidationResults results={validationResults} />
        )}

        {/* Schema Recommendations */}
        {analysisResult.recommendations.length > 0 && (
          <Card withBorder>
            <Group mb="sm">
              <FiInfo size={20} />
              <Text size="sm" fw={500}>Schema Recommendations</Text>
            </Group>
            
            <Stack gap="xs">
              {analysisResult.recommendations.map((rec, index) => (
                <Alert
                  key={index}
                  variant="light"
                  color={rec.severity === "HIGH" ? "red" : rec.severity === "MEDIUM" ? "orange" : "blue"}
                  icon={<FiAlertTriangle size={16} />}
                >
                  <Text size="sm" fw={500}>{rec.message}</Text>
                  <Text size="xs" c="dimmed">{rec.suggestedAction}</Text>
                  <Text size="xs" c="dimmed" fs="italic">{rec.impact}</Text>
                </Alert>
              ))}
            </Stack>
          </Card>
        )}
      </Stack>
    );
  };

  return (
    <Modal
      title={
        <Group>
          <FiDatabase size={24} />
          <Text size="lg" fw={600}>SQL Schema Generator</Text>
        </Group>
      }
      size="xl"
      opened={opened}
      onClose={onClose}
      centered
      styles={{
        content: { maxHeight: "90vh" },
        body: { padding: 0 }
      }}
    >
      <Stack gap={0}>
        {/* Error Display */}
        {error && (
          <Alert 
            color="red" 
            icon={<FiAlertTriangle size={16} />}
            mb="md"
            mx="md"
          >
            {error}
          </Alert>
        )}

        {/* Loading Overlay */}
        {isGenerating && (
          <Flex align="center" justify="center" gap="md" p="xl">
            <Loader size="sm" />
            <Text c="dimmed">Analyzing JSON structure and generating SQL schema...</Text>
          </Flex>
        )}

        {/* Main Content Tabs */}
        {!isGenerating && (
          <Tabs value={activeTab} onChange={(value) => setActiveTab(value || "config")}>
            <Tabs.List px="md">
              <Tabs.Tab value="config" leftSection={<FiSettings size={16} />}>
                Configuration
              </Tabs.Tab>
              <Tabs.Tab 
                value="preview" 
                leftSection={<FiEye size={16} />}
                disabled={!analysisResult}
              >
                Preview & Export
              </Tabs.Tab>
            </Tabs.List>

            <ScrollArea.Autosize mah={600} px="md" py="md">
              <Tabs.Panel value="config">
                {renderConfigurationTab()}
              </Tabs.Panel>

              <Tabs.Panel value="preview">
                {renderPreviewTab()}
              </Tabs.Panel>
            </ScrollArea.Autosize>
          </Tabs>
        )}

        {/* Footer Actions */}
        {!isGenerating && (
          <Group justify="apart" p="md" style={{ borderTop: "1px solid var(--mantine-color-gray-3)" }}>
            <Group>
              {analysisResult && (
                <Badge variant="light" color="blue">
                  {analysisResult.tables.length} tables generated
                </Badge>
              )}
            </Group>
            
            <Group>
              <Button variant="subtle" onClick={onClose}>
                Close
              </Button>
              
              {generatedSQL && (
                <Button
                  leftSection={<FiDownload size={16} />}
                  onClick={handleExport}
                >
                  Export SQL
                </Button>
              )}
            </Group>
          </Group>
        )}
      </Stack>
    </Modal>
  );
};