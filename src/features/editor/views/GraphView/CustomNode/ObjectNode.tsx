import React from "react";
import type { CustomNodeProps } from ".";
import { NODE_DIMENSIONS } from "../../../../../constants/graph";
import type { ValidationError } from "../../../../../store/useValidation";
import type { NodeData } from "../../../../../types/graph";
import type { SchemaSuggestion } from "../../../../../types/schema";
import { SuggestionSeverity } from "../../../../../types/schema";
import { TextRenderer } from "./TextRenderer";
import * as Styled from "./styles";

type RowProps = {
  row: NodeData["text"][number];
  x: number;
  y: number;
  index: number;
  validationErrors?: ValidationError[];
  schemaSuggestions?: SchemaSuggestion[];
};

const Row = ({ row, x, y, index, validationErrors = [], schemaSuggestions = [] }: RowProps) => {
  const rowPosition = index * NODE_DIMENSIONS.ROW_HEIGHT;

  // Check if this specific row has errors
  const rowErrors = validationErrors.filter(
    error => error.path.endsWith(`.${row.key}`) || error.path === `$.${row.key}`
  );
  const hasRowErrors = rowErrors.filter(e => e.severity === "error").length > 0;
  const hasRowWarnings = rowErrors.filter(e => e.severity === "warning").length > 0;

  // Check if this specific row has schema suggestions
  const rowSuggestions = schemaSuggestions.filter(
    suggestion => suggestion.field === row.key || suggestion.field?.endsWith(`.${row.key}`)
  );
  const hasCriticalSuggestions = rowSuggestions.some(
    s => s.severity === SuggestionSeverity.CRITICAL
  );
  const hasHighSuggestions = rowSuggestions.some(s => s.severity === SuggestionSeverity.HIGH);
  const hasMediumSuggestions = rowSuggestions.some(s => s.severity === SuggestionSeverity.MEDIUM);
  const hasAnySuggestions = rowSuggestions.length > 0;

  const getRowTooltip = () => {
    const errorMessages = rowErrors.length > 0 ? rowErrors.map(e => e.message) : [];
    const suggestionMessages =
      rowSuggestions.length > 0
        ? rowSuggestions.map(s => `Schema: ${s.title} - ${s.description}`)
        : [];

    return [...errorMessages, ...suggestionMessages].join("\n") || undefined;
  };

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
      $hasSchemaSuggestion={hasAnySuggestions}
      $suggestionSeverity={
        hasCriticalSuggestions ? "critical" : hasHighSuggestions ? "high" : "medium"
      }
      data-key={row.key}
      data-x={x}
      data-y={y + rowPosition}
      title={getRowTooltip()}
    >
      <Styled.StyledKey $type="object">{row.key}: </Styled.StyledKey>
      <TextRenderer>{getRowText()}</TextRenderer>
      {(hasRowErrors || hasRowWarnings) && (
        <Styled.StyledValidationIcon $severity={hasRowErrors ? "error" : "warning"}>
          {hasRowErrors ? "⚠" : "⚡"}
        </Styled.StyledValidationIcon>
      )}
      {hasAnySuggestions && !hasRowErrors && !hasRowWarnings && (
        <Styled.StyledSchemaIcon
          $severity={
            hasCriticalSuggestions
              ? "critical"
              : hasHighSuggestions
                ? "high"
                : hasMediumSuggestions
                  ? "medium"
                  : "low"
          }
        >
          {hasCriticalSuggestions
            ? "🔴"
            : hasHighSuggestions
              ? "🟠"
              : hasMediumSuggestions
                ? "🔵"
                : "💡"}
        </Styled.StyledSchemaIcon>
      )}
    </Styled.StyledRow>
  );
};

const Node = ({
  node,
  x,
  y,
  validationErrors = [],
  schemaSuggestions = [],
}: CustomNodeProps & {
  validationErrors?: ValidationError[];
  schemaSuggestions?: SchemaSuggestion[];
}) => (
  <Styled.StyledForeignObject
    data-id={`node-${node.id}`}
    width={node.width}
    height={node.height}
    x={0}
    y={0}
    $isObject
  >
    {node.text.map((row, index) => (
      <Row
        key={`${node.id}-${index}`}
        row={row}
        x={x}
        y={y}
        index={index}
        validationErrors={validationErrors}
        schemaSuggestions={schemaSuggestions}
      />
    ))}
  </Styled.StyledForeignObject>
);

function propsAreEqual(
  prev: CustomNodeProps & {
    validationErrors?: ValidationError[];
    schemaSuggestions?: SchemaSuggestion[];
  },
  next: CustomNodeProps & {
    validationErrors?: ValidationError[];
    schemaSuggestions?: SchemaSuggestion[];
  }
) {
  return (
    JSON.stringify(prev.node.text) === JSON.stringify(next.node.text) &&
    prev.node.width === next.node.width &&
    JSON.stringify(prev.validationErrors) === JSON.stringify(next.validationErrors) &&
    JSON.stringify(prev.schemaSuggestions) === JSON.stringify(next.schemaSuggestions)
  );
}

export const ObjectNode = React.memo(Node, propsAreEqual);
