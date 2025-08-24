import React from "react";
import {
  Stack,
  Group,
  Card,
  Text,
  Badge,
  ScrollArea,
  Table,
  Tooltip,
  ActionIcon,
  Flex,
  Grid,
  Paper,
  Divider,
  Box
} from "@mantine/core";
import { 
  FiKey, 
  FiLink2, 
  FiGrid,
  FiCheck,
  FiX,
  FiInfo
} from "react-icons/fi";
import { TableSchema, ColumnSchema } from "../../../store/useSQLSchema";

interface TableVisualizationProps {
  tables: TableSchema[];
  selectedTable?: string | null;
  onTableSelect?: (tableName: string) => void;
}

export const TableVisualization: React.FC<TableVisualizationProps> = ({
  tables,
  selectedTable,
  onTableSelect
}) => {
  if (!tables || tables.length === 0) {
    return (
      <Card withBorder>
        <Text c="dimmed" ta="center">No tables generated yet.</Text>
      </Card>
    );
  }

  const renderColumnIcon = (column: ColumnSchema) => {
    if (column.isPrimaryKey) {
      return (
        <Tooltip label="Primary Key">
          <FiKey size={14} color="var(--mantine-color-yellow-6)" />
        </Tooltip>
      );
    }
    
    if (column.isForeignKey) {
      return (
        <Tooltip label="Foreign Key">
          <FiLink2 size={14} color="var(--mantine-color-blue-6)" />
        </Tooltip>
      );
    }
    
    return (
      <FiKey size={14} color="var(--mantine-color-gray-4)" style={{opacity: 0.3}} />
    );
  };

  const getDataTypeBadgeColor = (dataType: string): string => {
    if (dataType.includes("VARCHAR") || dataType.includes("TEXT")) return "blue";
    if (dataType.includes("INT") || dataType.includes("SERIAL")) return "green";
    if (dataType.includes("DECIMAL") || dataType.includes("DOUBLE")) return "orange";
    if (dataType.includes("BOOLEAN") || dataType.includes("BIT")) return "purple";
    if (dataType.includes("DATE") || dataType.includes("TIME")) return "pink";
    if (dataType.includes("UUID")) return "cyan";
    if (dataType.includes("JSON")) return "red";
    return "gray";
  };

  const renderTable = (table: TableSchema) => (
    <Card
      key={table.name}
      withBorder
      shadow={selectedTable === table.name ? "md" : "xs"}
      style={{
        cursor: onTableSelect ? "pointer" : "default",
        borderColor: selectedTable === table.name ? "var(--mantine-color-blue-4)" : undefined
      }}
      onClick={() => onTableSelect?.(table.name)}
    >
      {/* Table Header */}
      <Group justify="apart" mb="md">
        <Group>
          <FiGrid size={20} color="var(--mantine-color-blue-6)" />
          <Text size="lg" fw={600}>{table.name}</Text>
        </Group>
        
        <Group gap="xs">
          <Badge variant="light" size="sm" color="blue">
            {table.columns.length} columns
          </Badge>
          
          {table.primaryKey && (
            <Badge variant="light" size="sm" color="yellow">
              PK: {table.primaryKey}
            </Badge>
          )}
          
          {table.foreignKeys && table.foreignKeys.length > 0 && (
            <Badge variant="light" size="sm" color="green">
              {table.foreignKeys.length} FK{table.foreignKeys.length > 1 ? "s" : ""}
            </Badge>
          )}
        </Group>
      </Group>

      {/* Columns Table */}
      <ScrollArea.Autosize mah={300}>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: "30px" }}></Table.Th>
              <Table.Th>Column Name</Table.Th>
              <Table.Th>Data Type</Table.Th>
              <Table.Th>Nullable</Table.Th>
              <Table.Th>Constraints</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {table.columns.map((column, index) => (
              <Table.Tr key={`${table.name}-${column.name}-${index}`}>
                <Table.Td>
                  {renderColumnIcon(column)}
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={column.isPrimaryKey ? 600 : 400}>
                    {column.name}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge 
                    variant="light" 
                    size="xs" 
                    color={getDataTypeBadgeColor(column.type)}
                  >
                    {column.type}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  {column.nullable ? (
                    <FiCheck size={16} color="var(--mantine-color-green-6)" />
                  ) : (
                    <FiX size={16} color="var(--mantine-color-red-6)" />
                  )}
                </Table.Td>
                <Table.Td>
                  {column.constraints && column.constraints.length > 0 ? (
                    <Group gap="xs">
                      {column.constraints.map((constraint, idx) => (
                        <Tooltip key={idx} label={constraint}>
                          <Badge variant="outline" size="xs">
                            {constraint.split(" ")[0]}
                          </Badge>
                        </Tooltip>
                      ))}
                    </Group>
                  ) : (
                    <Text size="xs" c="dimmed">None</Text>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea.Autosize>

      {/* Table Footer - Additional Info */}
      {(table.indexes || table.foreignKeys) && (
        <>
          <Divider my="md" />
          
          {/* Foreign Keys */}
          {table.foreignKeys && table.foreignKeys.length > 0 && (
            <Box mb="md">
              <Text size="xs" fw={500} mb="xs">Foreign Key References:</Text>
              <Stack gap="xs">
                {table.foreignKeys.map((fk, index) => (
                  <Paper key={index} p="xs" bg="var(--mantine-color-gray-0)" withBorder>
                    <Group gap="xs">
                      <FiLink2 size={12} />
                      <Text size="xs">
                        {fk.columnName} → {fk.referencedTable}.{fk.referencedColumn}
                      </Text>
                      {fk.onDelete && (
                        <Badge size="xs" variant="outline" color="red">
                          ON DELETE {fk.onDelete}
                        </Badge>
                      )}
                    </Group>
                  </Paper>
                ))}
              </Stack>
            </Box>
          )}

          {/* Indexes */}
          {table.indexes && table.indexes.length > 0 && (
            <Box>
              <Text size="xs" fw={500} mb="xs">Indexes:</Text>
              <Group gap="xs" wrap="wrap">
                {table.indexes.map((index, idx) => (
                  <Badge 
                    key={idx} 
                    variant="light" 
                    size="xs" 
                    color={index.unique ? "orange" : "blue"}
                  >
                    {index.unique && "UNIQUE "}{index.name}
                  </Badge>
                ))}
              </Group>
            </Box>
          )}
        </>
      )}

      {/* Comments */}
      {table.columns.some(col => col.comment) && (
        <>
          <Divider my="md" />
          <Box>
            <Group mb="xs">
              <FiInfo size={14} />
              <Text size="xs" fw={500}>Column Comments:</Text>
            </Group>
            <Stack gap="xs">
              {table.columns
                .filter(col => col.comment)
                .map((col, index) => (
                  <Paper key={index} p="xs" bg="var(--mantine-color-blue-0)" withBorder>
                    <Text size="xs">
                      <Text component="span" fw={500}>{col.name}:</Text> {col.comment}
                    </Text>
                  </Paper>
                ))}
            </Stack>
          </Box>
        </>
      )}
    </Card>
  );

  return (
    <Stack gap="md">
      {/* Tables Overview */}
      <Card withBorder bg="var(--mantine-color-gray-0)">
        <Group justify="apart">
          <Text size="sm" fw={500}>Database Schema Overview</Text>
          <Group gap="lg">
            <Group gap="xs">
              <Text size="xs" c="dimmed">Tables:</Text>
              <Badge variant="light" color="blue">{tables.length}</Badge>
            </Group>
            <Group gap="xs">
              <Text size="xs" c="dimmed">Total Columns:</Text>
              <Badge variant="light" color="green">
                {tables.reduce((sum, table) => sum + table.columns.length, 0)}
              </Badge>
            </Group>
            <Group gap="xs">
              <Text size="xs" c="dimmed">Foreign Keys:</Text>
              <Badge variant="light" color="orange">
                {tables.reduce((sum, table) => sum + (table.foreignKeys?.length || 0), 0)}
              </Badge>
            </Group>
          </Group>
        </Group>
      </Card>

      {/* Table Grid */}
      <Grid>
        {tables.map((table, index) => (
          <Grid.Col key={table.name} span={{ base: 12, lg: 6 }}>
            {renderTable(table)}
          </Grid.Col>
        ))}
      </Grid>

      {/* Legend */}
      <Card withBorder bg="var(--mantine-color-gray-0)">
        <Text size="xs" fw={500} mb="xs">Legend:</Text>
        <Group gap="lg">
          <Group gap="xs">
            <FiKey size={14} color="var(--mantine-color-yellow-6)" />
            <Text size="xs">Primary Key</Text>
          </Group>
          <Group gap="xs">
            <FiLink2 size={14} color="var(--mantine-color-blue-6)" />
            <Text size="xs">Foreign Key</Text>
          </Group>
          <Group gap="xs">
            <FiCheck size={14} color="var(--mantine-color-green-6)" />
            <Text size="xs">Nullable</Text>
          </Group>
          <Group gap="xs">
            <FiX size={14} color="var(--mantine-color-red-6)" />
            <Text size="xs">Not Null</Text>
          </Group>
        </Group>
      </Card>
    </Stack>
  );
};