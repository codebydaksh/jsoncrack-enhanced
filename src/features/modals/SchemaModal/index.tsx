import React from "react";
import type { ModalProps } from "@mantine/core";
import {
  Stack,
  Modal,
  Button,
  Text,
  Anchor,
  Menu,
  Group,
  Paper,
  Badge,
  Alert,
} from "@mantine/core";
import Editor from "@monaco-editor/react";
import { event as gaEvent } from "nextjs-google-analytics";
import { toast } from "react-hot-toast";
import { FaChevronDown } from "react-icons/fa";
import { FiCheckCircle, FiXCircle } from "react-icons/fi";
import { VscLinkExternal } from "react-icons/vsc";
import { FileFormat } from "../../../enums/file.enum";
import useConfig from "../../../store/useConfig";
import useFile from "../../../store/useFile";
import useJson from "../../../store/useJson";
import { useModal } from "../../../store/useModal";
import useValidation from "../../../store/useValidation";

export const SchemaModal = ({ opened, onClose }: ModalProps) => {
  const setContents = useFile(state => state.setContents);
  const setJsonSchema = useFile(state => state.setJsonSchema);
  const getJson = useJson(state => state.getJson);
  const setVisible = useModal(state => state.setVisible);

  // Validation store
  const {
    isValidationEnabled,
    validationResults,
    errors,
    setValidationEnabled,
    setSchema: setValidationSchema,
    validateData,
    clearValidation,
  } = useValidation();

  const darkmodeEnabled = useConfig(state => (state.darkmodeEnabled ? "vs-dark" : "light"));
  const [schema, setSchema] = React.useState(
    JSON.stringify(
      {
        $schema: "http://json-schema.org/draft-04/schema#",
        title: "Product",
        description: "A product from catalog",
        type: "object",
        properties: {
          id: {
            description: "The unique identifier for a product",
            type: "integer",
          },
        },
        required: ["id"],
      },
      null,
      2
    )
  );

  const onApply = async () => {
    try {
      const parsedSchema = JSON.parse(schema);
      setJsonSchema(parsedSchema);
      setValidationSchema(parsedSchema);

      // Enable validation and validate current data
      setValidationEnabled(true);
      const currentJson = getJson();
      if (currentJson) {
        await validateData(currentJson);
      }

      gaEvent("apply_json_schema");
      toast.success("Applied schema with validation!");
      onClose();
    } catch (error) {
      toast.error("Invalid Schema");
    }
  };

  const onClear = () => {
    setJsonSchema(null);
    clearValidation();
    setSchema("");
    toast("Disabled JSON Schema");
    onClose();
  };

  const generateMockData = async () => {
    try {
      const { JSONSchemaFaker } = await import("json-schema-faker");
      const data = JSONSchemaFaker.generate(JSON.parse(schema));
      setContents({ contents: JSON.stringify(data, null, 2), format: FileFormat.JSON });

      gaEvent("generate_schema_mock_data");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Invalid Schema");
    }
  };

  return (
    <Modal title="JSON Schema" size="lg" opened={opened} onClose={onClose} centered>
      <Stack>
        <Text fz="sm">
          Define a JSON Schema to validate your data structure and get visual feedback.
        </Text>

        {/* Validation Status */}
        {isValidationEnabled && (
          <Alert
            icon={validationResults.isValid ? <FiCheckCircle size={16} /> : <FiXCircle size={16} />}
            color={validationResults.isValid ? "green" : "red"}
            variant="light"
          >
            <Group justify="space-between">
              <Text size="sm">
                {validationResults.isValid
                  ? "✅ Data is valid"
                  : `❌ Found ${validationResults.errorCount} errors`}
                {validationResults.warningCount > 0 &&
                  `, ${validationResults.warningCount} warnings`}
              </Text>
              <Group gap="xs">
                {validationResults.errorCount > 0 && (
                  <Badge color="red" size="sm">
                    {validationResults.errorCount} errors
                  </Badge>
                )}
                {validationResults.warningCount > 0 && (
                  <Badge color="yellow" size="sm">
                    {validationResults.warningCount} warnings
                  </Badge>
                )}
              </Group>
            </Group>
          </Alert>
        )}

        <Anchor
          fz="sm"
          target="_blank"
          href="https://niem.github.io/json/sample-schema/"
          rel="noopener noreferrer"
        >
          View Examples <VscLinkExternal />
        </Anchor>
        <Paper withBorder radius="sm" style={{ overflow: "hidden" }}>
          <Editor
            value={schema ?? ""}
            theme={darkmodeEnabled}
            onChange={e => setSchema(e!)}
            height={300}
            language="json"
            options={{
              formatOnPaste: true,
              tabSize: 2,
              formatOnType: true,
              scrollBeyondLastLine: false,
              stickyScroll: { enabled: false },
              minimap: { enabled: false },
            }}
          />
        </Paper>
        <Group p="0" justify="right">
          <Button variant="subtle" color="gray" onClick={onClear} disabled={!schema}>
            Clear
          </Button>
          <Button.Group>
            <Button variant="default" onClick={onApply} disabled={!schema}>
              Apply
            </Button>
            <Menu>
              <Menu.Target>
                <Button variant="default" color="blue" px="xs" disabled={!schema}>
                  <FaChevronDown />
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item onClick={generateMockData}>Generate Mock Data</Menu.Item>
                <Menu.Item
                  leftSection={
                    isValidationEnabled ? <FiCheckCircle size={14} /> : <FiXCircle size={14} />
                  }
                  onClick={async () => {
                    if (isValidationEnabled) {
                      setValidationEnabled(false);
                      toast.success("Visual validation disabled");
                    } else {
                      try {
                        const parsedSchema = JSON.parse(schema);
                        setValidationSchema(parsedSchema);
                        setValidationEnabled(true);
                        const currentJson = getJson();
                        if (currentJson) {
                          await validateData(currentJson);
                        }
                        toast.success("Visual validation enabled!");
                      } catch {
                        toast.error("Please apply a valid schema first");
                      }
                    }
                  }}
                >
                  {isValidationEnabled ? "Disable" : "Enable"} Visual Validation
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Button.Group>
        </Group>
      </Stack>
    </Modal>
  );
};
