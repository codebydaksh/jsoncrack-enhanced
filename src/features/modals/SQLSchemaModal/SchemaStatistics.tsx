import React from "react";
import {
  Stack,
  Group,
  Card,
  Text,
  Badge,
  Progress,
  Grid,
  RingProgress,
  Center,
  Tooltip,
  Paper,
  Divider
} from "@mantine/core";
import { 
  FiDatabase,
  FiGrid3x3,
  FiKey,
  FiLink2,
  FiBarChart,
  FiActivity,
  FiTrendingUp,
  FiShield
} from "react-icons/fi";
import { SchemaAnalysisResult } from "../../../store/useSQLSchema";

interface SchemaStatisticsProps {
  analysisResult: SchemaAnalysisResult;
}

export const SchemaStatistics: React.FC<SchemaStatisticsProps> = ({
  analysisResult
}) => {
  const { tables, relationships, estimatedPerformance } = analysisResult;

  // Calculate various statistics
  const totalColumns = tables.reduce((sum, table) => sum + table.columns.length, 0);
  const totalPrimaryKeys = tables.filter(table => table.primaryKey).length;
  const totalForeignKeys = tables.reduce((sum, table) => sum + (table.foreignKeys?.length || 0), 0);
  const totalIndexes = tables.reduce((sum, table) => sum + (table.indexes?.length || 0), 0);
  
  const avgColumnsPerTable = Math.round(totalColumns / tables.length);
  const normalizedTables = relationships.length;
  const normalizationRatio = tables.length > 1 ? (normalizedTables / (tables.length - 1)) * 100 : 0;

  // Data type distribution
  const dataTypeDistribution = new Map<string, number>();
  tables.forEach(table => {
    table.columns.forEach(column => {
      const baseType = column.type.split('(')[0]; // Remove length specifiers
      const count = dataTypeDistribution.get(baseType) || 0;
      dataTypeDistribution.set(baseType, count + 1);
    });
  });

  const topDataTypes = Array.from(dataTypeDistribution.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Complexity assessment
  const getComplexityColor = (complexity: string): string => {
    switch (complexity) {
      case "LOW": return "green";
      case "MEDIUM": return "yellow";
      case "HIGH": return "red";
      default: return "gray";
    }
  };

  const getPerformanceColor = (score: number): string => {
    if (score >= 80) return "green";
    if (score >= 60) return "yellow";
    if (score >= 40) return "orange";
    return "red";
  };

  return (
    <Stack gap="md">
      {/* Main Statistics Cards */}
      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <Card withBorder h="100%">
            <Group justify="apart" mb="xs">
              <FiGrid3x3 size={20} color="var(--mantine-color-blue-6)" />
              <Badge variant="light" color="blue" size="lg">
                {tables.length}
              </Badge>
            </Group>
            <Text size="sm" fw={500}>Tables Generated</Text>
            <Text size="xs" c="dimmed">
              Avg {avgColumnsPerTable} columns per table
            </Text>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <Card withBorder h="100%">
            <Group justify="apart" mb="xs">
              <FiDatabase size={20} color="var(--mantine-color-green-6)" />
              <Badge variant="light" color="green" size="lg">
                {totalColumns}
              </Badge>
            </Group>
            <Text size="sm" fw={500}>Total Columns</Text>
            <Text size="xs" c="dimmed">
              Across all tables
            </Text>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <Card withBorder h="100%">
            <Group justify="apart" mb="xs">
              <FiLink2 size={20} color="var(--mantine-color-orange-6)" />
              <Badge variant="light" color="orange" size="lg">
                {relationships.length}
              </Badge>
            </Group>
            <Text size="sm" fw={500}>Relationships</Text>
            <Text size="xs" c="dimmed">
              Foreign key references
            </Text>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <Card withBorder h="100%">
            <Group justify="apart" mb="xs">
              <FiKey size={20} color="var(--mantine-color-yellow-6)" />
              <Badge variant="light" color="yellow" size="lg">
                {totalPrimaryKeys}
              </Badge>
            </Group>
            <Text size="sm" fw={500}>Primary Keys</Text>
            <Text size="xs" c="dimmed">
              Table identifiers
            </Text>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Performance Metrics */}
      <Card withBorder>
        <Group mb="md">
          <FiActivity size={20} />
          <Text size="sm" fw={500}>Performance Metrics</Text>
        </Group>

        <Grid>
          <Grid.Col span={{ base: 12, lg: 4 }}>
            <Center>
              <RingProgress
                size={120}
                thickness={12}
                sections={[{
                  value: estimatedPerformance.indexEfficiency,
                  color: getPerformanceColor(estimatedPerformance.indexEfficiency)
                }]}
                label={
                  <Center>
                    <Stack align="center" gap={0}>
                      <Text size="xs" c="dimmed">Index</Text>
                      <Text size="sm" fw={600}>
                        {estimatedPerformance.indexEfficiency}%
                      </Text>
                    </Stack>
                  </Center>
                }
              />
            </Center>
            <Text size="xs" ta="center" c="dimmed" mt="xs">
              Index Efficiency
            </Text>
          </Grid.Col>

          <Grid.Col span={{ base: 12, lg: 4 }}>
            <Center>
              <RingProgress
                size={120}
                thickness={12}
                sections={[{
                  value: estimatedPerformance.normalizationScore,
                  color: getPerformanceColor(estimatedPerformance.normalizationScore)
                }]}
                label={
                  <Center>
                    <Stack align="center" gap={0}>
                      <Text size="xs" c="dimmed">Normal</Text>
                      <Text size="sm" fw={600}>
                        {estimatedPerformance.normalizationScore}%
                      </Text>
                    </Stack>
                  </Center>
                }
              />
            </Center>
            <Text size="xs" ta="center" c="dimmed" mt="xs">
              Normalization Score
            </Text>
          </Grid.Col>

          <Grid.Col span={{ base: 12, lg: 4 }}>
            <Stack justify="center" h="100%">
              <Group justify="apart">
                <Text size="xs" c="dimmed">Query Complexity:</Text>
                <Badge 
                  variant="light" 
                  color={getComplexityColor(estimatedPerformance.queryComplexity)}
                >
                  {estimatedPerformance.queryComplexity}
                </Badge>
              </Group>
              
              <Group justify="apart">
                <Text size="xs" c="dimmed">Estimated Size:</Text>
                <Text size="xs" fw={500}>{estimatedPerformance.estimatedSize}</Text>
              </Group>
              
              <Group justify="apart">
                <Text size="xs" c="dimmed">Foreign Keys:</Text>
                <Text size="xs" fw={500}>{totalForeignKeys}</Text>
              </Group>
              
              <Group justify="apart">
                <Text size="xs" c="dimmed">Indexes:</Text>
                <Text size="xs" fw={500}>{totalIndexes}</Text>
              </Group>
            </Stack>
          </Grid.Col>
        </Grid>
      </Card>

      {/* Data Type Distribution */}
      <Card withBorder>
        <Group mb="md">
          <FiBarChart size={20} />
          <Text size="sm" fw={500}>Data Type Distribution</Text>
        </Group>

        <Stack gap="sm">
          {topDataTypes.map(([dataType, count]) => {
            const percentage = (count / totalColumns) * 100;
            return (
              <Group key={dataType} justify="apart">
                <Group style={{ flex: 1 }}>
                  <Badge variant="light" size="sm" style={{ minWidth: 80 }}>
                    {dataType}
                  </Badge>
                  <Progress
                    value={percentage}
                    style={{ flex: 1 }}
                    size="sm"
                    color="blue"
                  />
                </Group>
                <Group gap="xs">
                  <Text size="xs" c="dimmed">{count}</Text>
                  <Text size="xs" c="dimmed">({Math.round(percentage)}%)</Text>
                </Group>
              </Group>
            );
          })}
        </Stack>
      </Card>

      {/* Schema Health */}
      <Card withBorder>
        <Group mb="md">
          <FiShield size={20} />
          <Text size="sm" fw={500}>Schema Health Indicators</Text>
        </Group>

        <Grid>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Paper p="sm" bg="var(--mantine-color-green-0)" withBorder>
              <Group justify="apart">
                <Text size="sm">✓ Primary Keys</Text>
                <Badge variant="light" color="green">
                  {Math.round((totalPrimaryKeys / tables.length) * 100)}%
                </Badge>
              </Group>
              <Text size="xs" c="dimmed">Tables with primary keys</Text>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Paper p="sm" bg="var(--mantine-color-blue-0)" withBorder>
              <Group justify="apart">
                <Text size="sm">⚡ Relationships</Text>
                <Badge variant="light" color="blue">
                  {Math.round(normalizationRatio)}%
                </Badge>
              </Group>
              <Text size="xs" c="dimmed">Normalization ratio</Text>
            </Paper>
          </Grid.Col>

          {totalIndexes > 0 && (
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Paper p="sm" bg="var(--mantine-color-orange-0)" withBorder>
                <Group justify="apart">
                  <Text size="sm">🚀 Indexes</Text>
                  <Badge variant="light" color="orange">
                    {totalIndexes}
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed">Performance indexes</Text>
              </Paper>
            </Grid.Col>
          )}

          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Paper p="sm" bg="var(--mantine-color-purple-0)" withBorder>
              <Group justify="apart">
                <Text size="sm">🔗 Constraints</Text>
                <Badge variant="light" color="purple">
                  {totalForeignKeys}
                </Badge>
              </Group>
              <Text size="xs" c="dimmed">Foreign key constraints</Text>
            </Paper>
          </Grid.Col>
        </Grid>
      </Card>

      {/* Quick Insights */}
      <Card withBorder bg="var(--mantine-color-gray-0)">
        <Group mb="sm">
          <FiTrendingUp size={16} />
          <Text size="sm" fw={500}>Quick Insights</Text>
        </Group>
        
        <Stack gap="xs">
          {estimatedPerformance.indexEfficiency < 50 && (
            <Text size="xs" c="orange">
              • Consider adding more indexes for better query performance
            </Text>
          )}
          
          {relationships.length === 0 && (
            <Text size="xs" c="blue">
              • Schema appears to be denormalized - all data in single table structure
            </Text>
          )}
          
          {totalPrimaryKeys < tables.length && (
            <Text size="xs" c="red">
              • Some tables are missing primary keys - this may cause issues
            </Text>
          )}
          
          {estimatedPerformance.normalizationScore > 80 && (
            <Text size="xs" c="green">
              • Well-normalized schema structure detected
            </Text>
          )}
          
          {avgColumnsPerTable > 20 && (
            <Text size="xs" c="yellow">
              • Tables have many columns - consider further normalization
            </Text>
          )}
        </Stack>
      </Card>
    </Stack>
  );
};