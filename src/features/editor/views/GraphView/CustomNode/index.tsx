import React from "react";
import { useComputedColorScheme } from "@mantine/core";
import type { NodeProps } from "reaflow";
import { Node } from "reaflow";
import { useModal } from "../../../../../store/useModal";
import useSchemaIntelligence from "../../../../../store/useSchemaIntelligence";
import useValidation from "../../../../../store/useValidation";
import type { NodeData } from "../../../../../types/graph";
import type { SchemaSuggestion } from "../../../../../types/schema";
import { SuggestionSeverity } from "../../../../../types/schema";
import useGraph from "../stores/useGraph";
import { ObjectNode } from "./ObjectNode";
import { TextNode } from "./TextNode";

export interface CustomNodeProps {
  node: NodeData;
  x: number;
  y: number;
  hasCollapse?: boolean;
}

// Helper function to convert JSONPath to validation path format
const jsonPathToValidationPath = (path?: NodeData["path"]): string => {
  if (!path || path.length === 0) return "$";

  let result = "$";
  for (const segment of path) {
    if (typeof segment === "number") {
      result += `[${segment}]`;
    } else {
      result += `.${segment}`;
    }
  }
  return result;
};

// Helper function to find schema suggestions for a node path
const findSuggestionsForPath = (
  suggestions: SchemaSuggestion[],
  nodePath: string
): SchemaSuggestion[] => {
  return suggestions.filter(suggestion => {
    if (!suggestion.field) return false;

    // Handle exact path matches
    if (suggestion.field === nodePath) return true;

    // Handle parent object matches (e.g., suggestion for "user" should apply to "$.user")
    if (nodePath.endsWith(`.${suggestion.field}`)) return true;
    if (nodePath === `$.${suggestion.field}`) return true;

    // Handle array item matches
    const pathRegex = new RegExp(`\\[\\d+\\]\\.${suggestion.field.replace(/\./g, "\\.")}$`);
    if (pathRegex.test(nodePath)) return true;

    return false;
  });
};

// Helper function to get the highest severity from suggestions
const getHighestSeverity = (suggestions: SchemaSuggestion[]): SuggestionSeverity | null => {
  if (suggestions.length === 0) return null;

  const severityOrder = {
    [SuggestionSeverity.CRITICAL]: 5,
    [SuggestionSeverity.HIGH]: 4,
    [SuggestionSeverity.MEDIUM]: 3,
    [SuggestionSeverity.LOW]: 2,
    [SuggestionSeverity.INFO]: 1,
  };

  return suggestions.reduce(
    (highest, suggestion) => {
      if (!highest) return suggestion.severity;
      return severityOrder[suggestion.severity] > severityOrder[highest]
        ? suggestion.severity
        : highest;
    },
    null as SuggestionSeverity | null
  );
};

const CustomNodeWrapper = (nodeProps: NodeProps<NodeData>) => {
  const setSelectedNode = useGraph(state => state.setSelectedNode);
  const setVisible = useModal(state => state.setVisible);
  const colorScheme = useComputedColorScheme();
  const { isValidationEnabled, getErrorsForPath } = useValidation();
  const { currentAnalysis, showInsights } = useSchemaIntelligence();

  // Get validation errors for this node
  const validationPath = jsonPathToValidationPath((nodeProps.properties as NodeData)?.path);
  const nodeErrors = isValidationEnabled ? getErrorsForPath(validationPath) : [];
  const hasErrors = nodeErrors.filter(e => e.severity === "error").length > 0;
  const hasWarnings = nodeErrors.filter(e => e.severity === "warning").length > 0;

  // Get schema suggestions for this node
  const nodeSuggestions =
    currentAnalysis && showInsights
      ? findSuggestionsForPath(currentAnalysis.suggestions, validationPath)
      : [];
  const suggestionSeverity = getHighestSeverity(nodeSuggestions);
  const hasCriticalSuggestions = suggestionSeverity === SuggestionSeverity.CRITICAL;
  const hasHighSuggestions = suggestionSeverity === SuggestionSeverity.HIGH;
  const hasMediumSuggestions = suggestionSeverity === SuggestionSeverity.MEDIUM;
  const hasAnySuggestions = nodeSuggestions.length > 0;

  const handleNodeClick = React.useCallback(
    (_: React.MouseEvent<SVGGElement, MouseEvent>, data: NodeData) => {
      if (setSelectedNode) setSelectedNode(data);
      setVisible("NodeModal", true);
    },
    [setSelectedNode, setVisible]
  );

  return (
    <Node
      {...nodeProps}
      onClick={handleNodeClick as any}
      animated={false}
      label={null as any}
      onEnter={ev => {
        ev.currentTarget.style.stroke = "#3B82F6";
      }}
      onLeave={ev => {
        const defaultStroke = colorScheme === "dark" ? "#424242" : "#BCBEC0";
        // Priority: Validation errors > Schema critical suggestions > Validation warnings > Schema suggestions > Default
        let stroke = defaultStroke;
        if (hasErrors) stroke = "#ff6b6b";
        else if (hasCriticalSuggestions) stroke = "#e74c3c";
        else if (hasWarnings) stroke = "#ffd43b";
        else if (hasHighSuggestions) stroke = "#f39c12";
        else if (hasMediumSuggestions) stroke = "#3498db";
        else if (hasAnySuggestions) stroke = "#9b59b6";

        ev.currentTarget.style.stroke = stroke;
      }}
      style={{
        fill: colorScheme === "dark" ? "#292929" : "#ffffff",
        // Priority: Validation errors > Schema critical suggestions > Validation warnings > Schema suggestions > Default
        stroke: hasErrors
          ? "#ff6b6b"
          : hasCriticalSuggestions
            ? "#e74c3c"
            : hasWarnings
              ? "#ffd43b"
              : hasHighSuggestions
                ? "#f39c12"
                : hasMediumSuggestions
                  ? "#3498db"
                  : hasAnySuggestions
                    ? "#9b59b6"
                    : colorScheme === "dark"
                      ? "#424242"
                      : "#BCBEC0",
        strokeWidth:
          hasErrors || hasWarnings || hasCriticalSuggestions || hasHighSuggestions
            ? 2
            : hasAnySuggestions
              ? 1.5
              : 1,
        filter: hasErrors
          ? "drop-shadow(0 0 4px rgba(255, 107, 107, 0.3))"
          : hasCriticalSuggestions
            ? "drop-shadow(0 0 4px rgba(231, 76, 60, 0.3))"
            : hasWarnings
              ? "drop-shadow(0 0 4px rgba(255, 212, 59, 0.3))"
              : hasHighSuggestions
                ? "drop-shadow(0 0 4px rgba(243, 156, 18, 0.3))"
                : hasMediumSuggestions
                  ? "drop-shadow(0 0 4px rgba(52, 152, 219, 0.3))"
                  : hasAnySuggestions
                    ? "drop-shadow(0 0 2px rgba(155, 89, 182, 0.2))"
                    : "none",
      }}
    >
      {({ node, x, y }) => {
        const hasKey = nodeProps.properties.text[0].key;
        if (!hasKey)
          return (
            <TextNode
              node={nodeProps.properties as NodeData}
              x={x}
              y={y}
              validationErrors={nodeErrors}
              schemaSuggestions={nodeSuggestions}
            />
          );

        return (
          <ObjectNode
            node={node as NodeData}
            x={x}
            y={y}
            validationErrors={nodeErrors}
            schemaSuggestions={nodeSuggestions}
          />
        );
      }}
    </Node>
  );
};

export const CustomNode = React.memo(CustomNodeWrapper);
