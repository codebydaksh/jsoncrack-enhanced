import React, { useState } from "react";
import {
  Modal,
  Stack,
  Group,
  Button,
  Text,
  Card,
  Progress,
  Alert,
  ScrollArea,
  Grid,
  Paper,
  Badge,
  Accordion,
  Center,
  RingProgress,
  Tabs,
  List,
} from "@mantine/core";
import type { ModalProps } from "@mantine/core";
import {
  FiZap,
  FiClock,
  FiDatabase,
  FiTrendingUp,
  FiAlertTriangle,
  FiCheck,
  FiX,
  FiBarChart,
  FiTarget,
} from "react-icons/fi";
import {
  PerformanceTestingEngine,
  PerformanceBenchmarkUtils,
  type PerformanceTestResult,
  type PerformanceTestConfig,
} from "../../../lib/utils/performanceTestingTools";
import type { SchemaAnalysisResult, DatabaseType } from "../../../store/useSQLSchema";

interface PerformanceTestingModalProps extends ModalProps {
  analysisResult: SchemaAnalysisResult;
  generatedSQL: string;
  databaseType: DatabaseType;
}

export const PerformanceTestingModal: React.FC<PerformanceTestingModalProps> = ({
  opened,
  onClose,
  analysisResult,
  generatedSQL,
  databaseType,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [testResults, setTestResults] = useState<PerformanceTestResult[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  const testConfig: PerformanceTestConfig = {
    maxExecutionTime: 5000,
    memoryThreshold: 100,
    iterations: 3,
  };

  const runPerformanceTests = async () => {
    setIsRunning(true);
    setProgress(0);
    setTestResults([]);

    try {
      const engine = new PerformanceTestingEngine(testConfig);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 15, 90));
      }, 500);

      const results = await engine.runPerformanceTests(analysisResult, generatedSQL, databaseType);

      clearInterval(progressInterval);
      setProgress(100);
      setTestResults(results);

      setTimeout(() => {
        setIsRunning(false);
        setActiveTab("results");
      }, 500);
    } catch (error) {
      console.error("Performance testing failed:", error);
      setIsRunning(false);
      setProgress(0);
    }
  };

  const performanceReport =
    testResults.length > 0 ? PerformanceBenchmarkUtils.createPerformanceReport(testResults) : null;

  const topRecommendations =
    testResults.length > 0 ? PerformanceBenchmarkUtils.getTopRecommendations(testResults) : [];

  const criticalBottlenecks =
    testResults.length > 0 ? PerformanceBenchmarkUtils.getCriticalBottlenecks(testResults) : [];

  const getScoreColor = (score: number) => {
    if (score >= 80) return "green";
    if (score >= 60) return "yellow";
    if (score >= 40) return "orange";
    return "red";
  };

  const renderOverviewTab = () => (
    <Stack gap="md">
      <Card withBorder>
        <Group justify="between" mb="md">
          <Text size="lg" fw={600}>
            Performance Testing Suite
          </Text>
          <Badge variant="light" color="blue">
            {databaseType}
          </Badge>
        </Group>

        <Text size="sm" c="dimmed" mb="md">
          Comprehensive performance analysis for your SQL schema including execution time, memory
          usage, query complexity, and scalability testing.
        </Text>

        <Grid>
          <Grid.Col span={6}>
            <Paper p="md" withBorder>
              <Group>
                <FiDatabase size={24} color="var(--mantine-color-blue-6)" />
                <div>
                  <Text size="sm" fw={500}>
                    Tables
                  </Text>
                  <Text size="lg" fw={700}>
                    {analysisResult.tables.length}
                  </Text>
                </div>
              </Group>
            </Paper>
          </Grid.Col>
          <Grid.Col span={6}>
            <Paper p="md" withBorder>
              <Group>
                <FiTarget size={24} color="var(--mantine-color-green-6)" />
                <div>
                  <Text size="sm" fw={500}>
                    Relationships
                  </Text>
                  <Text size="lg" fw={700}>
                    {analysisResult.relationships?.length || 0}
                  </Text>
                </div>
              </Group>
            </Paper>
          </Grid.Col>
        </Grid>
      </Card>

      <Card withBorder>
        <Text size="sm" fw={500} mb="md">
          Test Configuration
        </Text>
        <Stack gap="sm">
          <Group justify="between">
            <Text size="sm">Max Execution Time:</Text>
            <Text size="sm" fw={500}>
              {testConfig.maxExecutionTime}ms
            </Text>
          </Group>
          <Group justify="between">
            <Text size="sm">Memory Threshold:</Text>
            <Text size="sm" fw={500}>
              {testConfig.memoryThreshold}MB
            </Text>
          </Group>
          <Group justify="between">
            <Text size="sm">Test Iterations:</Text>
            <Text size="sm" fw={500}>
              {testConfig.iterations}
            </Text>
          </Group>
        </Stack>
      </Card>

      <Group justify="center">
        <Button
          size="lg"
          leftSection={<FiZap size={16} />}
          onClick={runPerformanceTests}
          loading={isRunning}
          disabled={!analysisResult || !generatedSQL}
        >
          {isRunning ? "Running Tests..." : "Start Performance Testing"}
        </Button>
      </Group>

      {isRunning && (
        <Card withBorder>
          <Group mb="sm">
            <Text size="sm">Testing Progress</Text>
            <Text size="sm" c="dimmed">
              {progress}%
            </Text>
          </Group>
          <Progress value={progress} animated />
        </Card>
      )}
    </Stack>
  );

  const renderResultsTab = () => {
    if (!performanceReport) {
      return (
        <Center py="xl">
          <Stack align="center" gap="md">
            <FiBarChart size={48} color="var(--mantine-color-gray-4)" />
            <Text size="lg" fw={500} c="dimmed">
              No test results available
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              Run performance tests to see detailed analysis
            </Text>
          </Stack>
        </Center>
      );
    }

    return (
      <Stack gap="md">
        {/* Overall Performance Score */}
        <Card withBorder>
          <Group justify="between" align="center">
            <div>
              <Text size="lg" fw={600}>
                Overall Performance Score
              </Text>
              <Text size="sm" c="dimmed">
                {performanceReport.passedTests}/{performanceReport.totalTests} tests passed
              </Text>
            </div>
            <Center>
              <RingProgress
                size={120}
                thickness={8}
                sections={[
                  {
                    value: performanceReport.overallScore,
                    color: getScoreColor(performanceReport.overallScore),
                  },
                ]}
                label={
                  <Center>
                    <Text size="xl" fw={700}>
                      {performanceReport.overallScore}%
                    </Text>
                  </Center>
                }
              />
            </Center>
          </Group>
        </Card>

        {/* Test Results */}
        <Card withBorder>
          <Text size="sm" fw={500} mb="md">
            Test Results
          </Text>
          <Accordion>
            {testResults.map((result, index) => (
              <Accordion.Item key={index} value={index.toString()}>
                <Accordion.Control>
                  <Group justify="between">
                    <Group>
                      {result.passed ? (
                        <FiCheck size={16} color="var(--mantine-color-green-6)" />
                      ) : (
                        <FiX size={16} color="var(--mantine-color-red-6)" />
                      )}
                      <Text size="sm" fw={500}>
                        {result.testName}
                      </Text>
                    </Group>
                    <Group gap="xs">
                      <Badge color={getScoreColor(result.score)}>{Math.round(result.score)}%</Badge>
                      <Badge variant="light" color={result.passed ? "green" : "red"}>
                        {result.passed ? "PASS" : "FAIL"}
                      </Badge>
                    </Group>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="sm">
                    {/* Metrics */}
                    <Paper p="sm" bg="var(--mantine-color-gray-0)" withBorder>
                      <Text size="xs" fw={500} mb="xs">
                        Performance Metrics
                      </Text>
                      <Grid>
                        {result.metrics.executionTime > 0 && (
                          <Grid.Col span={6}>
                            <Group gap="xs">
                              <FiClock size={12} />
                              <Text size="xs">
                                Execution: {result.metrics.executionTime.toFixed(0)}ms
                              </Text>
                            </Group>
                          </Grid.Col>
                        )}
                        {result.metrics.memoryUsage > 0 && (
                          <Grid.Col span={6}>
                            <Group gap="xs">
                              <FiDatabase size={12} />
                              <Text size="xs">
                                Memory: {result.metrics.memoryUsage.toFixed(1)}MB
                              </Text>
                            </Group>
                          </Grid.Col>
                        )}
                        {result.metrics.queryComplexity > 0 && (
                          <Grid.Col span={6}>
                            <Group gap="xs">
                              <FiTrendingUp size={12} />
                              <Text size="xs">
                                Complexity: {result.metrics.queryComplexity.toFixed(0)}
                              </Text>
                            </Group>
                          </Grid.Col>
                        )}
                        {result.metrics.indexEfficiency > 0 && (
                          <Grid.Col span={6}>
                            <Group gap="xs">
                              <FiTarget size={12} />
                              <Text size="xs">
                                Index Efficiency:{" "}
                                {(result.metrics.indexEfficiency * 100).toFixed(0)}%
                              </Text>
                            </Group>
                          </Grid.Col>
                        )}
                      </Grid>
                    </Paper>

                    {/* Recommendations */}
                    {result.recommendations.length > 0 && (
                      <div>
                        <Text size="xs" fw={500} mb="xs">
                          Recommendations
                        </Text>
                        <List size="xs">
                          {result.recommendations.map((rec, idx) => (
                            <List.Item key={idx}>{rec}</List.Item>
                          ))}
                        </List>
                      </div>
                    )}

                    {/* Bottlenecks */}
                    {result.bottlenecks.length > 0 && (
                      <div>
                        <Text size="xs" fw={500} mb="xs">
                          Bottlenecks
                        </Text>
                        <List size="xs">
                          {result.bottlenecks.map((bottleneck, idx) => (
                            <List.Item
                              key={idx}
                              icon={
                                <FiAlertTriangle size={12} color="var(--mantine-color-orange-6)" />
                              }
                            >
                              {bottleneck}
                            </List.Item>
                          ))}
                        </List>
                      </div>
                    )}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        </Card>
      </Stack>
    );
  };

  const renderRecommendationsTab = () => {
    if (topRecommendations.length === 0) {
      return (
        <Center py="xl">
          <Stack align="center" gap="md">
            <FiTarget size={48} color="var(--mantine-color-gray-4)" />
            <Text size="lg" fw={500} c="dimmed">
              No recommendations available
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              Run performance tests to get optimization recommendations
            </Text>
          </Stack>
        </Center>
      );
    }

    return (
      <Stack gap="md">
        {/* Top Recommendations */}
        <Card withBorder>
          <Text size="sm" fw={500} mb="md">
            Top Performance Recommendations
          </Text>
          <List spacing="sm">
            {topRecommendations.map((recommendation, index) => (
              <List.Item
                key={index}
                icon={<FiTarget size={16} color="var(--mantine-color-blue-6)" />}
              >
                <Text size="sm">{recommendation}</Text>
              </List.Item>
            ))}
          </List>
        </Card>

        {/* Critical Bottlenecks */}
        {criticalBottlenecks.length > 0 && (
          <Card withBorder>
            <Text size="sm" fw={500} mb="md">
              Critical Bottlenecks
            </Text>
            <List spacing="sm">
              {criticalBottlenecks.map((bottleneck, index) => (
                <List.Item
                  key={index}
                  icon={<FiAlertTriangle size={16} color="var(--mantine-color-red-6)" />}
                >
                  <Text size="sm" c="red">
                    {bottleneck}
                  </Text>
                </List.Item>
              ))}
            </List>
          </Card>
        )}

        {/* Performance Summary */}
        {performanceReport && (
          <Alert color="blue" icon={<FiBarChart size={16} />}>
            <Text size="sm">{performanceReport.summary}</Text>
          </Alert>
        )}
      </Stack>
    );
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group>
          <FiZap size={20} />
          <Text size="lg" fw={600}>
            Performance Testing
          </Text>
        </Group>
      }
      size="xl"
      centered
    >
      <Tabs value={activeTab} onChange={value => setActiveTab(value || "overview")}>
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<FiZap size={16} />}>
            Overview
          </Tabs.Tab>
          <Tabs.Tab
            value="results"
            leftSection={<FiBarChart size={16} />}
            disabled={testResults.length === 0}
          >
            Results
          </Tabs.Tab>
          <Tabs.Tab
            value="recommendations"
            leftSection={<FiTarget size={16} />}
            disabled={testResults.length === 0}
          >
            Recommendations
          </Tabs.Tab>
        </Tabs.List>

        <ScrollArea.Autosize mah={600} mt="md">
          <Tabs.Panel value="overview">{renderOverviewTab()}</Tabs.Panel>
          <Tabs.Panel value="results">{renderResultsTab()}</Tabs.Panel>
          <Tabs.Panel value="recommendations">{renderRecommendationsTab()}</Tabs.Panel>
        </ScrollArea.Autosize>
      </Tabs>
    </Modal>
  );
};
