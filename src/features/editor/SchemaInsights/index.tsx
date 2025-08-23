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
} from "@mantine/core";
import {
  FiInfo,
  FiAlertCircle,
  FiCheckCircle,
  FiCode,
  FiDatabase,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
import { TbBraces, TbSpeedboat, TbBulb } from "react-icons/tb";
import useSchemaIntelligence from "../../../store/useSchemaIntelligence";
import { PatternType, SuggestionSeverity } from "../../../types/schema";

interface SchemaInsightsProps {
  onClose?: () => void;
}

export const SchemaInsights: React.FC<SchemaInsightsProps> = ({ onClose }) => {
  const { currentAnalysis, isAnalyzing, analysisError, selectedSuggestionId, selectSuggestion } =
    useSchemaIntelligence();

  const [activeTab, setActiveTab] = useState("overview");
  const [expandedSections, setExpandedSections] = useState<string[]>(["structure"]);

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
        {onClose && (
          <ActionIcon variant="subtle" onClick={onClose} size="sm">
            <FiChevronUp size={16} />
          </ActionIcon>
        )}
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
              Suggestions ({currentAnalysis.suggestions.length})
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
                  <ActionIcon variant="subtle" size="sm" onClick={() => toggleSection("structure")}>
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
                      <Text fw={600}>{currentAnalysis.structure.totalNodes.toLocaleString()}</Text>
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
                        c={currentAnalysis.structure.inconsistentTypes.length > 0 ? "red" : "green"}
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
                    <Text fw={600}>{formatBytes(currentAnalysis.performance.memoryEstimate)}</Text>
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
                    currentAnalysis.performance.memoryEstimate > 10 * 1024 * 1024 ? "red" : "green"
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
              {currentAnalysis.suggestions.length === 0 ? (
                <Alert icon={<FiCheckCircle size={16} />} color="green">
                  No critical suggestions found. Your JSON structure looks good!
                </Alert>
              ) : (
                currentAnalysis.suggestions.map(suggestion => (
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
                    onClick={() => selectSuggestion(suggestion.id)}
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
                    </Stack>
                  </Card>
                ))
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </ScrollArea>
    </Paper>
  );
};
