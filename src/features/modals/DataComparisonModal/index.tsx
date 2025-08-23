import React from "react";
import type { ModalProps } from "@mantine/core";
import {
  Modal,
  Stack,
  Group,
  Button,
  Text,
  Badge,
  Divider,
  TextInput,
  Switch,
  ActionIcon,
  Tooltip,
  ScrollArea,
  Paper,
  Grid,
  Tabs,
  Progress,
  Alert,
  Flex,
  Box,
  Code,
} from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import { useHotkeys } from "@mantine/hooks";
import {
  FiArrowRight,
  FiArrowLeft,
  FiSearch,
  FiRefreshCw,
  FiCopy,
  FiDownload,
  FiPlus,
  FiMinus,
  FiEdit,
  FiEye,
  FiEyeOff,
  FiChevronUp,
  FiChevronDown,
} from "react-icons/fi";
import { MdSwapHoriz, MdCompare } from "react-icons/md";
import { event as gaEvent } from "nextjs-google-analytics";
import { toast } from "react-hot-toast";
import useComparison, { ComparisonDiff } from "../../../store/useComparison";
import useJson from "../../../store/useJson";

const DiffTypeColors = {
  added: "green",
  removed: "red", 
  modified: "yellow",
  moved: "blue",
} as const;

const DiffTypeIcons = {
  added: FiPlus,
  removed: FiMinus,
  modified: FiEdit,
  moved: MdSwapHoriz,
} as const;

interface DiffRowProps {
  diff: ComparisonDiff;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}

const DiffRow: React.FC<DiffRowProps> = ({ diff, index, isSelected, onClick }) => {
  const Icon = DiffTypeIcons[diff.type];
  
  return (
    <Paper
      withBorder
      p="xs"
      radius="sm"
      style={{
        cursor: "pointer",
        backgroundColor: isSelected ? "var(--mantine-color-blue-light)" : undefined,
        borderLeftWidth: 3,
        borderLeftColor: `var(--mantine-color-${DiffTypeColors[diff.type]}-filled)`,
      }}
      onClick={onClick}
    >
      <Group justify="space-between" gap="xs">
        <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
          <Icon size={14} />
          <Text size="xs" fw={500} truncate style={{ flex: 1 }}>
            {diff.path}
          </Text>
          <Badge size="xs" color={DiffTypeColors[diff.type]} variant="outline">
            {diff.type}
          </Badge>
        </Group>
        
        <Badge size="xs" variant="dot" color={
          diff.severity === "high" ? "red" : 
          diff.severity === "medium" ? "yellow" : "gray"
        }>
          {diff.severity}
        </Badge>
      </Group>
      
      {/* Value Preview */}
      <Stack gap={2} mt="xs">
        {diff.leftValue !== undefined && (
          <Text size="xs" c="dimmed" lineClamp={1}>
            <Text span fw={500} c="red">- </Text>
            {JSON.stringify(diff.leftValue)}
          </Text>
        )}
        {diff.rightValue !== undefined && (
          <Text size="xs" c="dimmed" lineClamp={1}>
            <Text span fw={500} c="green">+ </Text>
            {JSON.stringify(diff.rightValue)}
          </Text>
        )}
      </Stack>
    </Paper>
  );
};

export const DataComparisonModal = ({ opened, onClose }: ModalProps) => {
  const {
    leftJson,
    rightJson,
    leftLabel,
    rightLabel,
    differences,
    stats,
    isComparing,
    showOnlyDifferences,
    selectedDiff,
    searchQuery,
    setLeftJson,
    setRightJson,
    setLeftLabel,
    setRightLabel,
    setShowOnlyDifferences,
    setSelectedDiff,
    setSearchQuery,
    compareJsons,
    clearComparison,
    navigateDifferences,
    getFilteredDifferences,
  } = useComparison();

  const getJson = useJson(state => state.getJson);
  
  const [activeTab, setActiveTab] = React.useState<string | null>("compare");
  const [autoCompare, setAutoCompare] = React.useState(true);

  const filteredDifferences = React.useMemo(() => getFilteredDifferences(), [
    differences,
    searchQuery,
    getFilteredDifferences,
  ]);

  const loadCurrentJson = (side: "left" | "right") => {
    const currentJson = getJson();
    if (currentJson) {
      if (side === "left") {
        setLeftJson(currentJson);
      } else {
        setRightJson(currentJson);
      }
      if (autoCompare) {
        setTimeout(compareJsons, 100);
      }
    }
  };

  const swapSides = () => {
    const tempJson = leftJson;
    const tempLabel = leftLabel;
    setLeftJson(rightJson);
    setRightJson(tempJson);
    setLeftLabel(rightLabel);
    setRightLabel(tempLabel);
    
    if (autoCompare) {
      setTimeout(compareJsons, 100);
    }
    
    gaEvent("comparison_swap_sides");
  };

  const exportComparison = () => {
    const report = {
      comparison: {
        leftLabel,
        rightLabel,
        timestamp: new Date().toISOString(),
        stats,
        differences: filteredDifferences,
      },
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `json-comparison-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    gaEvent("export_comparison_report");
    toast.success("Comparison report exported!");
  };

  const copyDiffToClipboard = () => {
    if (selectedDiff >= 0 && selectedDiff < differences.length) {
      const diff = differences[selectedDiff];
      const diffText = `Path: ${diff.path}\nType: ${diff.type}\nLeft: ${JSON.stringify(diff.leftValue, null, 2)}\nRight: ${JSON.stringify(diff.rightValue, null, 2)}`;
      navigator.clipboard.writeText(diffText);
      toast.success("Difference copied to clipboard!");
    }
  };

  // Auto-compare when JSON changes
  React.useEffect(() => {
    if (autoCompare && leftJson && rightJson) {
      const timeoutId = setTimeout(compareJsons, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [leftJson, rightJson, autoCompare, compareJsons]);

  // Keyboard shortcuts
  useHotkeys([
    ["mod+enter", compareJsons],
    ["F3", () => navigateDifferences("next")],
    ["shift+F3", () => navigateDifferences("prev")],
    ["mod+c", copyDiffToClipboard],
  ]);

  const selectedDiffData = selectedDiff >= 0 ? differences[selectedDiff] : null;

  return (
    <Modal
      title={
        <Group gap="sm">
          <MdCompare size={20} />
          <Text fw={600}>JSON Data Comparison</Text>
          {stats.totalDifferences > 0 && (
            <Badge variant="light" color={stats.similarity > 80 ? "green" : stats.similarity > 50 ? "yellow" : "red"}>
              {stats.similarity}% similar
            </Badge>
          )}
        </Group>
      }
      size="xl"
      opened={opened}
      onClose={onClose}
      centered
      styles={{ content: { minHeight: "80vh" } }}
    >
      <Stack gap="md">
        {/* Statistics Overview */}
        {stats.totalDifferences > 0 && (
          <Alert variant="light" color="blue">
            <Group justify="space-between" gap="md">
              <Group gap="md">
                <Text size="sm" fw={500}>Comparison Summary:</Text>
                <Badge color="green" variant="light">{stats.additions} added</Badge>
                <Badge color="red" variant="light">{stats.deletions} removed</Badge>
                <Badge color="yellow" variant="light">{stats.modifications} modified</Badge>
              </Group>
              <Progress 
                value={stats.similarity} 
                size="sm" 
                color={stats.similarity > 80 ? "green" : stats.similarity > 50 ? "yellow" : "red"}
                style={{ width: 100 }}
              />
            </Group>
          </Alert>
        )}

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="compare" leftSection={<MdCompare size={14} />}>
              Side by Side
            </Tabs.Tab>
            <Tabs.Tab value="unified" leftSection={<FiEye size={14} />}>
              Unified View
            </Tabs.Tab>
          </Tabs.List>

          {/* Side by Side Comparison */}
          <Tabs.Panel value="compare">
            <Stack gap="sm">
              {/* Controls */}
              <Group justify="space-between">
                <Group gap="xs">
                  <Button
                    size="xs"
                    variant="light"
                    onClick={() => loadCurrentJson("left")}
                    leftSection={<FiCopy size={12} />}
                  >
                    Load Current → Left
                  </Button>
                  <Button
                    size="xs"
                    variant="light"
                    onClick={() => loadCurrentJson("right")}
                    leftSection={<FiCopy size={12} />}
                  >
                    Load Current → Right
                  </Button>
                  <ActionIcon
                    size="sm"
                    variant="light"
                    onClick={swapSides}
                    title="Swap sides"
                  >
                    <MdSwapHoriz size={14} />
                  </ActionIcon>
                </Group>
                
                <Group gap="xs">
                  <Switch
                    size="xs"
                    label="Auto Compare"
                    checked={autoCompare}
                    onChange={(e) => setAutoCompare(e.currentTarget.checked)}
                  />
                  <Button
                    size="xs"
                    loading={isComparing}
                    onClick={compareJsons}
                    leftSection={<FiRefreshCw size={12} />}
                  >
                    Compare
                  </Button>
                </Group>
              </Group>

              {/* Input Areas */}
              <Grid>
                <Grid.Col span={6}>
                  <Stack gap="xs">
                    <TextInput
                      size="xs"
                      placeholder="Label for left side..."
                      value={leftLabel}
                      onChange={(e) => setLeftLabel(e.target.value)}
                    />
                    <Paper withBorder radius="sm" style={{ height: 300 }}>
                      <textarea
                        style={{
                          width: "100%",
                          height: "100%",
                          border: "none",
                          outline: "none",
                          padding: "12px",
                          fontFamily: "monospace",
                          fontSize: "12px",
                          resize: "none",
                          backgroundColor: "transparent",
                        }}
                        placeholder="Paste your JSON here..."
                        value={leftJson}
                        onChange={(e) => setLeftJson(e.target.value)}
                      />
                    </Paper>
                  </Stack>
                </Grid.Col>
                
                <Grid.Col span={6}>
                  <Stack gap="xs">
                    <TextInput
                      size="xs"
                      placeholder="Label for right side..."
                      value={rightLabel}
                      onChange={(e) => setRightLabel(e.target.value)}
                    />
                    <Paper withBorder radius="sm" style={{ height: 300 }}>
                      <textarea
                        style={{
                          width: "100%",
                          height: "100%",
                          border: "none",
                          outline: "none",
                          padding: "12px",
                          fontFamily: "monospace",
                          fontSize: "12px",
                          resize: "none",
                          backgroundColor: "transparent",
                        }}
                        placeholder="Paste your JSON here..."
                        value={rightJson}
                        onChange={(e) => setRightJson(e.target.value)}
                      />
                    </Paper>
                  </Stack>
                </Grid.Col>
              </Grid>
            </Stack>
          </Tabs.Panel>

          {/* Unified Differences View */}
          <Tabs.Panel value="unified">
            <Stack gap="sm">
              {/* Differences Controls */}
              <Group justify="space-between">
                <Group gap="xs">
                  <TextInput
                    size="xs"
                    placeholder="Search differences..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    leftSection={<FiSearch size={12} />}
                    style={{ width: 200 }}
                  />
                  <Switch
                    size="xs"
                    label="Show only differences"
                    checked={showOnlyDifferences}
                    onChange={(e) => setShowOnlyDifferences(e.currentTarget.checked)}
                  />
                </Group>
                
                <Group gap="xs">
                  <Text size="xs" c="dimmed">
                    {selectedDiff + 1} of {filteredDifferences.length}
                  </Text>
                  <ActionIcon
                    size="sm"
                    variant="light"
                    onClick={() => navigateDifferences("prev")}
                    disabled={filteredDifferences.length === 0}
                  >
                    <FiChevronUp size={12} />
                  </ActionIcon>
                  <ActionIcon
                    size="sm"
                    variant="light"
                    onClick={() => navigateDifferences("next")}
                    disabled={filteredDifferences.length === 0}
                  >
                    <FiChevronDown size={12} />
                  </ActionIcon>
                </Group>
              </Group>

              {/* Differences List */}
              <Grid>
                <Grid.Col span={5}>
                  <Text size="sm" fw={500} mb="xs">Differences ({filteredDifferences.length})</Text>
                  <ScrollArea h={400}>
                    <Stack gap="xs">
                      {filteredDifferences.length === 0 ? (
                        <Text size="sm" c="dimmed" ta="center" py="xl">
                          {differences.length === 0 ? "No differences found" : "No matches for current filter"}
                        </Text>
                      ) : (
                        filteredDifferences.map((diff, index) => (
                          <DiffRow
                            key={`${diff.path}-${diff.type}-${index}`}
                            diff={diff}
                            index={index}
                            isSelected={index === selectedDiff}
                            onClick={() => setSelectedDiff(index)}
                          />
                        ))
                      )}
                    </Stack>
                  </ScrollArea>
                </Grid.Col>
                
                <Grid.Col span={7}>
                  <Group justify="space-between" mb="xs">
                    <Text size="sm" fw={500}>Difference Details</Text>
                    {selectedDiffData && (
                      <Button
                        size="xs"
                        variant="subtle"
                        onClick={copyDiffToClipboard}
                        leftSection={<FiCopy size={12} />}
                      >
                        Copy
                      </Button>
                    )}
                  </Group>
                  
                  <Paper withBorder p="md" radius="sm" h={400}>
                    {selectedDiffData ? (
                      <Stack gap="md">
                        <Group gap="xs">
                          <Code>{selectedDiffData.path}</Code>
                          <Badge color={DiffTypeColors[selectedDiffData.type]} variant="light">
                            {selectedDiffData.type}
                          </Badge>
                          <Badge size="xs" color={
                            selectedDiffData.severity === "high" ? "red" : 
                            selectedDiffData.severity === "medium" ? "yellow" : "gray"
                          }>
                            {selectedDiffData.severity} impact
                          </Badge>
                        </Group>
                        
                        <Divider />
                        
                        {selectedDiffData.leftValue !== undefined && (
                          <Box>
                            <Text size="xs" fw={500} c="red" mb="xs">Before (Left):</Text>
                            <CodeHighlight
                              code={JSON.stringify(selectedDiffData.leftValue, null, 2)}
                              language="json"
                              styles={{ root: { fontSize: "11px" } }}
                            />
                          </Box>
                        )}
                        
                        {selectedDiffData.rightValue !== undefined && (
                          <Box>
                            <Text size="xs" fw={500} c="green" mb="xs">After (Right):</Text>
                            <CodeHighlight
                              code={JSON.stringify(selectedDiffData.rightValue, null, 2)}
                              language="json"
                              styles={{ root: { fontSize: "11px" } }}
                            />
                          </Box>
                        )}
                      </Stack>
                    ) : (
                      <Flex align="center" justify="center" h="100%">
                        <Text size="sm" c="dimmed">Select a difference to view details</Text>
                      </Flex>
                    )}
                  </Paper>
                </Grid.Col>
              </Grid>
            </Stack>
          </Tabs.Panel>
        </Tabs>

        {/* Action Buttons */}
        <Group justify="space-between">
          <Group gap="xs">
            <Button
              size="xs"
              variant="light"
              onClick={clearComparison}
              leftSection={<FiRefreshCw size={12} />}
            >
              Clear All
            </Button>
            {differences.length > 0 && (
              <Button
                size="xs"
                variant="light"
                onClick={exportComparison}
                leftSection={<FiDownload size={12} />}
              >
                Export Report
              </Button>
            )}
          </Group>
          
          <Button onClick={onClose}>
            Close
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};