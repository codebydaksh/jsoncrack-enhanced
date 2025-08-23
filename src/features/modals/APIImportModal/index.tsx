import React, { useState, useEffect } from "react";
import type { ModalProps } from "@mantine/core";
import {
  Modal,
  Stack,
  Text,
  Button,
  Group,
  TextInput,
  Alert,
  Badge,
  Paper,
  Divider,
  ActionIcon,
  Tooltip,
  Progress,
  Loader,
  Collapse,
  Select,
} from "@mantine/core";
import { event as gaEvent } from "nextjs-google-analytics";
import toast from "react-hot-toast";
import { FiGlobe, FiInfo, FiPlus, FiAlertTriangle, FiSettings, FiX, FiHeart } from "react-icons/fi";
import { LuExternalLink } from "react-icons/lu";
import { FileFormat } from "../../../enums/file.enum";
import { ApiImportService, type ApiError } from "../../../lib/utils/apiImport";
import useFile from "../../../store/useFile";

interface ApiImportProps extends ModalProps {}

interface FavoriteApi {
  id: string;
  name: string;
  url: string;
  headers: Array<{ key: string; value: string; id: string }>;
  dateAdded: string;
}

export const APIImportModal = ({ opened, onClose }: ApiImportProps) => {
  const setContents = useFile(state => state.setContents);
  const [apiUrl, setApiUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [loadingStep, setLoadingStep] = useState("");
  const [showHeaders, setShowHeaders] = useState(false);
  const [headers, setHeaders] = useState<Array<{ key: string; value: string; id: string }>>([]);
  const [favorites, setFavorites] = useState<FavoriteApi[]>([]);
  const [selectedFavorite, setSelectedFavorite] = useState<string | null>(null);
  const [urlValidation, setUrlValidation] = useState<{
    isValid: boolean;
    message: string;
    suggestion?: string;
  }>({ isValid: true, message: "" });

  // Load favorites from localStorage on mount
  useEffect(() => {
    const savedFavorites = localStorage.getItem("api-favorites");
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (error) {
        console.error("Error loading favorites:", error);
      }
    }
  }, []);

  // Save favorites to localStorage
  const saveFavorites = (newFavorites: FavoriteApi[]) => {
    setFavorites(newFavorites);
    localStorage.setItem("api-favorites", JSON.stringify(newFavorites));
  };

  const addHeader = () => {
    const newHeader = {
      id: `header_${Date.now()}`,
      key: "",
      value: "",
    };
    setHeaders(prev => [...prev, newHeader]);
  };

  const removeHeader = (id: string) => {
    setHeaders(prev => prev.filter(header => header.id !== id));
  };

  const updateHeader = (id: string, field: "key" | "value", newValue: string) => {
    setHeaders(prev =>
      prev.map(header => (header.id === id ? { ...header, [field]: newValue } : header))
    );
  };

  const addCommonHeader = (key: string, placeholder: string) => {
    const newHeader = {
      id: `header_${Date.now()}`,
      key,
      value: placeholder,
    };
    setHeaders(prev => [...prev, newHeader]);
    setShowHeaders(true);
  };

  const saveAsFavorite = () => {
    if (!apiUrl.trim()) {
      toast.error("Please enter an API URL to save as favorite");
      return;
    }

    const url = new URL(apiUrl);
    const name = prompt("Enter a name for this favorite:", url.hostname) || url.hostname;

    const newFavorite: FavoriteApi = {
      id: `fav_${Date.now()}`,
      name,
      url: apiUrl,
      headers: headers.filter(h => h.key.trim() && h.value.trim()),
      dateAdded: new Date().toISOString(),
    };

    const updatedFavorites = [...favorites, newFavorite];
    saveFavorites(updatedFavorites);
    toast.success(`"${name}" saved to favorites!`);
  };

  const loadFavorite = (favoriteId: string) => {
    const favorite = favorites.find(f => f.id === favoriteId);
    if (favorite) {
      setApiUrl(favorite.url);
      setHeaders(favorite.headers);
      if (favorite.headers.length > 0) {
        setShowHeaders(true);
      }
      setSelectedFavorite(favoriteId);
      toast.success(`Loaded "${favorite.name}"`);
    }
  };

  const removeFavorite = (favoriteId: string) => {
    const favorite = favorites.find(f => f.id === favoriteId);
    if (favorite && confirm(`Remove "${favorite.name}" from favorites?`)) {
      const updatedFavorites = favorites.filter(f => f.id !== favoriteId);
      saveFavorites(updatedFavorites);
      setSelectedFavorite(null);
      toast.success("Favorite removed");
    }
  };

  const isFavorite = (url: string) => {
    return favorites.some(f => f.url === url);
  };

  // URL validation and suggestions
  const validateUrl = (url: string) => {
    if (!url.trim()) {
      setUrlValidation({ isValid: true, message: "" });
      return;
    }

    try {
      const urlObj = new URL(url);

      // Check protocol
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        setUrlValidation({
          isValid: false,
          message: "URL must use HTTP or HTTPS protocol",
          suggestion: url.replace(/^[^:]+:/, "https:"),
        });
        return;
      }

      // Check for common issues
      if (urlObj.pathname === "/" && !urlObj.search) {
        setUrlValidation({
          isValid: false,
          message: "URL appears to be a domain root. Consider adding an API endpoint.",
          suggestion: getSuggestedEndpoint(urlObj.hostname),
        });
        return;
      }

      // Check for localhost without protocol
      if (urlObj.hostname === "localhost" && urlObj.protocol === "http:") {
        setUrlValidation({
          isValid: true,
          message: "Local development detected",
        });
        return;
      }

      setUrlValidation({ isValid: true, message: "Valid URL" });
    } catch (error) {
      // Try to fix common URL issues
      let suggestion = url;
      if (!url.startsWith("http")) {
        suggestion = `https://${url}`;
      }

      setUrlValidation({
        isValid: false,
        message: "Invalid URL format",
        suggestion,
      });
    }
  };

  const getSuggestedEndpoint = (hostname: string): string => {
    const suggestions: Record<string, string> = {
      "jsonplaceholder.typicode.com": "https://jsonplaceholder.typicode.com/users",
      "api.github.com": "https://api.github.com/users/octocat",
      "httpbin.org": "https://httpbin.org/json",
      "reqres.in": "https://reqres.in/api/users",
      "randomuser.me": "https://randomuser.me/api",
      "dummyjson.com": "https://dummyjson.com/products",
    };

    return suggestions[hostname] || `https://${hostname}/api`;
  };

  const applySuggestion = (suggestion: string) => {
    setApiUrl(suggestion);
    validateUrl(suggestion);
  };

  // Validate URL on change
  const handleUrlChange = (value: string) => {
    setApiUrl(value);
    setSelectedFavorite(null);
    validateUrl(value);
  };

  const handleImport = async () => {
    if (!apiUrl.trim()) {
      toast.error("Please enter a valid API URL");
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress(0);
    setLoadingStep("");
    gaEvent("api_import_attempt");

    try {
      // Step 1: URL validation
      setProgress(20);
      setLoadingStep("Validating URL...");
      await new Promise(resolve => setTimeout(resolve, 300)); // Small delay for UX

      // Step 2: Fetching data
      setProgress(40);
      setLoadingStep("Fetching data from API...");

      // Prepare custom headers
      const customHeaders: Record<string, string> = {};
      headers
        .filter(h => h.key.trim() && h.value.trim())
        .forEach(h => {
          customHeaders[h.key.trim()] = h.value.trim();
        });

      const response = await ApiImportService.fetchJson(apiUrl, {
        headers: customHeaders,
      });

      // Step 3: Processing JSON
      setProgress(70);
      setLoadingStep("Processing JSON data...");
      await new Promise(resolve => setTimeout(resolve, 200));

      // Step 4: Loading into editor
      setProgress(90);
      setLoadingStep("Loading into editor...");
      setContents({
        contents: JSON.stringify(response.data, null, 2),
        format: FileFormat.JSON,
      });

      // Step 5: Complete
      setProgress(100);
      setLoadingStep("Complete!");
      await new Promise(resolve => setTimeout(resolve, 200));

      toast.success("API data imported successfully!");
      gaEvent("api_import_success", { url: new URL(apiUrl).hostname });

      // Reset form and close modal
      setApiUrl("");
      setError(null);
      setProgress(0);
      setLoadingStep("");
      onClose();
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = ApiImportService.getErrorMessage(apiError);
      setError(errorMessage);
      toast.error(errorMessage);
      gaEvent("api_import_error", { error: apiError.type, url: apiUrl });
      setProgress(0);
      setLoadingStep("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setApiUrl("");
    setIsLoading(false);
    setError(null);
    setProgress(0);
    setLoadingStep("");
    setShowHeaders(false);
    setHeaders([]);
    onClose();
  };

  return (
    <Modal title="Import API Data" size="lg" opened={opened} onClose={handleClose} centered>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Import JSON data directly from any public API endpoint. Enter the API URL below to fetch
          and visualize the data in real-time.
        </Text>

        <Alert icon={<FiInfo size={16} />} color="blue" variant="light">
          <Text size="xs">
            <strong>Tip:</strong> Try popular APIs like JSONPlaceholder, GitHub API, or any public
            REST endpoint that returns JSON data.
          </Text>
        </Alert>

        {/* Favorites Section */}
        {favorites.length > 0 && (
          <Paper withBorder p="md" radius="sm">
            <Stack gap="md">
              <Group justify="space-between">
                <Group gap="xs">
                  <FiHeart size={16} />
                  <Text size="sm" fw={500}>
                    Saved Favorites
                  </Text>
                  <Badge variant="light" size="xs">
                    {favorites.length}
                  </Badge>
                </Group>
              </Group>

              <Select
                placeholder="Select a saved API..."
                data={favorites.map(fav => ({
                  value: fav.id,
                  label: fav.name,
                  description: fav.url,
                }))}
                value={selectedFavorite}
                onChange={value => {
                  if (value) {
                    loadFavorite(value);
                  }
                }}
                clearable
                searchable
                size="sm"
              />

              {selectedFavorite && (
                <Group gap="xs">
                  <Button
                    size="xs"
                    variant="light"
                    color="red"
                    onClick={() => removeFavorite(selectedFavorite)}
                  >
                    Remove from Favorites
                  </Button>
                </Group>
              )}
            </Stack>
          </Paper>
        )}

        {error && (
          <Alert icon={<FiAlertTriangle size={16} />} color="red" variant="light">
            <Text size="xs">{error}</Text>
          </Alert>
        )}

        {isLoading && (
          <Paper withBorder p="md" radius="sm" bg="blue.0">
            <Stack gap="sm">
              <Group justify="space-between">
                <Text size="sm" fw={500}>
                  Importing API Data...
                </Text>
                <Loader size="sm" color="blue" />
              </Group>
              {loadingStep && (
                <Text size="xs" c="dimmed">
                  {loadingStep}
                </Text>
              )}
              <Progress value={progress} size="sm" color="blue" animated />
            </Stack>
          </Paper>
        )}

        <Paper withBorder p="md" radius="sm">
          <Stack gap="md">
            <TextInput
              label="API Endpoint URL"
              placeholder="https://jsonplaceholder.typicode.com/users"
              value={apiUrl}
              onChange={e => handleUrlChange(e.currentTarget.value)}
              leftSection={<FiGlobe size={16} />}
              rightSection={
                <Group gap={4}>
                  {apiUrl && (
                    <Tooltip label="Save as favorite">
                      <ActionIcon
                        variant="subtle"
                        size="sm"
                        color={isFavorite(apiUrl) ? "red" : "gray"}
                        onClick={saveAsFavorite}
                      >
                        <FiHeart size={14} fill={isFavorite(apiUrl) ? "currentColor" : "none"} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                  {apiUrl && (
                    <Tooltip label="Test URL in new tab">
                      <ActionIcon
                        variant="subtle"
                        size="sm"
                        onClick={() => window.open(apiUrl, "_blank")}
                      >
                        <LuExternalLink size={14} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>
              }
              error={!urlValidation.isValid ? urlValidation.message : undefined}
              data-autofocus
            />

            {/* URL Validation Messages */}
            {apiUrl && urlValidation.suggestion && (
              <Alert icon={<FiInfo size={16} />} color="yellow" variant="light">
                <Group justify="space-between">
                  <Text size="xs">{urlValidation.message}</Text>
                  <Button
                    size="xs"
                    variant="subtle"
                    onClick={() => applySuggestion(urlValidation.suggestion!)}
                  >
                    Use: {urlValidation.suggestion}
                  </Button>
                </Group>
              </Alert>
            )}

            {urlValidation.isValid && apiUrl && urlValidation.message && (
              <Text size="xs" c="green">
                ✓ {urlValidation.message}
              </Text>
            )}

            <Group gap="xs">
              <Badge variant="light" color="green" size="sm">
                GET requests only
              </Badge>
              <Badge variant="light" color="blue" size="sm">
                JSON responses
              </Badge>
              <Badge variant="light" color="orange" size="sm">
                Public APIs
              </Badge>
            </Group>
          </Stack>
        </Paper>

        {/* Custom Headers Section */}
        <Paper withBorder p="md" radius="sm">
          <Stack gap="md">
            <Group justify="space-between">
              <Group gap="xs">
                <FiSettings size={16} />
                <Text size="sm" fw={500}>
                  Custom Headers
                </Text>
                <Badge variant="light" size="xs">
                  Optional
                </Badge>
              </Group>
              <Button variant="subtle" size="xs" onClick={() => setShowHeaders(!showHeaders)}>
                {showHeaders ? "Hide" : "Show"} Headers
              </Button>
            </Group>

            <Collapse in={showHeaders}>
              <Stack gap="md">
                <Text size="xs" c="dimmed">
                  Add custom headers for private APIs that require authentication or API keys.
                </Text>

                {/* Common Headers */}
                <Group gap="xs" wrap="wrap">
                  <Button
                    size="xs"
                    variant="light"
                    onClick={() => addCommonHeader("Authorization", "Bearer your-token-here")}
                  >
                    + Authorization
                  </Button>
                  <Button
                    size="xs"
                    variant="light"
                    onClick={() => addCommonHeader("X-API-Key", "your-api-key-here")}
                  >
                    + API Key
                  </Button>
                  <Button
                    size="xs"
                    variant="light"
                    onClick={() => addCommonHeader("X-RapidAPI-Key", "your-rapidapi-key")}
                  >
                    + RapidAPI
                  </Button>
                  <Button size="xs" variant="light" onClick={addHeader}>
                    + Custom
                  </Button>
                </Group>

                {/* Headers List */}
                {headers.length > 0 && (
                  <Stack gap="xs">
                    {headers.map(header => (
                      <Group key={header.id} gap="xs">
                        <TextInput
                          placeholder="Header name"
                          value={header.key}
                          onChange={e => updateHeader(header.id, "key", e.currentTarget.value)}
                          style={{ flex: 1 }}
                          size="xs"
                        />
                        <TextInput
                          placeholder="Header value"
                          value={header.value}
                          onChange={e => updateHeader(header.id, "value", e.currentTarget.value)}
                          style={{ flex: 2 }}
                          size="xs"
                        />
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          onClick={() => removeHeader(header.id)}
                        >
                          <FiX size={14} />
                        </ActionIcon>
                      </Group>
                    ))}
                  </Stack>
                )}
              </Stack>
            </Collapse>
          </Stack>
        </Paper>

        <Divider label="Quick Examples" labelPosition="center" />

        <Paper withBorder p="sm" radius="sm" bg="gray.0">
          <Stack gap="xs">
            <Text size="xs" fw={500} c="dimmed">
              Popular API Examples:
            </Text>
            <Group gap="xs" wrap="wrap">
              <Button
                size="xs"
                variant="subtle"
                onClick={() => setApiUrl("https://jsonplaceholder.typicode.com/users")}
              >
                Users Data
              </Button>
              <Button
                size="xs"
                variant="subtle"
                onClick={() => setApiUrl("https://jsonplaceholder.typicode.com/posts")}
              >
                Posts Data
              </Button>
              <Button
                size="xs"
                variant="subtle"
                onClick={() => setApiUrl("https://httpbin.org/json")}
              >
                Sample JSON
              </Button>
            </Group>
          </Stack>
        </Paper>

        <Group justify="space-between" mt="md">
          <Button variant="subtle" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            loading={isLoading}
            leftSection={<FiPlus size={16} />}
            disabled={!apiUrl.trim() || !urlValidation.isValid}
          >
            Import JSON
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
