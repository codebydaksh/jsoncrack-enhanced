import React, { useState } from "react";
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
  Tabs,
  Grid,
  RingProgress,
  Center,
} from "@mantine/core";
import {
  FiCheck,
  FiAlertTriangle,
  FiX,
  FiInfo,
  FiAlertCircle,
  FiShield,
  FiPlay,
} from "react-icons/fi";
import type { SchemaTestSuite } from "../../../lib/utils/schemaTestingUtils";
import { SchemaTestingEngine } from "../../../lib/utils/schemaTestingUtils";
import type { SchemaAnalysisResult, DatabaseType } from "../../../store/useSQLSchema";

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface ValidationResultsProps {
  results: ValidationResult;
  analysisResult?: SchemaAnalysisResult;
  generatedSQL?: string;
  databaseType?: DatabaseType;
}

export const ValidationResults: React.FC<ValidationResultsProps> = ({
  results,
  analysisResult,
  generatedSQL,
  databaseType,
}) => {
  const [testSuite, setTestSuite] = useState<SchemaTestSuite | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");

  const { isValid, errors, warnings } = results;

  const runComprehensiveTests = async () => {
    if (!analysisResult || !generatedSQL || !databaseType) return;

    setIsRunningTests(true);
    try {
      const engine = new SchemaTestingEngine(databaseType);
      const suite = await engine.runAllTests(analysisResult, generatedSQL);
      setTestSuite(suite);
      setActiveTab("comprehensive");
    } catch (error) {
      console.error("Test execution failed:", error);
    } finally {
      setIsRunningTests(false);
    }
  };

  const getValidationIcon = () => {
    if (errors.length > 0) return <FiX size={20} color="var(--mantine-color-red-6)" />;
    if (warnings.length > 0)
      return <FiAlertTriangle size={20} color="var(--mantine-color-orange-6)" />;
    return <FiCheck size={20} color="var(--mantine-color-green-6)" />;
  };

  const getValidationColor = () => {
    if (errors.length > 0) return "red";
    if (warnings.length > 0) return "orange";
    return "green";
  };

  const getValidationMessage = () => {
    if (errors.length > 0) return "SQL validation failed with errors";
    if (warnings.length > 0) return "SQL validation passed with warnings";
    return "SQL validation successful";
  };

  const parseIssueDetails = (issue: string) => {
    // Try to extract line number and specific issue details
    const lineMatch = issue.match(/Line (\d+):/);
    const lineNumber = lineMatch ? parseInt(lineMatch[1], 10) : null;
    const message = issue.replace(/Line \d+:\s*/, "");

    return { lineNumber, message };
  };

  const renderIssueItem = (issue: string, index: number, type: "error" | "warning") => {
    const { lineNumber, message } = parseIssueDetails(issue);

    return (
      <Paper
        key={index}
        p="sm"
        withBorder
        bg={`var(--mantine-color-${type === "error" ? "red" : "orange"}-0)`}
      >
        <Group align="flex-start">
          {type === "error" ? (
            <FiAlertCircle size={16} color="var(--mantine-color-red-6)" style={{ marginTop: 2 }} />
          ) : (
            <FiAlertTriangle
              size={16}
              color="var(--mantine-color-orange-6)"
              style={{ marginTop: 2 }}
            />
          )}

          <Stack gap="xs" style={{ flex: 1 }}>
            <Group justify="apart">
              <Text size="sm" fw={500}>
                {type === "error" ? "Error" : "Warning"} #{index + 1}
              </Text>
              {lineNumber && (
                <Badge variant="outline" size="xs" color={type === "error" ? "red" : "orange"}>
                  Line {lineNumber}
                </Badge>
              )}
            </Group>

            <Text size="xs" style={{ wordBreak: "break-word" }}>
              {message}
            </Text>

            {/* Add helpful suggestions for common issues */}
            {renderSuggestion(message)}
          </Stack>
        </Group>
      </Paper>
    );
  };

  const renderSuggestion = (message: string) => {
    let suggestion = "";

    if (message.includes("reserved word")) {
      suggestion =
        "Quote the identifier with appropriate database quotes (e.g., double quotes for PostgreSQL)";
    } else if (message.includes("semicolon")) {
      suggestion = "Add a semicolon (;) at the end of the SQL statement";
    } else if (message.includes("UUID")) {
      suggestion =
        'Enable the uuid-ossp extension with: CREATE EXTENSION IF NOT EXISTS "uuid-ossp";';
    } else if (message.includes("ENGINE")) {
      suggestion = "Consider specifying a storage engine like: ENGINE=InnoDB";
    } else if (message.includes("foreign_keys")) {
      suggestion = "Enable foreign key support with: PRAGMA foreign_keys=ON;";
    } else if (message.includes("NVARCHAR")) {
      suggestion = "Use NVARCHAR for Unicode support in SQL Server";
    }

    if (suggestion) {
      return (
        <Paper p="xs" bg="var(--mantine-color-blue-0)" withBorder>
          <Group>
            <FiInfo size={12} color="var(--mantine-color-blue-6)" />
            <Text size="xs" c="blue" fs="italic">
              💡 {suggestion}
            </Text>
          </Group>
        </Paper>
      );
    }

    return null;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "green";
    if (score >= 70) return "yellow";
    if (score >= 50) return "orange";
    return "red";
  };

  const renderComprehensiveTests = (suite: SchemaTestSuite) => {
    const categoryGroups = suite.results.reduce(
      (acc, result) => {
        if (!acc[result.category]) acc[result.category] = [];
        acc[result.category].push(result);
        return acc;
      },
      {} as Record<string, typeof suite.results>
    );

    return (
      <Stack gap="md">
        {/* Test Summary */}
        <Grid>
          <Grid.Col span={6}>
            <Paper p="md" withBorder>
              <Stack gap="xs" align="center">
                <Text size="sm" fw={500}>
                  Test Results
                </Text>
                <Text size="xl" fw={700} c={getScoreColor(suite.overallScore)}>
                  {suite.passedTests}/{suite.totalTests}
                </Text>
                <Text size="xs" c="dimmed">
                  Tests Passed
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
          <Grid.Col span={6}>
            <Paper p="md" withBorder>
              <Stack gap="xs" align="center">
                <Text size="sm" fw={500}>
                  Overall Score
                </Text>
                <Text size="xl" fw={700} c={getScoreColor(suite.overallScore)}>
                  {suite.overallScore}%
                </Text>
                <Text size="xs" c="dimmed">
                  Quality Score
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>

        {/* Test Categories */}
        <Accordion>
          {Object.entries(categoryGroups).map(([category, tests]) => {
            const passedInCategory = tests.filter(t => t.passed).length;
            const categoryScore = Math.round((passedInCategory / tests.length) * 100);

            return (
              <Accordion.Item key={category} value={category}>
                <Accordion.Control>
                  <Group justify="apart">
                    <Text fw={500}>{category.replace(/_/g, " ")}</Text>
                    <Group gap="xs">
                      <Badge color={getScoreColor(categoryScore)}>
                        {passedInCategory}/{tests.length}
                      </Badge>
                      <Text size="sm" c="dimmed">
                        {categoryScore}%
                      </Text>
                    </Group>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="sm">
                    {tests.map((test, index) => (
                      <Paper
                        key={index}
                        p="sm"
                        withBorder
                        bg={
                          test.passed
                            ? "var(--mantine-color-green-0)"
                            : "var(--mantine-color-red-0)"
                        }
                      >
                        <Group justify="apart">
                          <Group>
                            {test.passed ? (
                              <FiCheck size={16} color="var(--mantine-color-green-6)" />
                            ) : (
                              <FiX size={16} color="var(--mantine-color-red-6)" />
                            )}
                            <div>
                              <Text size="sm" fw={500}>
                                {test.testName}
                              </Text>
                              <Text size="xs" c="dimmed">
                                {test.message}
                              </Text>
                            </div>
                          </Group>
                          <Badge
                            color={
                              test.severity === "ERROR"
                                ? "red"
                                : test.severity === "WARNING"
                                  ? "orange"
                                  : "blue"
                            }
                          >
                            {test.severity}
                          </Badge>
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            );
          })}
        </Accordion>

        {/* Recommendations */}
        {suite.recommendations.length > 0 && (
          <Paper p="md" withBorder>
            <Text size="sm" fw={500} mb="sm">
              Recommendations
            </Text>
            <Stack gap="xs">
              {suite.recommendations.map((rec, index) => (
                <Group key={index}>
                  <FiInfo size={16} color="var(--mantine-color-blue-6)" />
                  <Text size="sm">{rec}</Text>
                </Group>
              ))}
            </Stack>
          </Paper>
        )}
      </Stack>
    );
  };

  return (
    <Card withBorder>
      <Stack gap="md">
        {/* Header with Score */}
        <Group justify="between" align="center">
          <Group gap="md">
            {getValidationIcon()}
            <div>
              <Text size="lg" fw={600}>
                Schema Validation
              </Text>
              <Text size="sm" c="dimmed">
                {getValidationMessage()}
              </Text>
            </div>
          </Group>

          {testSuite && (
            <Center>
              <RingProgress
                size={80}
                thickness={6}
                sections={[
                  { value: testSuite.overallScore, color: getScoreColor(testSuite.overallScore) },
                ]}
                label={
                  <Center>
                    <Text size="lg" fw={700}>
                      {testSuite.overallScore}%
                    </Text>
                  </Center>
                }
              />
            </Center>
          )}
        </Group>

        {/* Action Buttons */}
        <Group>
          {analysisResult && generatedSQL && databaseType && (
            <Button
              onClick={runComprehensiveTests}
              loading={isRunningTests}
              leftSection={<FiPlay size={16} />}
              variant="light"
              size="sm"
            >
              {isRunningTests ? "Running Tests..." : "Run Comprehensive Tests"}
            </Button>
          )}
        </Group>

        {/* Tabs for different validation views */}
        <Tabs value={activeTab} onChange={value => setActiveTab(value || "basic")}>
          <Tabs.List>
            <Tabs.Tab value="basic" leftSection={<FiInfo size={16} />}>
              Basic Validation
            </Tabs.Tab>
            <Tabs.Tab
              value="comprehensive"
              leftSection={<FiShield size={16} />}
              disabled={!testSuite}
            >
              Comprehensive Tests
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="basic" pt="md">
            <Stack gap="md">
              {/* Basic validation content */}
              <Alert color={getValidationColor()} icon={getValidationIcon()}>
                {getValidationMessage()}
              </Alert>

              {(errors.length > 0 || warnings.length > 0) && (
                <Accordion variant="contained">
                  {/* Errors Section */}
                  {errors.length > 0 && (
                    <Accordion.Item value="errors">
                      <Accordion.Control
                        icon={<FiX size={16} color="var(--mantine-color-red-6)" />}
                      >
                        <Group justify="apart" pr="md">
                          <Text size="sm" fw={500}>
                            Errors ({errors.length})
                          </Text>
                          <Badge variant="light" color="red" size="sm">
                            Must Fix
                          </Badge>
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap="sm">
                          <Text size="xs" c="dimmed">
                            The following errors must be resolved before the SQL can be executed:
                          </Text>
                          <ScrollArea.Autosize mah={200}>
                            <Stack gap="sm">
                              {errors.map((error, index) => renderIssueItem(error, index, "error"))}
                            </Stack>
                          </ScrollArea.Autosize>
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  )}

                  {/* Warnings Section */}
                  {warnings.length > 0 && (
                    <Accordion.Item value="warnings">
                      <Accordion.Control
                        icon={<FiAlertTriangle size={16} color="var(--mantine-color-orange-6)" />}
                      >
                        <Group justify="apart" pr="md">
                          <Text size="sm" fw={500}>
                            Warnings ({warnings.length})
                          </Text>
                          <Badge variant="light" color="orange" size="sm">
                            Recommended
                          </Badge>
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap="sm">
                          <Text size="xs" c="dimmed">
                            The following warnings indicate potential issues or improvements:
                          </Text>
                          <ScrollArea.Autosize mah={200}>
                            <Stack gap="sm">
                              {warnings.map((warning, index) =>
                                renderIssueItem(warning, index, "warning")
                              )}
                            </Stack>
                          </ScrollArea.Autosize>
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  )}
                </Accordion>
              )}

              {/* Success State */}
              {isValid && errors.length === 0 && warnings.length === 0 && (
                <Paper p="md" bg="var(--mantine-color-green-0)" withBorder>
                  <Group>
                    <FiShield size={20} color="var(--mantine-color-green-6)" />
                    <Stack gap="xs" style={{ flex: 1 }}>
                      <Text size="sm" fw={500} c="green">
                        Perfect! Your SQL schema passed all validation checks.
                      </Text>
                      <Text size="xs" c="dimmed">
                        The generated SQL is syntactically correct and follows best practices for
                        your selected database system.
                      </Text>
                    </Stack>
                  </Group>
                </Paper>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="comprehensive" pt="md">
            {testSuite && renderComprehensiveTests(testSuite)}
          </Tabs.Panel>
        </Tabs>

        {/* Validation Summary */}
        <Paper p="sm" bg="var(--mantine-color-gray-0)" withBorder>
          <Group justify="between">
            <Text size="xs" c="dimmed">
              Validation Summary:
            </Text>
            <Group gap="md">
              <Group gap="xs">
                <Text size="xs" c="dimmed">
                  Total Issues:
                </Text>
                <Text size="xs" fw={500}>
                  {errors.length + warnings.length}
                </Text>
              </Group>
              <Group gap="xs">
                <Text size="xs" c="dimmed">
                  Severity:
                </Text>
                <Text size="xs" fw={500} c={getValidationColor()}>
                  {errors.length > 0 ? "High" : warnings.length > 0 ? "Medium" : "None"}
                </Text>
              </Group>
            </Group>
          </Group>
        </Paper>
      </Stack>
    </Card>
  );
};
