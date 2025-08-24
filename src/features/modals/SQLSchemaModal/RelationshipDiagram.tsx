import React from "react";
import {
  Stack,
  Group,
  Card,
  Text,
  Badge,
  Box,
  Paper,
  Divider,
  ScrollArea,
  Grid,
  Tooltip,
  ActionIcon,
  Center
} from "@mantine/core";
import { 
  FiArrowRight, 
  FiGitCommit,
  FiGrid3x3,
  FiCircle,
  FiInfo,
  FiZoomIn
} from "react-icons/fi";
import { TableSchema, RelationshipInfo } from "../../../store/useSQLSchema";

interface RelationshipDiagramProps {
  tables: TableSchema[];
  relationships: RelationshipInfo[];
}

export const RelationshipDiagram: React.FC<RelationshipDiagramProps> = ({
  tables,
  relationships
}) => {
  const [selectedRelationship, setSelectedRelationship] = React.useState<string | null>(null);

  if (!relationships || relationships.length === 0) {
    return (
      <Card withBorder>
        <Center py="xl">
          <Stack align="center" gap="md">
            <FiCircle size={48} color="var(--mantine-color-gray-4)" />
            <Text c="dimmed" ta="center">
              No relationships detected in the current schema.
              <br />
              Try enabling foreign key constraints in the configuration.
            </Text>
          </Stack>
        </Center>
      </Card>
    );
  }

  const getRelationshipColor = (type: string): string => {
    switch (type) {
      case "ONE_TO_ONE": return "blue";
      case "ONE_TO_MANY": return "green";
      case "MANY_TO_MANY": return "orange";
      default: return "gray";
    }
  };

  const getRelationshipIcon = (type: string) => {
    switch (type) {
      case "ONE_TO_ONE": 
        return <Text size="xs" fw={600}>1:1</Text>;
      case "ONE_TO_MANY": 
        return <Text size="xs" fw={600}>1:N</Text>;
      case "MANY_TO_MANY": 
        return <Text size="xs" fw={600}>M:N</Text>;
      default: 
        return <Text size="xs" fw={600}>?</Text>;
    }
  };

  const renderRelationshipCard = (relationship: RelationshipInfo, index: number) => {
    const isSelected = selectedRelationship === `${relationship.sourceTable}-${relationship.targetTable}`;
    
    return (
      <Card
        key={index}
        withBorder
        shadow={isSelected ? "md" : "xs"}
        style={{
          cursor: "pointer",
          borderColor: isSelected ? `var(--mantine-color-${getRelationshipColor(relationship.relationshipType)}-4)` : undefined
        }}
        onClick={() => setSelectedRelationship(
          isSelected ? null : `${relationship.sourceTable}-${relationship.targetTable}`
        )}
      >
        <Group justify="apart" mb="md">
          <Group>
            <FiGitCommit size={16} color={`var(--mantine-color-${getRelationshipColor(relationship.relationshipType)}-6)`} />
            <Badge 
              variant="light" 
              color={getRelationshipColor(relationship.relationshipType)}
              size="sm"
            >
              {getRelationshipIcon(relationship.relationshipType)}
            </Badge>
          </Group>
          
          <Tooltip label="View details">
            <ActionIcon variant="subtle" size="sm">
              <FiZoomIn size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>

        {/* Relationship Flow */}
        <Stack gap="md">
          <Group justify="center" wrap="nowrap">
            {/* Source Table */}
            <Paper p="sm" bg="var(--mantine-color-blue-0)" withBorder style={{ flex: 1 }}>
              <Group justify="center">
                <FiGrid3x3 size={16} />
                <Text size="sm" fw={500} ta="center">
                  {relationship.sourceTable}
                </Text>
              </Group>
            </Paper>

            {/* Arrow */}
            <Box px="md">
              <FiArrowRight 
                size={20} 
                color={`var(--mantine-color-${getRelationshipColor(relationship.relationshipType)}-6)`}
              />
            </Box>

            {/* Target Table */}
            <Paper p="sm" bg="var(--mantine-color-green-0)" withBorder style={{ flex: 1 }}>
              <Group justify="center">
                <FiGrid3x3 size={16} />
                <Text size="sm" fw={500} ta="center">
                  {relationship.targetTable}
                </Text>
              </Group>
            </Paper>
          </Group>

          {/* Relationship Details */}
          <Paper p="sm" bg="var(--mantine-color-gray-0)" withBorder>
            <Stack gap="xs">
              <Group justify="between">
                <Text size="xs" c="dimmed">Foreign Key Column:</Text>
                <Badge variant="outline" size="xs">
                  {relationship.foreignKeyColumn}
                </Badge>
              </Group>
              
              <Group justify="between">
                <Text size="xs" c="dimmed">Relationship Type:</Text>
                <Badge 
                  variant="light" 
                  size="xs" 
                  color={getRelationshipColor(relationship.relationshipType)}
                >
                  {relationship.relationshipType.replace(/_/g, " ")}
                </Badge>
              </Group>

              {relationship.junctionTable && (
                <Group justify="between">
                  <Text size="xs" c="dimmed">Junction Table:</Text>
                  <Badge variant="outline" size="xs" color="orange">
                    {relationship.junctionTable}
                  </Badge>
                </Group>
              )}
            </Stack>
          </Paper>

          {/* Expanded Details */}
          {isSelected && (
            <>
              <Divider />
              <Box>
                <Text size="xs" fw={500} mb="xs">Detailed Information:</Text>
                <Stack gap="xs">
                  <Paper p="xs" bg="var(--mantine-color-blue-0)" withBorder>
                    <Text size="xs">
                      <Text component="span" fw={500}>Source:</Text> Table "{relationship.sourceTable}" 
                      references "{relationship.targetTable}" through column "{relationship.foreignKeyColumn}"
                    </Text>
                  </Paper>
                  
                  {relationship.relationshipType === "ONE_TO_MANY" && (
                    <Paper p="xs" bg="var(--mantine-color-yellow-0)" withBorder>
                      <Text size="xs">
                        One record in "{relationship.targetTable}" can have multiple records in "{relationship.sourceTable}"
                      </Text>
                    </Paper>
                  )}
                  
                  {relationship.relationshipType === "MANY_TO_MANY" && relationship.junctionTable && (
                    <Paper p="xs" bg="var(--mantine-color-orange-0)" withBorder>
                      <Text size="xs">
                        Many-to-many relationship implemented through junction table "{relationship.junctionTable}"
                      </Text>
                    </Paper>
                  )}
                </Stack>
              </Box>
            </>
          )}
        </Stack>
      </Card>
    );
  };

  const relationshipCounts = {
    oneToOne: relationships.filter(r => r.relationshipType === "ONE_TO_ONE").length,
    oneToMany: relationships.filter(r => r.relationshipType === "ONE_TO_MANY").length,
    manyToMany: relationships.filter(r => r.relationshipType === "MANY_TO_MANY").length
  };

  return (
    <Stack gap="md">
      {/* Relationship Overview */}
      <Card withBorder bg="var(--mantine-color-gray-0)">
        <Group justify="apart">
          <Group>
            <FiGitCommit size={20} />
            <Text size="sm" fw={500}>Relationship Overview</Text>
          </Group>
          
          <Group gap="lg">
            {relationshipCounts.oneToOne > 0 && (
              <Group gap="xs">
                <Badge variant="light" color="blue" size="sm">1:1</Badge>
                <Text size="xs" c="dimmed">{relationshipCounts.oneToOne}</Text>
              </Group>
            )}
            
            {relationshipCounts.oneToMany > 0 && (
              <Group gap="xs">
                <Badge variant="light" color="green" size="sm">1:N</Badge>
                <Text size="xs" c="dimmed">{relationshipCounts.oneToMany}</Text>
              </Group>
            )}
            
            {relationshipCounts.manyToMany > 0 && (
              <Group gap="xs">
                <Badge variant="light" color="orange" size="sm">M:N</Badge>
                <Text size="xs" c="dimmed">{relationshipCounts.manyToMany}</Text>
              </Group>
            )}
            
            <Group gap="xs">
              <Text size="xs" c="dimmed">Total:</Text>
              <Badge variant="light">{relationships.length}</Badge>
            </Group>
          </Group>
        </Group>
      </Card>

      {/* Relationships Grid */}
      <ScrollArea.Autosize mah={600}>
        <Grid>
          {relationships.map((relationship, index) => (
            <Grid.Col key={index} span={{ base: 12, lg: 6 }}>
              {renderRelationshipCard(relationship, index)}
            </Grid.Col>
          ))}
        </Grid>
      </ScrollArea.Autosize>

      {/* Relationship Legend */}
      <Card withBorder bg="var(--mantine-color-gray-0)">
        <Group mb="xs">
          <FiInfo size={16} />
          <Text size="xs" fw={500}>Relationship Types:</Text>
        </Group>
        
        <Stack gap="xs">
          <Group>
            <Badge variant="light" color="blue" size="sm">1:1</Badge>
            <Text size="xs" c="dimmed">
              One-to-One: Each record in the source table corresponds to exactly one record in the target table
            </Text>
          </Group>
          
          <Group>
            <Badge variant="light" color="green" size="sm">1:N</Badge>
            <Text size="xs" c="dimmed">
              One-to-Many: Each record in the target table can have multiple related records in the source table
            </Text>
          </Group>
          
          <Group>
            <Badge variant="light" color="orange" size="sm">M:N</Badge>
            <Text size="xs" c="dimmed">
              Many-to-Many: Records in both tables can have multiple relationships (requires junction table)
            </Text>
          </Group>
        </Stack>
      </Card>

      {/* Connected Tables Summary */}
      <Card withBorder>
        <Text size="xs" fw={500} mb="xs">Connected Tables:</Text>
        <Group gap="xs" wrap="wrap">
          {Array.from(new Set([
            ...relationships.map(r => r.sourceTable),
            ...relationships.map(r => r.targetTable)
          ])).map((tableName) => (
            <Badge key={tableName} variant="outline" size="sm">
              {tableName}
            </Badge>
          ))}
        </Group>
      </Card>
    </Stack>
  );
};