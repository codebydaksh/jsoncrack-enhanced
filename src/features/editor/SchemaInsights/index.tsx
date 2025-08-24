import React, { useState } from "react";
import {
  Paper,
  Stack,
  Group,
  Text,
  Badge,
  Tabs,
  Alert,
  Progress,
  ActionIcon,
  Collapse,
  ScrollArea,
  Divider,
  Code,
  SimpleGrid,
  Card,
  Loader,
  Center,
  Switch,
  Tooltip,
  Notification,
  Menu,
  Button,
} from "@mantine/core";
import {
  FiInfo,
  FiAlertCircle,
  FiCheckCircle,
  FiCode,
  FiDatabase,
  FiChevronDown,
  FiChevronUp,
  FiRefreshCw,
  FiZap,
  FiPlay,
  FiX,
  FiEye,
  FiDownload,
} from "react-icons/fi";
import { TbBraces, TbSpeedboat, TbBulb } from "react-icons/tb";
import { SchemaExportEngine } from "../../../lib/utils/schemaExport";
import type { ExportOptions } from "../../../lib/utils/schemaExport";
import useJson from "../../../store/useJson";
import useSchemaIntelligence from "../../../store/useSchemaIntelligence";
import { PatternType, SuggestionSeverity } from "../../../types/schema";
import { SuggestionActions } from "./SuggestionActions";

interface SchemaInsightsProps {
  onClose?: () => void;
}

export const SchemaInsights: React.FC<SchemaInsightsProps> = ({ onClose }) => {
  const {
    currentAnalysis,
    isAnalyzing,
    analysisError,
    selectedSuggestionId,
    appliedSuggestions,
    dismissedSuggestions,
    realTimeEnabled,
    applySuggestion,
    dismissSuggestion,
    toggleRealTime,
    analyzeData,
  } = useSchemaIntelligence();
  const getJson = useJson(state => state.getJson);

  const [activeTab, setActiveTab] = useState("overview");
  const [expandedSections, setExpandedSections] = useState<string[]>(["structure"]);
  const [detailedSuggestionModalOpen, setDetailedSuggestionModalOpen] = useState(false);
  const [detailedSuggestion, setDetailedSuggestion] = useState<any>(null);
  const [actionStatus, setActionStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const handleManualRefresh = async () => {
    try {
      const jsonData = getJson();
      if (jsonData && jsonData.trim()) {
        const parsedData = JSON.parse(jsonData);
        await analyzeData(parsedData);
      }
    } catch (error) {
      console.error("Manual analysis failed:", error);
    }
  };

  const handleApplySuggestion = async (suggestionId: string) => {
    try {
      applySuggestion(suggestionId);
      setActionStatus({
        type: "success",
        message: "Suggestion applied successfully!",
      });

      // Clear status after 3 seconds
      setTimeout(() => {
        setActionStatus({ type: null, message: "" });
      }, 3000);
    } catch (error) {
      setActionStatus({
        type: "error",
        message: "Failed to apply suggestion. Please try again.",
      });
    }
  };

  const handleDismissSuggestion = (suggestionId: string) => {
    dismissSuggestion(suggestionId);
    setActionStatus({
      type: "success",
      message: "Suggestion dismissed",
    });

    setTimeout(() => {
      setActionStatus({ type: null, message: "" });
    }, 2000);
  };

  const handleOpenDetailedSuggestion = (suggestion: any) => {
    setDetailedSuggestion(suggestion);
    setDetailedSuggestionModalOpen(true);
  };

  const handleExportAnalysis = (format: "json" | "csv" | "markdown" | "text") => {
    if (!currentAnalysis) return;

    try {
      const exportOptions: ExportOptions = {
        format,
        includeAnalysis: true,
        includeSuggestions: true,
        includeSchema: true,
        includePatterns: true,
        includePerformance: true,
      };

      const exportResult = SchemaExportEngine.exportAnalysis(currentAnalysis, exportOptions);
      SchemaExportEngine.downloadExport(exportResult);

      setActionStatus({
        type: "success",
        message: `Analysis exported as ${format.toUpperCase()}`,
      });

      setTimeout(() => {
        setActionStatus({ type: null, message: "" });
      }, 3000);
    } catch (error) {
      setActionStatus({
        type: "error",
        message: "Failed to export analysis",
      });
    }
  };

  const handleExportSuggestions = (format: "json" | "csv" | "markdown") => {
    if (!currentAnalysis || currentAnalysis.suggestions.length === 0) return;

    try {
      const exportResult = SchemaExportEngine.exportSuggestions(
        currentAnalysis.suggestions,
        format
      );
      SchemaExportEngine.downloadExport(exportResult);

      setActionStatus({
        type: "success",
        message: `Suggestions exported as ${format.toUpperCase()}`,
      });

      setTimeout(() => {
        setActionStatus({ type: null, message: "" });
      }, 3000);
    } catch (error) {
      setActionStatus({
        type: "error",
        message: "Failed to export suggestions",
      });
    }
  };

  const handleExportSchema = () => {
    if (!currentAnalysis) return;

    try {
      const exportResult = SchemaExportEngine.exportSchema(currentAnalysis.generatedSchema);
      SchemaExportEngine.downloadExport(exportResult);

      setActionStatus({
        type: "success",
        message: "JSON Schema exported",
      });

      setTimeout(() => {
        setActionStatus({ type: null, message: "" });
      }, 3000);
    } catch (error) {
      setActionStatus({
        type: "error",
        message: "Failed to export schema",
      });
    }
  };

  const getFilteredSuggestions = () => {
    if (!currentAnalysis) return [];

    return currentAnalysis.suggestions.filter(
      suggestion =>
        !appliedSuggestions.includes(suggestion.id) && !dismissedSuggestions.includes(suggestion.id)
    );
  };

  if (isAnalyzing) {
    return (
      <Paper withBorder p="md" h={400}>
        <Center h="100%">
          <Stack align="center" gap="md">
            <Loader size="lg" />
            <Text size="sm" c="dimmed">
              Analyzing schema...
            </Text>
          </Stack>
        </Center>
      </Paper>
    );
  }

  if (analysisError) {
    return (
      <Paper withBorder p="md">
        <Alert icon={<FiAlertCircle size={16} />} color="red" title="Analysis Failed">
          {analysisError}
        </Alert>
      </Paper>
    );
  }

  if (!currentAnalysis) {
    return (
      <Paper withBorder p="md">
        <Alert icon={<FiInfo size={16} />} color="blue" title="No Analysis Available">
          Import or paste JSON data to see schema insights.
        </Alert>
      </Paper>
    );
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

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
      case SuggestionSeverity.INFO:
        return "gray";
      default:
        return "gray";
    }
  };

  const getPatternIcon = (pattern: PatternType) => {
    switch (pattern) {
      case PatternType.EMAIL:
        return "📧";
      case PatternType.URL:
        return "🔗";
      case PatternType.UUID:
        return "🆔";
      case PatternType.DATE:
        return "📅";
      case PatternType.DATETIME:
        return "🕒";
      case PatternType.PHONE:
        return "📞";
      case PatternType.IP_ADDRESS:
        return "🌐";
      case PatternType.ENUM:
        return "📋";
      case PatternType.COORDINATE:
        return "📍";
      case PatternType.COLOR:
        return "🎨";
      case PatternType.BASE64:
        return "💾";
      default:
        return "🔍";
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <>
      {/* Action Status Notification */}
      {actionStatus.type && (
        <Notification
          color={actionStatus.type === "success" ? "green" : "red"}
          title={actionStatus.type === "success" ? "Success" : "Error"}
          onClose={() => setActionStatus({ type: null, message: "" })}
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 1000,
          }}
        >
          {actionStatus.message}
        </Notification>
      )}

      {/* Detailed Suggestion Modal */}
      {detailedSuggestionModalOpen && detailedSuggestion && (
        <SuggestionActions
          suggestion={detailedSuggestion}
          onApply={async id => await handleApplySuggestion(id)}
          onDismiss={handleDismissSuggestion}
          onClose={() => setDetailedSuggestionModalOpen(false)}
        />
      )}

      <Paper withBorder h="100%" style={{ display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <Group justify="space-between" p="md" pb="xs">
          <Group gap="xs">
            <TbBraces size={20} />
            <Text fw={600} size="sm">
              Schema Intelligence
            </Text>
            <Badge size="xs" color="green" variant="light">
              {Math.round(currentAnalysis.confidence * 100)}% confidence
            </Badge>
          </Group>
          <Group gap="xs">
            <Tooltip
              label={realTimeEnabled ? "Real-time analysis enabled" : "Real-time analysis disabled"}
            >
              <Switch
                size="sm"
                checked={realTimeEnabled}
                onChange={toggleRealTime}
                thumbIcon={
                  realTimeEnabled ? (
                    <FiZap size={12} color="orange" />
                  ) : (
                    <FiZap size={12} color="gray" />
                  )
                }
              />
            </Tooltip>

            {currentAnalysis && (
              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <Tooltip label="Export analysis">
                    <ActionIcon variant="subtle" size="sm">
                      <FiDownload size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Label>Export Full Analysis</Menu.Label>
                  <Menu.Item onClick={() => handleExportAnalysis("json")}>JSON Format</Menu.Item>
                  <Menu.Item onClick={() => handleExportAnalysis("markdown")}>
                    Markdown Report
                  </Menu.Item>
                  <Menu.Item onClick={() => handleExportAnalysis("csv")}>CSV Data</Menu.Item>
                  <Menu.Item onClick={() => handleExportAnalysis("text")}>Text Report</Menu.Item>

                  <Menu.Divider />
                  <Menu.Label>Export Components</Menu.Label>
                  <Menu.Item onClick={() => handleExportSuggestions("json")}>
                    Suggestions Only
                  </Menu.Item>
                  <Menu.Item onClick={handleExportSchema}>JSON Schema Only</Menu.Item>
                </Menu.Dropdown>
              </Menu>
            )}

            <Tooltip label="Refresh analysis">
              <ActionIcon
                variant="subtle"
                onClick={handleManualRefresh}
                loading={isAnalyzing}
                size="sm"
              >
                <FiRefreshCw size={16} />
              </ActionIcon>
            </Tooltip>
            {onClose && (
              <ActionIcon variant="subtle" onClick={onClose} size="sm">
                <FiChevronUp size={16} />
              </ActionIcon>
            )}
          </Group>
        </Group>

        <Divider />

        {/* Content */}
        <ScrollArea flex={1}>
          <Tabs value={activeTab} onChange={value => setActiveTab(value || "overview")}>
            <Tabs.List px="md" pt="xs">
              <Tabs.Tab value="overview" leftSection={<FiInfo size={14} />}>
                Overview
              </Tabs.Tab>
              <Tabs.Tab value="patterns" leftSection={<FiCode size={14} />}>
                Patterns ({currentAnalysis.patterns.length})
              </Tabs.Tab>
              <Tabs.Tab value="performance" leftSection={<TbSpeedboat size={14} />}>
                Performance
              </Tabs.Tab>
              <Tabs.Tab value="suggestions" leftSection={<TbBulb size={14} />}>
                Suggestions ({getFilteredSuggestions().length})
              </Tabs.Tab>
              <Tabs.Tab value="schema" leftSection={<TbBraces size={14} />}>
                Schema
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="overview" p="md">
              <Stack gap="md">
                {/* Structure Overview */}
                <Card withBorder>
                  <Group justify="space-between" mb="xs">
                    <Group gap="xs">
                      <FiDatabase size={16} />
                      <Text fw={500} size="sm">
                        Structure Analysis
                      </Text>
                    </Group>
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      onClick={() => toggleSection("structure")}
                    >
                      {expandedSections.includes("structure") ? (
                        <FiChevronUp size={14} />
                      ) : (
                        <FiChevronDown size={14} />
                      )}
                    </ActionIcon>
                  </Group>

                  <Collapse in={expandedSections.includes("structure")}>
                    <SimpleGrid cols={2} spacing="xs">
                      <Stack gap={4}>
                        <Text size="xs" c="dimmed">
                          Total Nodes
                        </Text>
                        <Text fw={600}>
                          {currentAnalysis.structure.totalNodes.toLocaleString()}
                        </Text>
                      </Stack>
                      <Stack gap={4}>
                        <Text size="xs" c="dimmed">
                          Max Depth
                        </Text>
                        <Text fw={600}>{currentAnalysis.structure.maxDepth}</Text>
                      </Stack>
                      <Stack gap={4}>
                        <Text size="xs" c="dimmed">
                          Field Types
                        </Text>
                        <Text fw={600}>
                          {Object.keys(currentAnalysis.structure.fieldTypes).length}
                        </Text>
                      </Stack>
                      <Stack gap={4}>
                        <Text size="xs" c="dimmed">
                          Issues Found
                        </Text>
                        <Text
                          fw={600}
                          c={
                            currentAnalysis.structure.inconsistentTypes.length > 0 ? "red" : "green"
                          }
                        >
                          {currentAnalysis.structure.inconsistentTypes.length +
                            currentAnalysis.structure.duplicateKeys.length +
                            currentAnalysis.structure.missingFields.length}
                        </Text>
                      </Stack>
                    </SimpleGrid>
                  </Collapse>
                </Card>

                {/* Performance Overview */}
                <Card withBorder>
                  <Group justify="space-between" mb="xs">
                    <Group gap="xs">
                      <TbSpeedboat size={16} />
                      <Text fw={500} size="sm">
                        Performance Metrics
                      </Text>
                    </Group>
                  </Group>

                  <SimpleGrid cols={2} spacing="xs">
                    <Stack gap={4}>
                      <Text size="xs" c="dimmed">
                        Memory Usage
                      </Text>
                      <Text fw={600}>
                        {formatBytes(currentAnalysis.performance.memoryEstimate)}
                      </Text>
                    </Stack>
                    <Stack gap={4}>
                      <Text size="xs" c="dimmed">
                        Large Arrays
                      </Text>
                      <Text
                        fw={600}
                        c={currentAnalysis.performance.largeArrays.length > 0 ? "orange" : "green"}
                      >
                        {currentAnalysis.performance.largeArrays.length}
                      </Text>
                    </Stack>
                    <Stack gap={4}>
                      <Text size="xs" c="dimmed">
                        Deep Nesting
                      </Text>
                      <Text
                        fw={600}
                        c={currentAnalysis.performance.deepNesting.length > 0 ? "orange" : "green"}
                      >
                        {currentAnalysis.performance.deepNesting.length}
                      </Text>
                    </Stack>
                    <Stack gap={4}>
                      <Text size="xs" c="dimmed">
                        Duplicates
                      </Text>
                      <Text
                        fw={600}
                        c={currentAnalysis.performance.duplicateData.length > 0 ? "red" : "green"}
                      >
                        {currentAnalysis.performance.duplicateData.length}
                      </Text>
                    </Stack>
                  </SimpleGrid>
                </Card>

                {/* Quick Stats */}
                <Card withBorder>
                  <Text fw={500} size="sm" mb="xs">
                    Quick Stats
                  </Text>
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text size="xs">Real-time Analysis</Text>
                      <Badge size="xs" color={realTimeEnabled ? "green" : "gray"} variant="light">
                        {realTimeEnabled ? "Active" : "Disabled"}
                      </Badge>
                    </Group>
                    {currentAnalysis.patterns.length > 0 && (
                      <Group justify="space-between">
                        <Text size="xs">Detected Patterns</Text>
                        <Badge size="xs" color="blue">
                          {currentAnalysis.patterns.length}
                        </Badge>
                      </Group>
                    )}
                    {currentAnalysis.performance.optimizationOpportunities.length > 0 && (
                      <Group justify="space-between">
                        <Text size="xs">Optimization Opportunities</Text>
                        <Badge size="xs" color="yellow">
                          {currentAnalysis.performance.optimizationOpportunities.length}
                        </Badge>
                      </Group>
                    )}
                    <Group justify="space-between">
                      <Text size="xs">Analysis Timestamp</Text>
                      <Text size="xs" c="dimmed">
                        {new Date(currentAnalysis.timestamp).toLocaleTimeString()}
                      </Text>
                    </Group>
                  </Stack>
                </Card>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="patterns" p="md">
              <Stack gap="md">
                {currentAnalysis.patterns.length === 0 ? (
                  <Alert icon={<FiInfo size={16} />} color="blue">
                    No patterns detected. This could indicate varied data or low confidence
                    thresholds.
                  </Alert>
                ) : (
                  currentAnalysis.patterns.map((pattern, index) => (
                    <Card key={index} withBorder>
                      <Group justify="space-between" mb="xs">
                        <Group gap="xs">
                          <Text>{getPatternIcon(pattern.pattern)}</Text>
                          <Text fw={500} size="sm">
                            {pattern.pattern.replace(/_/g, " ").toUpperCase()}
                          </Text>
                          <Badge size="xs" color="green" variant="light">
                            {Math.round(pattern.confidence * 100)}% confidence
                          </Badge>
                        </Group>
                      </Group>

                      <Stack gap="xs">
                        <Text size="xs" c="dimmed">
                          Field: {pattern.field}
                        </Text>
                        <Text size="xs">{pattern.suggestion}</Text>

                        {pattern.examples && pattern.examples.length > 0 && (
                          <Stack gap={4}>
                            <Text size="xs" fw={500}>
                              Examples:
                            </Text>
                            {pattern.examples.slice(0, 3).map((example, i) => (
                              <Code key={i}>{String(example)}</Code>
                            ))}
                          </Stack>
                        )}

                        {pattern.validationRule && (
                          <Stack gap={4}>
                            <Text size="xs" fw={500}>
                              Validation Rule:
                            </Text>
                            <Code block>{pattern.validationRule}</Code>
                          </Stack>
                        )}
                      </Stack>
                    </Card>
                  ))
                )}
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="performance" p="md">
              <Stack gap="md">
                {/* Memory Usage */}
                <Card withBorder>
                  <Text fw={500} size="sm" mb="xs">
                    Memory Analysis
                  </Text>
                  <Group justify="space-between" mb="xs">
                    <Text size="sm">Estimated Usage</Text>
                    <Text fw={600}>{formatBytes(currentAnalysis.performance.memoryEstimate)}</Text>
                  </Group>

                  {/* Memory bar */}
                  <Progress
                    value={Math.min(
                      100,
                      (currentAnalysis.performance.memoryEstimate / (10 * 1024 * 1024)) * 100
                    )}
                    color={
                      currentAnalysis.performance.memoryEstimate > 10 * 1024 * 1024
                        ? "red"
                        : "green"
                    }
                    size="sm"
                  />
                </Card>

                {/* Large Arrays */}
                {currentAnalysis.performance.largeArrays.length > 0 && (
                  <Card withBorder>
                    <Text fw={500} size="sm" mb="xs">
                      Large Arrays
                    </Text>
                    <Stack gap="xs">
                      {currentAnalysis.performance.largeArrays.map((array, index) => (
                        <Group key={index} justify="space-between">
                          <Stack gap={2} style={{ flex: 1 }}>
                            <Text size="xs" fw={500}>
                              {array.path}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {array.suggestion}
                            </Text>
                          </Stack>
                          <Badge size="xs" color="orange">
                            {array.size.toLocaleString()} items
                          </Badge>
                        </Group>
                      ))}
                    </Stack>
                  </Card>
                )}

                {/* Deep Nesting */}
                {currentAnalysis.performance.deepNesting.length > 0 && (
                  <Card withBorder>
                    <Text fw={500} size="sm" mb="xs">
                      Deep Nesting Issues
                    </Text>
                    <Stack gap="xs">
                      {currentAnalysis.performance.deepNesting.map((nesting, index) => (
                        <Group key={index} justify="space-between">
                          <Stack gap={2} style={{ flex: 1 }}>
                            <Text size="xs" fw={500}>
                              {nesting.path}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {nesting.suggestion}
                            </Text>
                          </Stack>
                          <Badge size="xs" color="yellow">
                            {nesting.depth} levels
                          </Badge>
                        </Group>
                      ))}
                    </Stack>
                  </Card>
                )}

                {/* Duplicates */}
                {currentAnalysis.performance.duplicateData.length > 0 && (
                  <Card withBorder>
                    <Text fw={500} size="sm" mb="xs">
                      Duplicate Data
                    </Text>
                    <Stack gap="xs">
                      {currentAnalysis.performance.duplicateData.map((duplicate, index) => (
                        <Group key={index} justify="space-between">
                          <Stack gap={2} style={{ flex: 1 }}>
                            <Text size="xs" fw={500}>
                              {duplicate.paths.length} occurrences
                            </Text>
                            <Text size="xs" c="dimmed">
                              {duplicate.suggestion}
                            </Text>
                          </Stack>
                          <Badge size="xs" color="red">
                            {formatBytes(duplicate.memoryWaste)} wasted
                          </Badge>
                        </Group>
                      ))}
                    </Stack>
                  </Card>
                )}

                {/* Optimization Suggestions */}
                {currentAnalysis.performance.optimizationOpportunities.length > 0 && (
                  <Card withBorder>
                    <Text fw={500} size="sm" mb="xs">
                      Optimization Opportunities
                    </Text>
                    <Stack gap="xs">
                      {currentAnalysis.performance.optimizationOpportunities.map((opt, index) => (
                        <Alert key={index} variant="light" color="blue" icon={<TbBulb size={16} />}>
                          <Stack gap={4}>
                            <Text size="sm" fw={500}>
                              {opt.description}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {opt.implementation}
                            </Text>
                            <Badge size="xs" color="blue" variant="light">
                              {opt.impact} impact
                            </Badge>
                          </Stack>
                        </Alert>
                      ))}
                    </Stack>
                  </Card>
                )}
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="suggestions" p="md">
              <Stack gap="md">
                {/* Applied/Dismissed Status */}
                {(appliedSuggestions.length > 0 || dismissedSuggestions.length > 0) && (
                  <Alert icon={<FiInfo size={16} />} color="blue" variant="light">
                    <Group justify="space-between">
                      <Group gap="md">
                        {appliedSuggestions.length > 0 && (
                          <Text size="xs">
                            <strong>{appliedSuggestions.length}</strong> suggestions applied
                          </Text>
                        )}
                        {dismissedSuggestions.length > 0 && (
                          <Text size="xs">
                            <strong>{dismissedSuggestions.length}</strong> suggestions dismissed
                          </Text>
                        )}
                      </Group>

                      {getFilteredSuggestions().length > 0 && (
                        <Menu shadow="md" width={180}>
                          <Menu.Target>
                            <Button
                              size="xs"
                              variant="light"
                              leftSection={<FiDownload size={12} />}
                            >
                              Export
                            </Button>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item onClick={() => handleExportSuggestions("json")}>
                              JSON Format
                            </Menu.Item>
                            <Menu.Item onClick={() => handleExportSuggestions("markdown")}>
                              Markdown Report
                            </Menu.Item>
                            <Menu.Item onClick={() => handleExportSuggestions("csv")}>
                              CSV Data
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      )}
                    </Group>
                  </Alert>
                )}

                {/* Export button for when no applied/dismissed status shown */}
                {!(appliedSuggestions.length > 0 || dismissedSuggestions.length > 0) &&
                  getFilteredSuggestions().length > 0 && (
                    <Group justify="flex-end">
                      <Menu shadow="md" width={180}>
                        <Menu.Target>
                          <Button size="xs" variant="light" leftSection={<FiDownload size={12} />}>
                            Export Suggestions
                          </Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item onClick={() => handleExportSuggestions("json")}>
                            JSON Format
                          </Menu.Item>
                          <Menu.Item onClick={() => handleExportSuggestions("markdown")}>
                            Markdown Report
                          </Menu.Item>
                          <Menu.Item onClick={() => handleExportSuggestions("csv")}>
                            CSV Data
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  )}

                {getFilteredSuggestions().length === 0 ? (
                  <Alert icon={<FiCheckCircle size={16} />} color="green">
                    {currentAnalysis?.suggestions.length === 0
                      ? "No critical suggestions found. Your JSON structure looks good!"
                      : "All suggestions have been reviewed. Great work!"}
                  </Alert>
                ) : (
                  getFilteredSuggestions().map(suggestion => (
                    <Card
                      key={suggestion.id}
                      withBorder
                      style={{
                        cursor: "pointer",
                        borderColor:
                          selectedSuggestionId === suggestion.id
                            ? "var(--mantine-primary-color-5)"
                            : undefined,
                      }}
                      onClick={() => handleOpenDetailedSuggestion(suggestion)}
                    >
                      <Group justify="space-between" mb="xs">
                        <Group gap="xs">
                          <Badge size="sm" color={getSeverityColor(suggestion.severity)}>
                            {suggestion.severity}
                          </Badge>
                          <Badge size="sm" variant="light" color="gray">
                            {suggestion.category.replace(/_/g, " ")}
                          </Badge>
                        </Group>
                        <Badge size="xs" color="blue" variant="light">
                          {Math.round(suggestion.confidence * 100)}% confidence
                        </Badge>
                      </Group>

                      <Stack gap="xs">
                        <Text fw={500} size="sm">
                          {suggestion.title}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {suggestion.description}
                        </Text>

                        {suggestion.field && (
                          <Group gap="xs">
                            <Text size="xs" c="dimmed">
                              Field:
                            </Text>
                            <Code>{suggestion.field}</Code>
                          </Group>
                        )}

                        {/* Action Buttons */}
                        <Group justify="space-between" mt="xs">
                          <Group gap="xs">
                            <Text size="xs" c="dimmed">
                              Impact:
                            </Text>
                            <Badge size="xs" color="orange" variant="light">
                              {suggestion.impact}
                            </Badge>
                          </Group>

                          <Group gap="xs">
                            <Tooltip label="View details & apply">
                              <ActionIcon
                                variant="light"
                                color="blue"
                                size="sm"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleOpenDetailedSuggestion(suggestion);
                                }}
                              >
                                <FiEye size={14} />
                              </ActionIcon>
                            </Tooltip>

                            <Tooltip label="Apply suggestion">
                              <ActionIcon
                                variant="light"
                                color="green"
                                size="sm"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleApplySuggestion(suggestion.id);
                                }}
                              >
                                <FiPlay size={14} />
                              </ActionIcon>
                            </Tooltip>

                            <Tooltip label="Dismiss suggestion">
                              <ActionIcon
                                variant="light"
                                color="red"
                                size="sm"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleDismissSuggestion(suggestion.id);
                                }}
                              >
                                <FiX size={14} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Group>
                      </Stack>
                    </Card>
                  ))
                )}
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="schema" p="md">
              <Stack gap="md">
                <Group justify="space-between">
                  <Group gap="xs">
                    <Text fw={500} size="sm">
                      Generated JSON Schema
                    </Text>
                    <Badge size="xs" color="blue" variant="light">
                      Draft-07
                    </Badge>
                  </Group>

                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<FiDownload size={14} />}
                    onClick={handleExportSchema}
                  >
                    Export Schema
                  </Button>
                </Group>

                <Alert icon={<FiInfo size={16} />} color="blue" variant="light">
                  <Text size="xs">
                    Auto-generated JSON Schema based on detected patterns, types, and validations.
                    This schema can be used for validation, documentation, or code generation.
                  </Text>
                </Alert>

                <Card withBorder>
                  <ScrollArea.Autosize mah={400}>
                    <Code block>{JSON.stringify(currentAnalysis.generatedSchema, null, 2)}</Code>
                  </ScrollArea.Autosize>
                </Card>

                {/* Schema Statistics */}
                <Card withBorder>
                  <Text fw={500} size="sm" mb="xs">
                    Schema Statistics
                  </Text>
                  <SimpleGrid cols={2} spacing="xs">
                    <Stack gap={4}>
                      <Text size="xs" c="dimmed">
                        Schema Type
                      </Text>
                      <Text fw={600} size="sm">
                        {currentAnalysis.generatedSchema.type || "Mixed"}
                      </Text>
                    </Stack>
                    <Stack gap={4}>
                      <Text size="xs" c="dimmed">
                        Properties
                      </Text>
                      <Text fw={600} size="sm">
                        {currentAnalysis.generatedSchema.properties
                          ? Object.keys(currentAnalysis.generatedSchema.properties).length
                          : 0}
                      </Text>
                    </Stack>
                    <Stack gap={4}>
                      <Text size="xs" c="dimmed">
                        Required Fields
                      </Text>
                      <Text fw={600} size="sm">
                        {currentAnalysis.generatedSchema.required?.length || 0}
                      </Text>
                    </Stack>
                    <Stack gap={4}>
                      <Text size="xs" c="dimmed">
                        Has Validations
                      </Text>
                      <Text fw={600} size="sm">
                        {JSON.stringify(currentAnalysis.generatedSchema).includes('"format"') ||
                        JSON.stringify(currentAnalysis.generatedSchema).includes('"pattern"') ||
                        JSON.stringify(currentAnalysis.generatedSchema).includes('"enum"')
                          ? "Yes"
                          : "No"}
                      </Text>
                    </Stack>
                  </SimpleGrid>
                </Card>
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </ScrollArea>
      </Paper>
    </>
  );
};
