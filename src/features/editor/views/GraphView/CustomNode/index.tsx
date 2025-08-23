import React from "react";
import { useComputedColorScheme } from "@mantine/core";
import type { NodeProps } from "reaflow";
import { Node } from "reaflow";
import { useModal } from "../../../../../store/useModal";
import type { NodeData } from "../../../../../types/graph";
import useGraph from "../stores/useGraph";
import useValidation from "../../../../../store/useValidation";
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

const CustomNodeWrapper = (nodeProps: NodeProps<NodeData>) => {
  const setSelectedNode = useGraph(state => state.setSelectedNode);
  const setVisible = useModal(state => state.setVisible);
  const colorScheme = useComputedColorScheme();
  const { isValidationEnabled, getErrorsForPath } = useValidation();
  
  // Get validation errors for this node
  const validationPath = jsonPathToValidationPath((nodeProps.properties as NodeData)?.path);
  const nodeErrors = isValidationEnabled ? getErrorsForPath(validationPath) : [];
  const hasErrors = nodeErrors.filter(e => e.severity === "error").length > 0;
  const hasWarnings = nodeErrors.filter(e => e.severity === "warning").length > 0;

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
        const errorStroke = hasErrors ? "#ff6b6b" : hasWarnings ? "#ffd43b" : defaultStroke;
        ev.currentTarget.style.stroke = errorStroke;
      }}
      style={{
        fill: colorScheme === "dark" ? "#292929" : "#ffffff",
        stroke: hasErrors ? "#ff6b6b" : hasWarnings ? "#ffd43b" : (colorScheme === "dark" ? "#424242" : "#BCBEC0"),
        strokeWidth: hasErrors || hasWarnings ? 2 : 1,
        filter: hasErrors ? "drop-shadow(0 0 4px rgba(255, 107, 107, 0.3))" : hasWarnings ? "drop-shadow(0 0 4px rgba(255, 212, 59, 0.3))" : "none",
      }}
    >
      {({ node, x, y }) => {
        const hasKey = nodeProps.properties.text[0].key;
        if (!hasKey) return <TextNode node={nodeProps.properties as NodeData} x={x} y={y} validationErrors={nodeErrors} />;

        return <ObjectNode node={node as NodeData} x={x} y={y} validationErrors={nodeErrors} />;
      }}
    </Node>
  );
};

export const CustomNode = React.memo(CustomNodeWrapper);
