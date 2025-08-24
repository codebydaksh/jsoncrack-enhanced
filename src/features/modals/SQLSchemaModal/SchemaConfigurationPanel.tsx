import React from "react";
import {
  Stack,
  Group,
  Select,
  Switch,
  TextInput,
  Card,
  Text,
  Divider,
  NumberInput,
  Tooltip,
  Badge,
  Alert
} from "@mantine/core";
import { FiInfo, FiSettings } from "react-icons/fi";
import useSQLSchema, {
  DatabaseType,
  NormalizationLevel, 
  NamingConvention
} from "../../../store/useSQLSchema";

export const SchemaConfigurationPanel: React.FC = () => {
  const { config, setConfig } = useSQLSchema();

  const databaseOptions = [
    { 
      value: DatabaseType.PostgreSQL, 
      label: "PostgreSQL",
      description: "Full-featured with JSON, UUID, and advanced constraints"
    },
    { 
      value: DatabaseType.MySQL, 
      label: "MySQL",
      description: "Popular choice with JSON support and good performance"
    },
    { 
      value: DatabaseType.SQLServer, 
      label: "SQL Server",
      description: "Enterprise-grade with NVARCHAR and IDENTITY columns"
    },
    { 
      value: DatabaseType.SQLite, 
      label: "SQLite",
      description: "Lightweight, embedded database with simplified types"
    },
  ];

  const normalizationOptions = [
    { 
      value: NormalizationLevel.First, 
      label: "1NF (First Normal Form)",
      description: "Eliminate repeating groups"
    },
    { 
      value: NormalizationLevel.Second, 
      label: "2NF (Second Normal Form)",
      description: "1NF + eliminate partial dependencies"
    },
    { 
      value: NormalizationLevel.Third, 
      label: "3NF (Third Normal Form)",
      description: "2NF + eliminate transitive dependencies"
    },
    { 
      value: NormalizationLevel.Denormalized, 
      label: "Denormalized",
      description: "Keep nested data in JSON columns for performance"
    },
  ];

  const namingOptions = [
    { value: NamingConvention.CamelCase, label: "camelCase" },
    { value: NamingConvention.PascalCase, label: "PascalCase" },
    { value: NamingConvention.SnakeCase, label: "snake_case" },
    { value: NamingConvention.KebabCase, label: "kebab-case" },
  ];

  return (
    <Stack gap="lg">
      {/* Database Selection */}
      <Card withBorder>
        <Group mb="sm">
          <FiSettings size={20} />
          <Text size="sm" fw={500}>Database Configuration</Text>
        </Group>
        
        <Stack gap="md">
          <Select
            label="Target Database"
            description="Choose the SQL database system you want to generate schema for"
            value={config.databaseType}
            onChange={(value) => value && setConfig({ databaseType: value as DatabaseType })}
            data={databaseOptions}
            searchable
            required
          />

          {/* Database-specific info */}
          <Alert variant="light" color="blue" icon={<FiInfo size={16} />}>
            {databaseOptions.find(opt => opt.value === config.databaseType)?.description}
          </Alert>
        </Stack>
      </Card>

      {/* Schema Options */}
      <Card withBorder>
        <Text size="sm" fw={500} mb="md">Schema Options</Text>
        
        <Stack gap="md">
          <Select
            label="Normalization Level"
            description="How should nested JSON structures be normalized into tables?"
            value={config.normalizationLevel}
            onChange={(value) => value && setConfig({ normalizationLevel: value as NormalizationLevel })}
            data={normalizationOptions}
          />

          <Select
            label="Naming Convention"
            description="Column and table naming style"
            value={config.namingConvention}
            onChange={(value) => value && setConfig({ namingConvention: value as NamingConvention })}
            data={namingOptions}
          />

          <TextInput
            label="Table Prefix"
            description="Optional prefix for all generated table names"
            value={config.tablePrefix}
            onChange={(event) => setConfig({ tablePrefix: event.currentTarget.value })}
            placeholder="e.g., app_, data_"
          />
        </Stack>
      </Card>

      {/* Feature Toggles */}
      <Card withBorder>
        <Text size="sm" fw={500} mb="md">Schema Features</Text>
        
        <Stack gap="sm">
          <Switch
            label="Include Primary Keys"
            description="Generate primary key constraints for tables"
            checked={true}
            disabled={true}
            styles={{ 
              label: { opacity: 0.7 }, 
              description: { fontSize: "12px", color: "var(--mantine-color-dimmed)" } 
            }}
          />

          <Switch
            label="Include Foreign Key Constraints"
            description="Generate foreign key relationships between tables"
            checked={config.includeForeignKeys}
            onChange={(event) => setConfig({ includeForeignKeys: event.currentTarget.checked })}
          />

          <Switch
            label="Include Indexes"
            description="Generate indexes for foreign keys and unique columns"
            checked={config.includeIndexes}
            onChange={(event) => setConfig({ includeIndexes: event.currentTarget.checked })}
          />

          <Switch
            label="Include Check Constraints"
            description="Generate validation constraints based on data patterns"
            checked={config.includeConstraints}
            onChange={(event) => setConfig({ includeConstraints: event.currentTarget.checked })}
          />

          <Switch
            label="Generate Migration Scripts"
            description="Include data insertion scripts with the schema"
            checked={config.generateMigration}
            onChange={(event) => setConfig({ generateMigration: event.currentTarget.checked })}
          />

          <Switch
            label="Optimize for Performance"
            description="Apply performance optimizations and generate recommendations"
            checked={config.optimizeForPerformance}
            onChange={(event) => setConfig({ optimizeForPerformance: event.currentTarget.checked })}
          />
        </Stack>
      </Card>

      {/* Preview Configuration */}
      <Card withBorder>
        <Text size="sm" fw={500} mb="md">Current Configuration Summary</Text>
        
        <Group gap="xs" wrap="wrap">
          <Badge variant="light" color="blue">
            {config.databaseType.toUpperCase()}
          </Badge>
          <Badge variant="light" color="green">
            {config.normalizationLevel}
          </Badge>
          <Badge variant="light" color="orange">
            {config.namingConvention}
          </Badge>
          
          {config.includeForeignKeys && (
            <Badge variant="light" size="xs">FK Constraints</Badge>
          )}
          {config.includeIndexes && (
            <Badge variant="light" size="xs">Indexes</Badge>
          )}
          {config.includeConstraints && (
            <Badge variant="light" size="xs">Check Constraints</Badge>
          )}
          {config.generateMigration && (
            <Badge variant="light" size="xs">Migration Scripts</Badge>
          )}
        </Group>
      </Card>
    </Stack>
  );
};