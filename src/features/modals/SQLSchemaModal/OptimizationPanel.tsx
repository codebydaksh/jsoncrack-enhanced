import React, { useState, useEffect, useCallback } from "react";
import {
  Stack,
  Group,
  Card,
  Text,
  Badge,
  Alert,
  Accordion,
  ScrollArea,
  Paper,
  Button,
  Progress,
  Grid,
  ActionIcon,
  Tabs,
  RingProgress,
  Center,
  Code,
} from "@mantine/core";
import {
  FiZap,
  FiDatabase,
  FiTrendingUp,
  FiAlertTriangle,
  FiCheckCircle,
  FiInfo,
  FiPlay,
  FiCopy,
  FiBarChart,
  FiSettings,
  FiLayers,
} from "react-icons/fi";
import type {
  OptimizationRecommendation,
  PerformanceAnalysis,
  IndexStrategy,
  PartitioningStrategy,
} from "../../../lib/utils/schemaOptimization";
import { optimizeSchema } from "../../../lib/utils/schemaOptimization";
import type { SchemaAnalysisResult } from "../../../store/useSQLSchema";
import useSQLSchema from "../../../store/useSQLSchema";

interface OptimizationPanelProps {
  analysisResult: SchemaAnalysisResult;
}

export const OptimizationPanel: React.FC<OptimizationPanelProps> = ({ analysisResult }) => {
  const { config } = useSQLSchema();
  const [optimizations, setOptimizations] = useState<{
    recommendations: OptimizationRecommendation[];
    performanceAnalysis: PerformanceAnalysis;
    indexStrategies: IndexStrategy[];
    partitioningStrategies: PartitioningStrategy[];
  } | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("overview");

  const runOptimization = useCallback(async () => {
    setIsOptimizing(true);
    try {
      const result = await optimizeSchema(
        analysisResult.tables,
        analysisResult.relationships,
        config
      );
      setOptimizations(result);
    } catch (error) {
      console.error("Optimization failed:", error);
    } finally {
      setIsOptimizing(false);
    }
  }, [analysisResult, config]);

  useEffect(() => {
    if (analysisResult) {
      runOptimization();
    }
  }, [analysisResult, config, runOptimization]);

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case "HIGH":
        return "red";
      case "MEDIUM":
        return "orange";
      case "LOW":
        return "yellow";
      default:
        return "gray";
    }
  };

  const getImpactColor = (impact: string): string => {
    switch (impact) {
      case "CRITICAL":
        return "red";
      case "HIGH":
        return "orange";
      case "MEDIUM":
        return "yellow";
      case "LOW":
        return "blue";
      default:
        return "gray";
    }
  };

  const getPerformanceColor = (score: number): string => {
    if (score >= 80) return "green";
    if (score >= 60) return "yellow";
    if (score >= 40) return "orange";
    return "red";
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  const renderPerformanceOverview = () => {
    if (!optimizations) return null;

    const { performanceAnalysis } = optimizations;

    return (
      <Stack gap="md">
        {/* Overall Performance Score */}
        <Card withBorder>
          <Group justify="apart" mb="md">
            <Group>
              <FiBarChart size={20} />
              <Text size="sm" fw={500}>
                Overall Performance Score
              </Text>
            </Group>
            <Badge
              variant="light"
              color={getPerformanceColor(performanceAnalysis.overallScore)}
              size="lg"
            >
              {performanceAnalysis.overallScore}%
            </Badge>
          </Group>

          <Center>
            <RingProgress
              size={180}
              thickness={16}
              sections={[
                {
                  value: performanceAnalysis.overallScore,
                  color: getPerformanceColor(performanceAnalysis.overallScore),
                },
              ]}
              label={
                <Center>
                  <Stack align="center" gap={0}>
                    <Text size="xl" fw={700}>
                      {performanceAnalysis.overallScore}%
                    </Text>
                    <Text size="xs" c="dimmed">
                      Performance
                    </Text>
                  </Stack>
                </Center>
              }
            />
          </Center>
        </Card>

        {/* Performance Metrics Grid */}
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Card withBorder h="100%">
              <Text size="xs" fw={500} mb="xs">
                Query Complexity
              </Text>
              <Progress
                value={performanceAnalysis.queryComplexity * 10}
                color={performanceAnalysis.queryComplexity <= 5 ? "green" : "orange"}
                size="lg"
                mb="xs"
              />
              <Text size="xs" c="dimmed">
                {performanceAnalysis.queryComplexity}/10
              </Text>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Card withBorder h="100%">
              <Text size="xs" fw={500} mb="xs">
                Index Coverage
              </Text>
              <Progress
                value={performanceAnalysis.indexCoverage}
                color={performanceAnalysis.indexCoverage >= 60 ? "green" : "orange"}
                size="lg"
                mb="xs"
              />
              <Text size="xs" c="dimmed">
                {performanceAnalysis.indexCoverage}%
              </Text>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Card withBorder h="100%">
              <Text size="xs" fw={500} mb="xs">
                Normalization Score
              </Text>
              <Progress
                value={performanceAnalysis.normalizationScore * 10}
                color={performanceAnalysis.normalizationScore >= 7 ? "green" : "orange"}
                size="lg"
                mb="xs"
              />
              <Text size="xs" c="dimmed">
                {performanceAnalysis.normalizationScore}/10
              </Text>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Card withBorder h="100%">
              <Text size="xs" fw={500} mb="xs">
                Join Complexity
              </Text>
              <Progress
                value={performanceAnalysis.joinComplexity * 10}
                color={performanceAnalysis.joinComplexity <= 5 ? "green" : "orange"}
                size="lg"
                mb="xs"
              />
              <Text size="xs" c="dimmed">
                {performanceAnalysis.joinComplexity}/10
              </Text>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Bottlenecks */}
        {performanceAnalysis.bottlenecks.length > 0 && (
          <Alert variant="light" color="orange" icon={<FiAlertTriangle size={16} />}>
            <Text size="sm" fw={500} mb="xs">
              Performance Bottlenecks Detected:
            </Text>
            <Stack gap="xs">
              {performanceAnalysis.bottlenecks.map((bottleneck, index) => (
                <Text key={index} size="xs">
                  • {bottleneck}
                </Text>
              ))}
            </Stack>
          </Alert>
        )}
      </Stack>
    );
  };

  const renderRecommendations = () => {
    if (!optimizations?.recommendations) return null;

    return (
      <Stack gap="md">
        <Group justify="apart">
          <Text size="sm" fw={500}>
            Optimization Recommendations
          </Text>
          <Badge variant="light" color="blue">
            {optimizations.recommendations.length} recommendations
          </Badge>
        </Group>

        <Accordion variant="contained">
          {optimizations.recommendations.map((rec, index) => (
            <Accordion.Item key={index} value={`rec-${index}`}>
              <Accordion.Control
                icon={
                  rec.severity === "HIGH" ? (
                    <FiAlertTriangle size={16} color="var(--mantine-color-red-6)" />
                  ) : (
                    <FiCheckCircle size={16} color="var(--mantine-color-green-6)" />
                  )
                }
              >
                <Group justify="apart" pr="md">
                  <Stack gap={0}>
                    <Text size="sm" fw={500}>
                      {rec.message}
                    </Text>
                    <Group gap="xs">
                      <Badge variant="light" color={getSeverityColor(rec.severity)} size="xs">
                        {rec.severity}
                      </Badge>
                      <Badge variant="light" color={getImpactColor(rec.estimatedImpact)} size="xs">
                        {rec.estimatedImpact} Impact
                      </Badge>
                      <Badge variant="outline" size="xs">
                        Priority: {rec.priority}
                      </Badge>
                    </Group>
                  </Stack>
                </Group>
              </Accordion.Control>

              <Accordion.Panel>
                <Stack gap="md">
                  <Text size="sm">{rec.reasoning}</Text>

                  <Paper p="sm" bg="var(--mantine-color-blue-0)" withBorder>
                    <Group justify="apart" mb="xs">
                      <Text size="xs" fw={500}>
                        Expected Impact:
                      </Text>
                      <Badge variant="light" color="blue" size="xs">
                        {rec.resourceCost} Cost
                      </Badge>
                    </Group>
                    <Text size="xs">{rec.impact}</Text>
                  </Paper>

                  {rec.sqlStatements.length > 0 && (
                    <Stack gap="xs">
                      <Text size="xs" fw={500}>
                        SQL Implementation:
                      </Text>
                      {rec.sqlStatements.map((sql, sqlIndex) => (
                        <Paper key={sqlIndex} p="sm" bg="var(--mantine-color-gray-0)" withBorder>
                          <Group justify="apart" mb="xs">
                            <Text size="xs" c="dimmed">
                              SQL Statement {sqlIndex + 1}:
                            </Text>
                            <ActionIcon
                              variant="subtle"
                              size="sm"
                              onClick={() => copyToClipboard(sql)}
                            >
                              <FiCopy size={12} />
                            </ActionIcon>
                          </Group>
                          <Code block>{sql}</Code>
                        </Paper>
                      ))}
                    </Stack>
                  )}

                  {rec.prerequisites && rec.prerequisites.length > 0 && (
                    <Alert variant="light" color="yellow" icon={<FiInfo size={16} />}>
                      <Text size="xs" fw={500} mb="xs">
                        Prerequisites:
                      </Text>
                      <Stack gap="xs">
                        {rec.prerequisites.map((prereq, prereqIndex) => (
                          <Text key={prereqIndex} size="xs">
                            • {prereq}
                          </Text>
                        ))}
                      </Stack>
                    </Alert>
                  )}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Stack>
    );
  };

  const renderIndexStrategies = () => {
    if (!optimizations?.indexStrategies) return null;

    return (
      <Stack gap="md">
        <Group justify="apart">
          <Text size="sm" fw={500}>
            Recommended Index Strategies
          </Text>
          <Badge variant="light" color="green">
            {optimizations.indexStrategies.length} strategies
          </Badge>
        </Group>

        <Grid>
          {optimizations.indexStrategies.map((strategy, index) => (
            <Grid.Col key={index} span={{ base: 12, lg: 6 }}>
              <Card withBorder h="100%">
                <Stack gap="sm">
                  <Group justify="apart">
                    <Group>
                      <FiDatabase size={16} />
                      <Text size="sm" fw={500}>
                        {strategy.indexName}
                      </Text>
                    </Group>
                    <Badge variant="light" color="blue" size="xs">
                      {strategy.indexType}
                    </Badge>
                  </Group>

                  <Text size="xs" c="dimmed">
                    Table: {strategy.tableName}
                  </Text>

                  <Group gap="xs">
                    <Text size="xs" fw={500}>
                      Columns:
                    </Text>
                    {strategy.columns.map((col, colIndex) => (
                      <Badge key={colIndex} variant="outline" size="xs">
                        {col}
                      </Badge>
                    ))}
                  </Group>

                  <Text size="xs">{strategy.reasoning}</Text>

                  {strategy.partial && (
                    <Paper p="xs" bg="var(--mantine-color-yellow-0)" withBorder>
                      <Text size="xs" fw={500} mb="xs">
                        Partial Index Condition:
                      </Text>
                      <Code>{strategy.partial}</Code>
                    </Paper>
                  )}

                  <Group justify="apart">
                    <Text size="xs" c="dimmed">
                      Selectivity: {Math.round(strategy.estimatedSelectivity * 100)}%
                    </Text>
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      onClick={() => {
                        const sql = `CREATE ${strategy.unique ? "UNIQUE " : ""}INDEX ${
                          strategy.indexName
                        } ON ${strategy.tableName} (${strategy.columns.join(", ")})${
                          strategy.partial ? ` WHERE ${strategy.partial}` : ""
                        };`;
                        copyToClipboard(sql);
                      }}
                    >
                      <FiCopy size={12} />
                    </ActionIcon>
                  </Group>
                </Stack>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      </Stack>
    );
  };

  const renderPartitioningStrategies = () => {
    if (
      !optimizations?.partitioningStrategies ||
      optimizations.partitioningStrategies.length === 0
    ) {
      return (
        <Alert variant="light" color="blue" icon={<FiInfo size={16} />}>
          <Text size="sm">
            No partitioning strategies recommended for the current database type or schema
            structure.
          </Text>
        </Alert>
      );
    }

    return (
      <Stack gap="md">
        <Group justify="apart">
          <Text size="sm" fw={500}>
            Partitioning Strategies
          </Text>
          <Badge variant="light" color="purple">
            {optimizations.partitioningStrategies.length} strategies
          </Badge>
        </Group>

        <Stack gap="md">
          {optimizations.partitioningStrategies.map((strategy, index) => (
            <Card key={index} withBorder>
              <Stack gap="md">
                <Group justify="apart">
                  <Group>
                    <FiLayers size={16} />
                    <Text size="sm" fw={500}>
                      {strategy.tableName} - {strategy.partitionType} Partitioning
                    </Text>
                  </Group>
                  <Badge variant="light" color="purple" size="sm">
                    {strategy.partitionType}
                  </Badge>
                </Group>

                <Text size="sm">{strategy.reasoning}</Text>

                <Grid>
                  <Grid.Col span={6}>
                    <Text size="xs" fw={500} mb="xs">
                      Partition Column:
                    </Text>
                    <Badge variant="outline" size="sm">
                      {strategy.partitionColumn}
                    </Badge>
                  </Grid.Col>

                  <Grid.Col span={6}>
                    <Text size="xs" fw={500} mb="xs">
                      Maintenance Complexity:
                    </Text>
                    <Badge
                      variant="light"
                      color={
                        strategy.maintenanceComplexity === "LOW"
                          ? "green"
                          : strategy.maintenanceComplexity === "MEDIUM"
                            ? "yellow"
                            : "red"
                      }
                      size="sm"
                    >
                      {strategy.maintenanceComplexity}
                    </Badge>
                  </Grid.Col>
                </Grid>

                <Paper p="sm" bg="var(--mantine-color-green-0)" withBorder>
                  <Text size="xs" fw={500} mb="xs">
                    Expected Benefit:
                  </Text>
                  <Text size="xs">{strategy.estimatedBenefit}</Text>
                </Paper>

                {strategy.partitionRanges && (
                  <Stack gap="xs">
                    <Text size="xs" fw={500}>
                      Suggested Partition Ranges:
                    </Text>
                    {strategy.partitionRanges.map((range, rangeIndex) => (
                      <Paper key={rangeIndex} p="xs" bg="var(--mantine-color-gray-0)" withBorder>
                        <Text size="xs">
                          Partition {rangeIndex + 1}: {range.min} to {range.max}
                        </Text>
                      </Paper>
                    ))}
                  </Stack>
                )}

                {strategy.partitionCount && (
                  <Text size="xs">
                    <Text component="span" fw={500}>
                      Suggested Partitions:
                    </Text>{" "}
                    {strategy.partitionCount}
                  </Text>
                )}
              </Stack>
            </Card>
          ))}
        </Stack>
      </Stack>
    );
  };

  if (isOptimizing) {
    return (
      <Stack align="center" gap="md" py="xl">
        <FiZap size={48} color="var(--mantine-color-blue-6)" />
        <Text size="lg" fw={500}>
          Analyzing Schema Performance...
        </Text>
        <Text size="sm" c="dimmed" ta="center">
          Running optimization engine to identify performance improvements
        </Text>
      </Stack>
    );
  }

  if (!optimizations) {
    return (
      <Stack align="center" gap="md" py="xl">
        <FiSettings size={48} color="var(--mantine-color-gray-4)" />
        <Text size="lg" fw={500} c="dimmed">
          No optimization data available
        </Text>
        <Button leftSection={<FiPlay size={16} />} onClick={runOptimization}>
          Run Performance Analysis
        </Button>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="apart">
        <Group>
          <FiZap size={20} />
          <Text size="sm" fw={500}>
            Schema Optimization
          </Text>
        </Group>
        <Button
          variant="light"
          size="xs"
          leftSection={<FiPlay size={14} />}
          onClick={runOptimization}
          loading={isOptimizing}
        >
          Re-analyze
        </Button>
      </Group>

      <Tabs value={activeTab} onChange={value => setActiveTab(value || "overview")}>
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<FiBarChart size={14} />}>
            Performance
          </Tabs.Tab>
          <Tabs.Tab value="recommendations" leftSection={<FiTrendingUp size={14} />}>
            Recommendations
          </Tabs.Tab>
          <Tabs.Tab value="indexes" leftSection={<FiDatabase size={14} />}>
            Indexes
          </Tabs.Tab>
          <Tabs.Tab value="partitioning" leftSection={<FiLayers size={14} />}>
            Partitioning
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          <ScrollArea.Autosize mah={600}>{renderPerformanceOverview()}</ScrollArea.Autosize>
        </Tabs.Panel>

        <Tabs.Panel value="recommendations" pt="md">
          <ScrollArea.Autosize mah={600}>{renderRecommendations()}</ScrollArea.Autosize>
        </Tabs.Panel>

        <Tabs.Panel value="indexes" pt="md">
          <ScrollArea.Autosize mah={600}>{renderIndexStrategies()}</ScrollArea.Autosize>
        </Tabs.Panel>

        <Tabs.Panel value="partitioning" pt="md">
          <ScrollArea.Autosize mah={600}>{renderPartitioningStrategies()}</ScrollArea.Autosize>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};
