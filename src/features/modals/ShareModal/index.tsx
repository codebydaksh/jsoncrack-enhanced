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
  Switch,
  Badge,
  Divider,
  Code,
  Tooltip,
} from "@mantine/core";
import { event as gaEvent } from "nextjs-google-analytics";
import toast from "react-hot-toast";
import { FiCopy, FiShare2, FiInfo, FiClock } from "react-icons/fi";
import { LuLink, LuExternalLink } from "react-icons/lu";
import useJson from "../../../store/useJson";

const MAX_URL_LENGTH = 2000; // Conservative limit for URL length
const COMPRESSION_THRESHOLD = 1000; // Compress if JSON is larger than 1KB

// Simple LZ-string-like compression for URL encoding
const compressForURL = (str: string): string => {
  try {
    // Use btoa for basic base64 encoding (browsers handle URL encoding)
    return btoa(encodeURIComponent(str));
  } catch {
    return encodeURIComponent(str);
  }
};

const decompressFromURL = (compressed: string): string => {
  try {
    return decodeURIComponent(atob(compressed));
  } catch {
    return decodeURIComponent(compressed);
  }
};

export const ShareModal = ({ opened, onClose }: ModalProps) => {
  const getJson = useJson(state => state.getJson);
  const [shareURL, setShareURL] = useState("");
  const [isCompressed, setIsCompressed] = useState(false);
  const [includeSettings, setIncludeSettings] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [urlSize, setUrlSize] = useState(0);

  const generateShareableLink = async () => {
    setIsGenerating(true);
    gaEvent("generate_share_link");

    try {
      const jsonString = getJson();
      
      if (!jsonString.trim()) {
        toast.error("Please load some JSON data before sharing");
        return;
      }

      // Create share data object
      const shareData = {
        json: jsonString,
        timestamp: Date.now(),
        version: "1.0",
        ...(includeSettings && {
          settings: {
            // Add current view settings if needed
            compressed: jsonString.length > COMPRESSION_THRESHOLD,
          },
        }),
      };

      const dataString = JSON.stringify(shareData);
      let encodedData: string;

      // Compress if data is large
      if (dataString.length > COMPRESSION_THRESHOLD) {
        encodedData = compressForURL(dataString);
        setIsCompressed(true);
      } else {
        encodedData = encodeURIComponent(dataString);
        setIsCompressed(false);
      }

      // Generate the shareable URL
      const baseURL = window.location.origin + window.location.pathname;
      const shareableURL = `${baseURL}?share=${encodedData}`;
      
      setUrlSize(shareableURL.length);

      if (shareableURL.length > MAX_URL_LENGTH) {
        toast.error("JSON data is too large for URL sharing. Consider using export instead.");
        return;
      }

      setShareURL(shareableURL);
      
      toast.success("Your shareable link has been created successfully!");
    } catch (error) {
      console.error("Error generating share link:", error);
      toast.error("Failed to generate shareable link");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareURL);
      toast.success("Share link copied to clipboard");
      gaEvent("copy_share_link");
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const openInNewTab = () => {
    window.open(shareURL, "_blank");
    gaEvent("open_share_link");
  };

  const handleClose = () => {
    setShareURL("");
    setIsCompressed(false);
    setUrlSize(0);
    onClose();
  };

  return (
    <Modal title="Share JSON Data" size="lg" opened={opened} onClose={handleClose} centered>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Generate a shareable link that includes your JSON data. The data is encoded in the URL
          and stored locally in the browser - no data is sent to external servers.
        </Text>

        <Alert icon={<FiInfo size={16} />} color="blue" variant="light">
          <Text size="xs">
            Links are temporary and work best for small to medium-sized JSON files. For larger 
            files, consider using the export feature instead.
          </Text>
        </Alert>

        <Stack gap="xs">
          <Switch
            label="Include view settings"
            description="Include current display preferences in the shared link"
            checked={includeSettings}
            onChange={(event) => setIncludeSettings(event.currentTarget.checked)}
            size="sm"
          />
        </Stack>

        <Group justify="right">
          <Button
            leftSection={<FiShare2 size={16} />}
            onClick={generateShareableLink}
            loading={isGenerating}
            variant="filled"
          >
            Generate Share Link
          </Button>
        </Group>

        {shareURL && (
          <>
            <Divider />
            <Stack gap="xs">
              <Group justify="space-between" align="center">
                <Text size="sm" fw={500}>
                  Shareable Link
                </Text>
                <Group gap="xs">
                  {isCompressed && (
                    <Badge size="xs" color="blue" variant="light">
                      Compressed
                    </Badge>
                  )}
                  <Badge size="xs" color="gray" variant="light">
                    {urlSize} chars
                  </Badge>
                </Group>
              </Group>

              <TextInput
                value={shareURL}
                readOnly
                rightSection={
                  <Group gap="xs">
                    <Tooltip label="Copy to clipboard">
                      <Button
                        size="xs"
                        variant="subtle"
                        onClick={copyToClipboard}
                        p="xs"
                      >
                        <FiCopy size={14} />
                      </Button>
                    </Tooltip>
                    <Tooltip label="Open in new tab">
                      <Button
                        size="xs"
                        variant="subtle"
                        onClick={openInNewTab}
                        p="xs"
                      >
                        <LuExternalLink size={14} />
                      </Button>
                    </Tooltip>
                  </Group>
                }
                styles={{
                  input: { fontSize: "12px", paddingRight: "80px" }
                }}
              />

              <Alert icon={<FiClock size={16} />} color="orange" variant="light">
                <Text size="xs">
                  <strong>Note:</strong> This link contains your data and will work as long as 
                  the recipient has access to JSON Crack. No expiration time, but the URL 
                  may be quite long for complex data.
                </Text>
              </Alert>
            </Stack>
          </>
        )}
      </Stack>
    </Modal>
  );
};