import React from "react";
import type { ModalProps } from "@mantine/core";
import {
  Modal,
  Stack,
  Group,
  Button,
  Text,
  Badge,
  Switch,
  ActionIcon,
  Tooltip,
  ScrollArea,
  Paper,
  Grid,
  Progress,
  Alert,
  RingProgress,
  SimpleGrid,
  Card,
  ThemeIcon,
} from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { event as gaEvent } from "nextjs-google-analytics";
import { toast } from "react-hot-toast";
import {
  FiActivity,
  FiClock,
  FiTrendingUp,
  FiTrendingDown,
  FiAlertCircle,
  FiDownload,
  FiRefreshCw,
  FiSettings,
  FiPlay,
  FiPause,
  FiX,
} from "react-icons/fi";
import { MdAnalytics, MdMemory } from "react-icons/md";
import type { PerformanceAlert } from "../../../store/usePerformanceAnalytics";
import usePerformanceAnalytics from "../../../store/usePerformanceAnalytics";

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, trend }) => (
  <Card withBorder radius="md" padding="md">
    <Group justify="space-between">
      <div>
        <Text c="dimmed" size="xs" fw={700} style={{ textTransform: "uppercase" }}>
          {title}
        </Text>
        <Text fw={700} size="xl">
          {value}
        </Text>
        {trend && (
          <Group gap="xs" mt={5}>
            {trend.isPositive ? (
              <FiTrendingUp size={12} color="green" />
            ) : (
              <FiTrendingDown size={12} color="red" />
            )}
            <Text size="xs" c={trend.isPositive ? "green" : "red"}>
              {Math.abs(trend.value)}%
            </Text>
          </Group>
        )}
      </div>
      <ThemeIcon color={color} size={38} radius="md">
        {icon}
      </ThemeIcon>
    </Group>
  </Card>
);

interface AlertRowProps {
  alert: PerformanceAlert;
  onDismiss: () => void;
}

const AlertRow: React.FC<AlertRowProps> = ({ alert, onDismiss }) => (
  <Alert
    variant="light"
    color={alert.type === "error" ? "red" : alert.type === "warning" ? "yellow" : "blue"}
    icon={<FiAlertCircle size={16} />}
    withCloseButton
    onClose={onDismiss}
  >
    <Group justify="space-between">
      <div style={{ flex: 1 }}>
        <Text size="sm" fw={500}>
          {alert.message}
        </Text>
        <Text size="xs" c="dimmed">
          {new Date(alert.timestamp).toLocaleTimeString()} • {alert.metric}:{" "}
          {alert.value.toFixed(2)}
        </Text>
      </div>
      <Badge
        size="xs"
        color={alert.type === "error" ? "red" : alert.type === "warning" ? "yellow" : "blue"}
      >
        {alert.type}
      </Badge>
    </Group>
  </Alert>
);

export const PerformanceAnalyticsModal = ({ opened, onClose }: ModalProps) => {
  const {
    isEnabled,
    isRecording,
    metrics,
    alerts,
    stats,
    performanceThresholds,
    autoOptimize,
    showRealTimeGraph,
    setEnabled,
    setRecording,
    dismissAlert,
    clearMetrics,
    clearAlerts,
    setAutoOptimize,
    setShowRealTimeGraph,
    generatePerformanceReport,
    getPerformanceTrend,
  } = usePerformanceAnalytics();

  const _performanceThresholds = performanceThresholds;

  const [timeRange, setTimeRange] = React.useState<"hour" | "day" | "week">("hour");
  const [showSettings, setShowSettings] = React.useState(false);

  const activeAlerts = alerts.filter(a => !a.dismissed);
  const recentMetrics = React.useMemo(
    () => getPerformanceTrend(timeRange),
    [timeRange, getPerformanceTrend]
  );

  const chartData = React.useMemo(() => {
    return recentMetrics.map((metric, _index) => ({
      time: new Date(metric.timestamp).toLocaleTimeString(),
      parseTime: metric.parseTime,
      memoryUsage: Math.round(metric.memoryUsage / 1024 / 1024), // Convert to MB
      complexity: metric.complexity,
      nodeCount: metric.nodeCount,
    }));
  }, [recentMetrics]);

  const exportReport = () => {
    const report = generatePerformanceReport();
    const blob = new Blob([report], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `performance-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    gaEvent("export_performance_report");
    toast.success("Performance report exported!");
  };

  const getPerformanceScore = () => {
    if (stats.performanceScore >= 80) return { color: "green", label: "Excellent" };
    if (stats.performanceScore >= 60) return { color: "yellow", label: "Good" };
    if (stats.performanceScore >= 40) return { color: "orange", label: "Fair" };
    return { color: "red", label: "Poor" };
  };

  const performanceInfo = getPerformanceScore();

  useHotkeys([["space", () => setRecording(!isRecording)]]);

  return (
    <Modal
      title={
        <Group gap="sm">
          <MdAnalytics size={20} />
          <Text fw={600}>Performance Analytics Dashboard</Text>
          <Badge variant="dot" color={isRecording ? "green" : "gray"}>
            {isRecording ? "Recording" : "Paused"}
          </Badge>
        </Group>
      }
      size="xl"
      opened={opened}
      onClose={onClose}
      centered
      styles={{ content: { minHeight: "80vh" } }}
    >
      <Stack gap="md">
        {/* Control Panel */}
        <Group justify="space-between">
          <Group gap="xs">
            <Switch
              size="sm"
              label="Enable Analytics"
              checked={isEnabled}
              onChange={e => setEnabled(e.currentTarget.checked)}
            />
            <ActionIcon
              size="sm"
              variant="light"
              color={isRecording ? "red" : "green"}
              onClick={() => setRecording(!isRecording)}
              disabled={!isEnabled}
            >
              {isRecording ? <FiPause size={14} /> : <FiPlay size={14} />}
            </ActionIcon>
            <Tooltip label="Settings">
              <ActionIcon size="sm" variant="light" onClick={() => setShowSettings(!showSettings)}>
                <FiSettings size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>

          <Group gap="xs">
            <Button
              size="xs"
              variant="light"
              leftSection={<FiDownload size={12} />}
              onClick={exportReport}
              disabled={metrics.length === 0}
            >
              Export Report
            </Button>
            <Button
              size="xs"
              variant="subtle"
              leftSection={<FiRefreshCw size={12} />}
              onClick={clearMetrics}
            >
              Clear Data
            </Button>
          </Group>
        </Group>

        {/* Settings Panel */}
        {showSettings && (
          <Paper withBorder p="md" radius="sm">
            <Stack gap="sm">
              <Text size="sm" fw={500}>
                Analytics Settings
              </Text>
              <Group gap="md">
                <Switch
                  size="xs"
                  label="Auto Optimize"
                  checked={autoOptimize}
                  onChange={e => setAutoOptimize(e.currentTarget.checked)}
                />
                <Switch
                  size="xs"
                  label="Real-time Graph"
                  checked={showRealTimeGraph}
                  onChange={e => setShowRealTimeGraph(e.currentTarget.checked)}
                />
              </Group>
              <Group gap="md">
                <Text size="xs">Time Range:</Text>
                <Button.Group>
                  <Button
                    size="xs"
                    variant={timeRange === "hour" ? "filled" : "light"}
                    onClick={() => setTimeRange("hour")}
                  >
                    1H
                  </Button>
                  <Button
                    size="xs"
                    variant={timeRange === "day" ? "filled" : "light"}
                    onClick={() => setTimeRange("day")}
                  >
                    1D
                  </Button>
                  <Button
                    size="xs"
                    variant={timeRange === "week" ? "filled" : "light"}
                    onClick={() => setTimeRange("week")}
                  >
                    1W
                  </Button>
                </Button.Group>
              </Group>
            </Stack>
          </Paper>
        )}

        {/* Performance Overview */}
        <Grid>
          <Grid.Col span={3}>
            <Paper withBorder radius="md" p="md" style={{ textAlign: "center" }}>
              <RingProgress
                size={120}
                thickness={12}
                sections={[{ value: stats.performanceScore, color: performanceInfo.color }]}
                label={
                  <div>
                    <Text size="xs" c="dimmed">
                      Performance
                    </Text>
                    <Text fw={700}>{stats.performanceScore}/100</Text>
                    <Text size="xs" c={performanceInfo.color}>
                      {performanceInfo.label}
                    </Text>
                  </div>
                }
              />
            </Paper>
          </Grid.Col>

          <Grid.Col span={9}>
            <SimpleGrid cols={3} spacing="md">
              <StatCard
                title="Avg Parse Time"
                value={`${stats.avgParseTime.toFixed(1)}ms`}
                icon={<FiClock size={18} />}
                color="blue"
                trend={{ value: 12, isPositive: false }}
              />
              <StatCard
                title="Avg Memory"
                value={`${(stats.avgMemoryUsage / 1024 / 1024).toFixed(1)}MB`}
                icon={<MdMemory size={18} />}
                color="green"
                trend={{ value: 8, isPositive: true }}
              />
              <StatCard
                title="Operations"
                value={stats.totalOperations.toString()}
                icon={<FiActivity size={18} />}
                color="orange"
                trend={{ value: 15, isPositive: true }}
              />
            </SimpleGrid>
          </Grid.Col>
        </Grid>

        {/* Performance Charts */}
        {chartData.length > 0 && (
          <Paper withBorder p="md" radius="sm">
            <Stack gap="md">
              <Group justify="space-between">
                <Text fw={500}>Performance Trends</Text>
                <Badge variant="light">{chartData.length} data points</Badge>
              </Group>

              <SimpleGrid cols={2}>
                <Card withBorder p="md">
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>
                      Parse Time Trend
                    </Text>
                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">
                        Latest:
                      </Text>
                      <Badge color="blue">
                        {chartData[chartData.length - 1]?.parseTime || 0}ms
                      </Badge>
                    </Group>
                    <Progress
                      value={Math.min((chartData[chartData.length - 1]?.parseTime || 0) / 10, 100)}
                      color="blue"
                      size="sm"
                    />
                    <Text size="xs" c="dimmed">
                      Avg:{" "}
                      {chartData.reduce((sum, d) => sum + d.parseTime, 0) / chartData.length || 0}ms
                    </Text>
                  </Stack>
                </Card>

                <Card withBorder p="md">
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>
                      Memory Usage Trend
                    </Text>
                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">
                        Latest:
                      </Text>
                      <Badge color="green">
                        {chartData[chartData.length - 1]?.memoryUsage || 0}MB
                      </Badge>
                    </Group>
                    <Progress
                      value={Math.min(
                        ((chartData[chartData.length - 1]?.memoryUsage || 0) / 100) * 100,
                        100
                      )}
                      color="green"
                      size="sm"
                    />
                    <Text size="xs" c="dimmed">
                      Avg:{" "}
                      {(
                        chartData.reduce((sum, d) => sum + d.memoryUsage, 0) / chartData.length || 0
                      ).toFixed(1)}
                      MB
                    </Text>
                  </Stack>
                </Card>

                <Card withBorder p="md">
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>
                      Complexity Score
                    </Text>
                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">
                        Latest:
                      </Text>
                      <Badge color="orange">
                        {chartData[chartData.length - 1]?.complexity || 0}/10
                      </Badge>
                    </Group>
                    <Progress
                      value={(chartData[chartData.length - 1]?.complexity || 0) * 10}
                      color="orange"
                      size="sm"
                    />
                    <Text size="xs" c="dimmed">
                      Avg:{" "}
                      {(
                        chartData.reduce((sum, d) => sum + d.complexity, 0) / chartData.length || 0
                      ).toFixed(1)}
                      /10
                    </Text>
                  </Stack>
                </Card>

                <Card withBorder p="md">
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>
                      Node Count
                    </Text>
                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">
                        Latest:
                      </Text>
                      <Badge color="purple">
                        {(chartData[chartData.length - 1]?.nodeCount || 0).toLocaleString()}
                      </Badge>
                    </Group>
                    <Progress
                      value={Math.min(
                        ((chartData[chartData.length - 1]?.nodeCount || 0) / 1000) * 100,
                        100
                      )}
                      color="purple"
                      size="sm"
                    />
                    <Text size="xs" c="dimmed">
                      Avg:{" "}
                      {(
                        chartData.reduce((sum, d) => sum + d.nodeCount, 0) / chartData.length || 0
                      ).toFixed(0)}
                    </Text>
                  </Stack>
                </Card>
              </SimpleGrid>
            </Stack>
          </Paper>
        )}

        {/* Active Alerts */}
        {activeAlerts.length > 0 && (
          <Paper withBorder p="md" radius="sm">
            <Group justify="space-between" mb="md">
              <Text fw={500}>Active Alerts ({activeAlerts.length})</Text>
              <Button
                size="xs"
                variant="subtle"
                onClick={clearAlerts}
                leftSection={<FiX size={12} />}
              >
                Dismiss All
              </Button>
            </Group>

            <ScrollArea h={200}>
              <Stack gap="xs">
                {activeAlerts.map(alert => (
                  <AlertRow key={alert.id} alert={alert} onDismiss={() => dismissAlert(alert.id)} />
                ))}
              </Stack>
            </ScrollArea>
          </Paper>
        )}

        {/* Performance Metrics Table */}
        {metrics.length === 0 ? (
          <Paper withBorder p="xl" radius="sm" style={{ textAlign: "center" }}>
            <FiActivity size={48} color="var(--mantine-color-gray-5)" />
            <Text size="lg" fw={500} mt="md" c="dimmed">
              No Performance Data
            </Text>
            <Text size="sm" c="dimmed">
              Start using the JSON editor to see performance analytics
            </Text>
          </Paper>
        ) : (
          <Paper withBorder p="md" radius="sm">
            <Group justify="space-between" mb="md">
              <Text fw={500}>Recent Metrics</Text>
              <Badge variant="light">{metrics.length} total records</Badge>
            </Group>

            <ScrollArea h={250}>
              <table style={{ width: "100%", fontSize: "12px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--mantine-color-gray-3)" }}>
                    <th style={{ padding: "8px", textAlign: "left" }}>Time</th>
                    <th style={{ padding: "8px", textAlign: "right" }}>Parse Time</th>
                    <th style={{ padding: "8px", textAlign: "right" }}>Memory</th>
                    <th style={{ padding: "8px", textAlign: "right" }}>Nodes</th>
                    <th style={{ padding: "8px", textAlign: "right" }}>Complexity</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics
                    .slice(-10)
                    .reverse()
                    .map((metric, _index) => (
                      <tr key={metric.timestamp}>
                        <td style={{ padding: "8px" }}>
                          {new Date(metric.timestamp).toLocaleTimeString()}
                        </td>
                        <td style={{ padding: "8px", textAlign: "right" }}>
                          <Badge
                            size="xs"
                            color={
                              metric.parseTime > 1000
                                ? "red"
                                : metric.parseTime > 500
                                  ? "yellow"
                                  : "green"
                            }
                          >
                            {metric.parseTime}ms
                          </Badge>
                        </td>
                        <td style={{ padding: "8px", textAlign: "right" }}>
                          {(metric.memoryUsage / 1024 / 1024).toFixed(1)}MB
                        </td>
                        <td style={{ padding: "8px", textAlign: "right" }}>
                          {metric.nodeCount.toLocaleString()}
                        </td>
                        <td style={{ padding: "8px", textAlign: "right" }}>
                          <Badge
                            size="xs"
                            color={
                              metric.complexity > 7
                                ? "red"
                                : metric.complexity > 5
                                  ? "yellow"
                                  : "green"
                            }
                          >
                            {metric.complexity}/10
                          </Badge>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </ScrollArea>
          </Paper>
        )}

        {/* Action Buttons */}
        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            Press Space to toggle recording •{" "}
            {isEnabled ? "Analytics enabled" : "Analytics disabled"}
          </Text>
          <Button onClick={onClose}>Close</Button>
        </Group>
      </Stack>
    </Modal>
  );
};
