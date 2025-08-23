import React from "react";
import type { ModalProps } from "@mantine/core";
import {
  Stack,
  Modal,
  TextInput,
  Group,
  Button,
  Switch,
  Select,
  Badge,
  ActionIcon,
  Text,
  ScrollArea,
  Paper,
  Menu,
  Box,
  Alert,
} from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { event as gaEvent } from "nextjs-google-analytics";
import { toast } from "react-hot-toast";
import {
  FiSearch,
  FiFilter,
  FiArrowDown,
  FiArrowUp,
  FiX,
  FiRefreshCw,
  FiInfo,
  FiChevronDown,
  FiPlus,
} from "react-icons/fi";
import { MdSearch } from "react-icons/md";
import { VscJson } from "react-icons/vsc";
import type { SearchFilter } from "../../../store/useAdvancedSearch";
import useAdvancedSearch from "../../../store/useAdvancedSearch";
import useJson from "../../../store/useJson";

export const AdvancedSearchModal = ({ opened, onClose }: ModalProps) => {
  const {
    searchQuery,
    searchMode,
    caseSensitive,
    searchField,
    results,
    currentResultIndex,
    filters,
    highlightResults,
    searchHistory,
    setSearchQuery,
    setSearchMode,
    setCaseSensitive,
    setSearchField,
    setCurrentResultIndex,
    addFilter,
    removeFilter,
    setHighlightResults,
    searchInJson,
    navigateResults,
    clearResults,
  } = useAdvancedSearch();

  const getJson = useJson(state => state.getJson);
  const [isSearching, setIsSearching] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(false);

  const handleSearch = React.useCallback(async () => {
    if (!searchQuery.trim()) {
      clearResults();
      return;
    }

    setIsSearching(true);
    try {
      const jsonData = getJson();
      if (jsonData) {
        const parsedData = JSON.parse(jsonData);
        searchInJson(parsedData);
        gaEvent("advanced_search", { mode: searchMode, field: searchField });
      }
    } catch (error) {
      toast.error("Invalid JSON data");
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, searchMode, searchField, getJson, searchInJson, clearResults]);

  const addNewFilter = () => {
    const newFilter: SearchFilter = {
      type: "contains",
      field: "both",
      query: "",
      caseSensitive: false,
      enabled: true,
    };
    addFilter(newFilter);
    setShowFilters(true);
  };

  const getSearchModeIcon = () => {
    switch (searchMode) {
      case "regex":
        return <MdSearch size={16} />;
      case "jsonPath":
        return <VscJson size={16} />;
      default:
        return <FiSearch size={16} />;
    }
  };

  const getSearchModeHelp = () => {
    switch (searchMode) {
      case "regex":
        return "Use regular expressions for pattern matching. Example: ^user.*@.*\\.com$";
      case "jsonPath":
        return "Use JSONPath queries to find specific elements. Example: $.users[*].email";
      default:
        return "Simple text search with exact or partial matching.";
    }
  };

  // Keyboard shortcuts
  useHotkeys([
    ["Enter", handleSearch],
    ["mod+f", () => setSearchQuery("")],
    ["F3", () => navigateResults("next")],
    ["shift+F3", () => navigateResults("prev")],
  ]);

  React.useEffect(() => {
    if (searchQuery.trim()) {
      const timeoutId = setTimeout(handleSearch, 300); // Debounce
      return () => clearTimeout(timeoutId);
    } else {
      clearResults();
    }
  }, [searchQuery, searchMode, searchField, caseSensitive, handleSearch, clearResults]);

  return (
    <Modal
      title={
        <Group gap="sm">
          <FiSearch size={20} />
          <Text fw={600}>Advanced Search</Text>
          <Badge variant="light" color="blue">
            {results.length} results
          </Badge>
        </Group>
      }
      size="lg"
      opened={opened}
      onClose={onClose}
      centered
    >
      <Stack gap="md">
        {/* Search Input Section */}
        <Paper withBorder p="md" radius="sm">
          <Stack gap="sm">
            <Group gap="xs">
              <TextInput
                placeholder={
                  searchMode === "regex"
                    ? "Enter regex pattern..."
                    : searchMode === "jsonPath"
                      ? "Enter JSONPath query..."
                      : "Search in JSON..."
                }
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                leftSection={getSearchModeIcon()}
                rightSection={
                  <Group gap="xs">
                    {searchQuery && (
                      <ActionIcon size="sm" variant="subtle" onClick={() => setSearchQuery("")}>
                        <FiX size={12} />
                      </ActionIcon>
                    )}
                    <Button size="compact-sm" loading={isSearching} onClick={handleSearch}>
                      Search
                    </Button>
                  </Group>
                }
                style={{ flex: 1 }}
              />
            </Group>

            {/* Search Options */}
            <Group gap="md">
              <Select
                value={searchMode}
                onChange={value => setSearchMode(value as "simple" | "regex" | "jsonPath")}
                data={[
                  { value: "simple", label: "Simple Text" },
                  { value: "regex", label: "Regular Expression" },
                  { value: "jsonPath", label: "JSONPath Query" },
                ]}
                size="xs"
                style={{ width: 140 }}
              />

              <Select
                value={searchField}
                onChange={value => setSearchField(value as "key" | "value" | "both")}
                data={[
                  { value: "both", label: "Keys & Values" },
                  { value: "key", label: "Keys Only" },
                  { value: "value", label: "Values Only" },
                ]}
                size="xs"
                style={{ width: 120 }}
              />

              <Switch
                size="xs"
                label="Case Sensitive"
                checked={caseSensitive}
                onChange={e => setCaseSensitive(e.currentTarget.checked)}
              />

              <Switch
                size="xs"
                label="Highlight"
                checked={highlightResults}
                onChange={e => setHighlightResults(e.currentTarget.checked)}
              />
            </Group>

            {/* Help Text */}
            <Alert icon={<FiInfo size={14} />} color="blue" variant="light">
              <Text size="xs">{getSearchModeHelp()}</Text>
            </Alert>
          </Stack>
        </Paper>

        {/* Results Navigation */}
        {results.length > 0 && (
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Result {currentResultIndex + 1} of {results.length}
            </Text>
            <Group gap="xs">
              <ActionIcon
                size="sm"
                variant="light"
                onClick={() => navigateResults("prev")}
                disabled={results.length === 0}
              >
                <FiArrowUp size={12} />
              </ActionIcon>
              <ActionIcon
                size="sm"
                variant="light"
                onClick={() => navigateResults("next")}
                disabled={results.length === 0}
              >
                <FiArrowDown size={12} />
              </ActionIcon>
            </Group>
          </Group>
        )}

        {/* Advanced Filters */}
        <Group justify="space-between">
          <Button
            variant="light"
            size="xs"
            leftSection={<FiFilter size={14} />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters ({filters.length})
          </Button>

          <Menu>
            <Menu.Target>
              <Button variant="subtle" size="xs" rightSection={<FiChevronDown size={12} />}>
                History
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              {searchHistory.length > 0 ? (
                searchHistory.map((query, index) => (
                  <Menu.Item key={index} onClick={() => setSearchQuery(query)}>
                    {query}
                  </Menu.Item>
                ))
              ) : (
                <Menu.Item disabled>No search history</Menu.Item>
              )}
            </Menu.Dropdown>
          </Menu>
        </Group>

        {/* Filters Section */}
        {showFilters && (
          <Paper withBorder p="md" radius="sm">
            <Stack gap="sm">
              <Group justify="space-between">
                <Text size="sm" fw={500}>
                  Advanced Filters
                </Text>
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<FiPlus size={12} />}
                  onClick={addNewFilter}
                >
                  Add Filter
                </Button>
              </Group>

              {filters.length === 0 ? (
                <Text size="xs" c="dimmed">
                  No filters active
                </Text>
              ) : (
                <Stack gap="xs">
                  {filters.map((filter, index) => (
                    <Group key={index} gap="xs">
                      <Select
                        size="xs"
                        value={filter.type}
                        onChange={() => {
                          // updateFilter(index, { ...filter, type: value as SearchFilter["type"] });
                        }}
                        data={[
                          { value: "equals", label: "Equals" },
                          { value: "contains", label: "Contains" },
                          { value: "startsWith", label: "Starts With" },
                          { value: "endsWith", label: "Ends With" },
                          { value: "regex", label: "Regex" },
                        ]}
                        style={{ width: 100 }}
                      />

                      <TextInput
                        size="xs"
                        placeholder="Filter value..."
                        value={filter.query}
                        onChange={() => {
                          // updateFilter(index, { query: e.target.value });
                        }}
                        style={{ flex: 1 }}
                      />

                      <ActionIcon size="sm" color="red" onClick={() => removeFilter(index)}>
                        <FiX size={12} />
                      </ActionIcon>
                    </Group>
                  ))}
                </Stack>
              )}
            </Stack>
          </Paper>
        )}

        {/* Results List */}
        {results.length > 0 && (
          <ScrollArea h={200}>
            <Stack gap="xs">
              {results.map((result, index) => (
                <Paper
                  key={`${result.path}-${index}`}
                  withBorder
                  p="xs"
                  radius="sm"
                  style={{
                    cursor: "pointer",
                    backgroundColor:
                      index === currentResultIndex ? "var(--mantine-color-blue-light)" : undefined,
                  }}
                  onClick={() => setCurrentResultIndex(index)}
                >
                  <Group justify="space-between" gap="xs">
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Text size="xs" fw={500} truncate>
                        {result.path}
                      </Text>
                      <Text size="xs" c="dimmed" truncate>
                        {result.type === "key"
                          ? `Key: ${result.key}`
                          : result.type === "value"
                            ? `Value: ${JSON.stringify(result.value)}`
                            : `${result.key}: ${JSON.stringify(result.value)}`}
                      </Text>
                    </Box>
                    <Badge
                      size="xs"
                      variant="outline"
                      color={
                        result.type === "key"
                          ? "blue"
                          : result.type === "value"
                            ? "green"
                            : "purple"
                      }
                    >
                      {result.type}
                    </Badge>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </ScrollArea>
        )}

        {/* Action Buttons */}
        <Group justify="space-between">
          <Group gap="xs">
            <Button
              variant="light"
              size="xs"
              leftSection={<FiRefreshCw size={12} />}
              onClick={handleSearch}
            >
              Refresh
            </Button>
          </Group>

          <Button onClick={onClose}>Close</Button>
        </Group>
      </Stack>
    </Modal>
  );
};
