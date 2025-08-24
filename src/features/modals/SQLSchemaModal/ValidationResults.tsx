import React from "react";
import {
  Stack,
  Group,
  Card,
  Text,
  Badge,
  Alert,
  Accordion,
  ActionIcon,
  ScrollArea,
  Code,
  Paper,
  Tooltip,
  Box
} from "@mantine/core";
import { 
  FiCheck,
  FiAlertTriangle,
  FiX,
  FiInfo,
  FiChevronDown,
  FiAlertCircle,
  FiShield
} from "react-icons/fi";

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface ValidationResultsProps {
  results: ValidationResult;
}

export const ValidationResults: React.FC<ValidationResultsProps> = ({
  results
}) => {
  const { isValid, errors, warnings } = results;

  const getValidationIcon = () => {
    if (errors.length > 0) return <FiX size={20} color="var(--mantine-color-red-6)" />;
    if (warnings.length > 0) return <FiAlertTriangle size={20} color="var(--mantine-color-orange-6)" />;
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
    const message = issue.replace(/Line \d+:\s*/, '');
    
    return { lineNumber, message };
  };

  const renderIssueItem = (issue: string, index: number, type: "error" | "warning") => {
    const { lineNumber, message } = parseIssueDetails(issue);
    
    return (
      <Paper key={index} p="sm" withBorder bg={`var(--mantine-color-${type === "error" ? "red" : "orange"}-0)`}>
        <Group align="flex-start">
          {type === "error" ? (
            <FiAlertCircle size={16} color="var(--mantine-color-red-6)" style={{ marginTop: 2 }} />
          ) : (
            <FiAlertTriangle size={16} color="var(--mantine-color-orange-6)" style={{ marginTop: 2 }} />
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
      suggestion = "Quote the identifier with appropriate database quotes (e.g., double quotes for PostgreSQL)";
    } else if (message.includes("semicolon")) {
      suggestion = "Add a semicolon (;) at the end of the SQL statement";
    } else if (message.includes("UUID")) {
      suggestion = "Enable the uuid-ossp extension with: CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";";
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

  return (
    <Card withBorder>
      <Group justify="apart" mb="md">
        <Group>
          {getValidationIcon()}
          <Text size="sm" fw={500}>SQL Validation Results</Text>
        </Group>
        
        <Group>
          <Badge variant="light" color={getValidationColor()}>
            {isValid ? "VALID" : "ISSUES FOUND"}
          </Badge>
          
          {errors.length > 0 && (
            <Badge variant="light" color="red" size="sm">
              {errors.length} error{errors.length !== 1 ? "s" : ""}
            </Badge>
          )}
          
          {warnings.length > 0 && (
            <Badge variant="light" color="orange" size="sm">
              {warnings.length} warning{warnings.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </Group>
      </Group>

      <Alert
        color={getValidationColor()}
        icon={getValidationIcon()}
        mb="md"
      >
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
                      {errors.map((error, index) => 
                        renderIssueItem(error, index, "error")
                      )}
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
                The generated SQL is syntactically correct and follows best practices 
                for your selected database system.
              </Text>
            </Stack>
          </Group>
        </Paper>
      )}

      {/* Validation Summary */}
      <Paper p="sm" bg="var(--mantine-color-gray-0)" withBorder mt="md">
        <Group justify="between">
          <Text size="xs" c="dimmed">Validation Summary:</Text>
          <Group gap="md">
            <Group gap="xs">
              <Text size="xs" c="dimmed">Total Issues:</Text>
              <Text size="xs" fw={500}>{errors.length + warnings.length}</Text>
            </Group>
            <Group gap="xs">
              <Text size="xs" c="dimmed">Severity:</Text>
              <Text size="xs" fw={500} c={getValidationColor()}>
                {errors.length > 0 ? "High" : warnings.length > 0 ? "Medium" : "None"}
              </Text>
            </Group>
          </Group>
        </Group>
      </Paper>
    </Card>
  );
};