import React, { useState, useMemo } from "react";
import type { ModalProps } from "@mantine/core";
import {
  Modal,
  Stack,
  Text,
  Button,
  Group,
  TextInput,
  Select,
  Divider,
  Tabs,
  Badge,
  Tooltip,
} from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import { event as gaEvent } from "nextjs-google-analytics";
import toast from "react-hot-toast";
import { FiCopy } from "react-icons/fi";
import { SiCurl, SiJavascript, SiPython, SiPostman } from "react-icons/si";
import useJson from "../../../store/useJson";

interface APITemplate {
  id: string;
  name: string;
  icon: React.ReactNode;
  language: string;
  generator: (options: any) => string;
}

const generateCurl = (options: any): string => {
  const { method, url, contentType, jsonData } = options;

  let curl = `curl -X ${method} "${url}" \\
  -H "Content-Type: ${contentType}"`;

  if (method !== "GET" && jsonData) {
    curl += ` \\
  -d '${jsonData}'`;
  }

  return curl;
};

const generateJavaScript = (options: any): string => {
  const { method, url, contentType, jsonData } = options;

  let js = `const response = await fetch("${url}", {
  method: "${method}",
  headers: {
    "Content-Type": "${contentType}",
  },`;

  if (method !== "GET" && jsonData) {
    js += `
  body: JSON.stringify(${jsonData})`;
  }

  js += `
});

const data = await response.json();
console.log(data);`;

  return js;
};

const generatePython = (options: any): string => {
  const { method, url, contentType, jsonData } = options;

  let python = `import requests

url = "${url}"
headers = {
    "Content-Type": "${contentType}"
}`;

  if (method !== "GET" && jsonData) {
    python += `
data = ${jsonData}
response = requests.${method.toLowerCase()}(url, json=data, headers=headers)`;
  } else {
    python += `
response = requests.${method.toLowerCase()}(url, headers=headers)`;
  }

  python += `
print(response.json())`;

  return python;
};

const generatePostman = (options: any): string => {
  const { method, url, contentType, jsonData } = options;

  const postmanCollection = {
    info: {
      name: "Generated API Request",
      description: "Generated from JSON Crack",
    },
    item: [
      {
        name: "API Request",
        request: {
          method: method,
          header: [
            {
              key: "Content-Type",
              value: contentType,
            },
          ],
          body:
            method !== "GET" && jsonData
              ? {
                  mode: "raw",
                  raw: jsonData,
                }
              : undefined,
          url: {
            raw: url,
          },
        },
      },
    ],
  };

  return JSON.stringify(postmanCollection, null, 2);
};

const API_TEMPLATES: APITemplate[] = [
  {
    id: "curl",
    name: "cURL",
    icon: <SiCurl size={16} />,
    language: "bash",
    generator: generateCurl,
  },
  {
    id: "javascript",
    name: "JavaScript",
    icon: <SiJavascript size={16} />,
    language: "javascript",
    generator: generateJavaScript,
  },
  {
    id: "python",
    name: "Python",
    icon: <SiPython size={16} />,
    language: "python",
    generator: generatePython,
  },
  {
    id: "postman",
    name: "Postman Collection",
    icon: <SiPostman size={16} />,
    language: "json",
    generator: generatePostman,
  },
];

export const APIGeneratorModal = ({ opened, onClose }: ModalProps) => {
  const getJson = useJson(state => state.getJson);
  const [selectedTemplate, setSelectedTemplate] = useState("curl");
  const [method, setMethod] = useState("POST");
  const [url, setUrl] = useState("https://api.example.com/data");
  const [contentType, setContentType] = useState("application/json");

  const jsonData = useMemo(() => {
    try {
      const json = getJson();
      if (!json.trim()) return "";

      // Pretty format the JSON
      return JSON.stringify(JSON.parse(json), null, 2);
    } catch {
      return getJson();
    }
  }, [getJson]);

  const currentTemplate = API_TEMPLATES.find(t => t.id === selectedTemplate)!;

  const generatedCode = useMemo(() => {
    if (!jsonData.trim() && method !== "GET") {
      return "// Please load some JSON data first";
    }

    return currentTemplate.generator({
      method,
      url,
      contentType,
      jsonData,
    });
  }, [currentTemplate, method, url, contentType, jsonData]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      toast.success("Code copied to clipboard!");
      gaEvent("copy_api_code", { template: selectedTemplate });
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <Modal title="API Request Generator" size="xl" opened={opened} onClose={onClose} centered>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Generate API request examples in various formats using your JSON data as the request body.
        </Text>

        <Divider />

        {/* Configuration Section */}
        <Stack gap="sm">
          <Group grow>
            <Select
              label="HTTP Method"
              value={method}
              onChange={value => setMethod(value || "POST")}
              data={[
                { label: "GET", value: "GET" },
                { label: "POST", value: "POST" },
                { label: "PUT", value: "PUT" },
                { label: "PATCH", value: "PATCH" },
                { label: "DELETE", value: "DELETE" },
              ]}
            />
            <Select
              label="Content Type"
              value={contentType}
              onChange={value => setContentType(value || "application/json")}
              data={[
                { label: "application/json", value: "application/json" },
                { label: "application/xml", value: "application/xml" },
                { label: "text/plain", value: "text/plain" },
              ]}
            />
          </Group>

          <TextInput
            label="API Endpoint URL"
            value={url}
            onChange={e => setUrl(e.currentTarget.value)}
            placeholder="https://api.example.com/endpoint"
          />
        </Stack>

        <Divider />

        {/* Template Selection */}
        <Tabs value={selectedTemplate} onChange={value => setSelectedTemplate(value || "curl")}>
          <Tabs.List grow>
            {API_TEMPLATES.map(template => (
              <Tabs.Tab key={template.id} value={template.id} leftSection={template.icon}>
                {template.name}
              </Tabs.Tab>
            ))}
          </Tabs.List>

          {API_TEMPLATES.map(template => (
            <Tabs.Panel key={template.id} value={template.id} pt="md">
              <Stack gap="sm">
                <Group justify="space-between" align="center">
                  <Group gap="xs">
                    <Text size="sm" fw={500}>
                      {template.name} Example
                    </Text>
                    <Badge size="xs" variant="light">
                      {template.language}
                    </Badge>
                  </Group>

                  <Tooltip label="Copy to clipboard">
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<FiCopy size={14} />}
                      onClick={copyToClipboard}
                    >
                      Copy
                    </Button>
                  </Tooltip>
                </Group>

                <CodeHighlight
                  code={generatedCode}
                  language={template.language}
                  withCopyButton={false}
                  style={{ maxHeight: "400px", overflow: "auto" }}
                />
              </Stack>
            </Tabs.Panel>
          ))}
        </Tabs>
      </Stack>
    </Modal>
  );
};
