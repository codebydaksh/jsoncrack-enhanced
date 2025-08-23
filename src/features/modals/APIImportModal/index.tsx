import React, { useState } from "react";
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
} from "@mantine/core";
import { event as gaEvent } from "nextjs-google-analytics";
import toast from "react-hot-toast";
import { FiGlobe, FiInfo, FiPlus, FiAlertTriangle } from "react-icons/fi";
import { LuExternalLink } from "react-icons/lu";
import { FileFormat } from "../../../enums/file.enum";
import { ApiImportService, type ApiError } from "../../../lib/utils/apiImport";
import useFile from "../../../store/useFile";

interface ApiImportProps extends ModalProps {}

export const APIImportModal = ({ opened, onClose }: ApiImportProps) => {
  const setContents = useFile(state => state.setContents);
  const [apiUrl, setApiUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    if (!apiUrl.trim()) {
      toast.error("Please enter a valid API URL");
      return;
    }

    setIsLoading(true);
    setError(null);
    gaEvent("api_import_attempt");

    try {
      const response = await ApiImportService.fetchJson(apiUrl);

      // Set the JSON data in the file store
      setContents({
        contents: JSON.stringify(response.data, null, 2),
        format: FileFormat.JSON,
      });

      toast.success("API data imported successfully!");
      gaEvent("api_import_success", { url: new URL(apiUrl).hostname });

      // Reset form and close modal
      setApiUrl("");
      setError(null);
      onClose();
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = ApiImportService.getErrorMessage(apiError);
      setError(errorMessage);
      toast.error(errorMessage);
      gaEvent("api_import_error", { error: apiError.type, url: apiUrl });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setApiUrl("");
    setIsLoading(false);
    setError(null);
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

        {error && (
          <Alert icon={<FiAlertTriangle size={16} />} color="red" variant="light">
            <Text size="xs">{error}</Text>
          </Alert>
        )}

        <Paper withBorder p="md" radius="sm">
          <Stack gap="md">
            <TextInput
              label="API Endpoint URL"
              placeholder="https://jsonplaceholder.typicode.com/users"
              value={apiUrl}
              onChange={e => setApiUrl(e.currentTarget.value)}
              leftSection={<FiGlobe size={16} />}
              rightSection={
                apiUrl && (
                  <Tooltip label="Test URL in new tab">
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      onClick={() => window.open(apiUrl, "_blank")}
                    >
                      <LuExternalLink size={14} />
                    </ActionIcon>
                  </Tooltip>
                )
              }
              data-autofocus
            />

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
            disabled={!apiUrl.trim()}
          >
            Import JSON
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
