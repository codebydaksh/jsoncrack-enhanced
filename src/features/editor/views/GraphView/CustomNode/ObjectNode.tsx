import React from "react";
import type { CustomNodeProps } from ".";
import { NODE_DIMENSIONS } from "../../../../../constants/graph";
import type { NodeData } from "../../../../../types/graph";
import type { ValidationError } from "../../../../../store/useValidation";
import { TextRenderer } from "./TextRenderer";
import * as Styled from "./styles";

type RowProps = {
  row: NodeData["text"][number];
  x: number;
  y: number;
  index: number;
  validationErrors?: ValidationError[];
};

const Row = ({ row, x, y, index, validationErrors = [] }: RowProps) => {
  const rowPosition = index * NODE_DIMENSIONS.ROW_HEIGHT;
  
  // Check if this specific row has errors
  const rowErrors = validationErrors.filter(error => 
    error.path.endsWith(`.${row.key}`) || error.path === `$.${row.key}`
  );
  const hasRowErrors = rowErrors.filter(e => e.severity === "error").length > 0;
  const hasRowWarnings = rowErrors.filter(e => e.severity === "warning").length > 0;

  const getRowText = () => {
    if (row.type === "object") return `{${row.childrenCount ?? 0} keys}`;
    if (row.type === "array") return `[${row.childrenCount ?? 0} items]`;
    return row.value;
  };

  return (
    <Styled.StyledRow 
      $value={row.value} 
      $hasError={hasRowErrors}
      $hasWarning={hasRowWarnings}
      data-key={row.key} 
      data-x={x} 
      data-y={y + rowPosition}
      title={rowErrors.length > 0 ? rowErrors.map(e => e.message).join(', ') : undefined}
    >
      <Styled.StyledKey $type="object">{row.key}: </Styled.StyledKey>
      <TextRenderer>{getRowText()}</TextRenderer>
      {(hasRowErrors || hasRowWarnings) && (
        <Styled.StyledValidationIcon $severity={hasRowErrors ? "error" : "warning"}>
          {hasRowErrors ? "⚠" : "⚡"}
        </Styled.StyledValidationIcon>
      )}
    </Styled.StyledRow>
  );
};

const Node = ({ node, x, y, validationErrors = [] }: CustomNodeProps & { validationErrors?: ValidationError[] }) => (
  <Styled.StyledForeignObject
    data-id={`node-${node.id}`}
    width={node.width}
    height={node.height}
    x={0}
    y={0}
    $isObject
  >
    {node.text.map((row, index) => (
      <Row key={`${node.id}-${index}`} row={row} x={x} y={y} index={index} validationErrors={validationErrors} />
    ))}
  </Styled.StyledForeignObject>
);

function propsAreEqual(prev: CustomNodeProps & { validationErrors?: ValidationError[] }, next: CustomNodeProps & { validationErrors?: ValidationError[] }) {
  return (
    JSON.stringify(prev.node.text) === JSON.stringify(next.node.text) &&
    prev.node.width === next.node.width &&
    JSON.stringify(prev.validationErrors) === JSON.stringify(next.validationErrors)
  );
}

export const ObjectNode = React.memo(Node, propsAreEqual);
