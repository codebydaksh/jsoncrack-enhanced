import React from "react";
import styled from "styled-components";
import type { CustomNodeProps } from ".";
import useConfig from "../../../../../store/useConfig";
import type { ValidationError } from "../../../../../store/useValidation";
import type { SchemaSuggestion } from "../../../../../types/schema";
import { SuggestionSeverity } from "../../../../../types/schema";
import { isContentImage } from "../lib/utils/calculateNodeSize";
import { TextRenderer } from "./TextRenderer";
import * as Styled from "./styles";

const StyledTextNodeWrapper = styled.span<{ $isParent: boolean }>`
  display: flex;
  justify-content: ${({ $isParent }) => ($isParent ? "center" : "flex-start")};
  align-items: center;
  height: 100%;
  width: 100%;
  overflow: hidden;
  padding: 0 10px;
`;

const StyledImageWrapper = styled.div`
  padding: 5px;
`;

const StyledImage = styled.img`
  border-radius: 2px;
  object-fit: contain;
  background: ${({ theme }) => theme.BACKGROUND_MODIFIER_ACCENT};
`;

const Node = ({
  node,
  x,
  y,
  validationErrors = [],
  schemaSuggestions = [],
}: CustomNodeProps & {
  validationErrors?: ValidationError[];
  schemaSuggestions?: SchemaSuggestion[];
}) => {
  const { text, width, height } = node;
  const imagePreviewEnabled = useConfig(state => state.imagePreviewEnabled);
  const isImage = imagePreviewEnabled && isContentImage(JSON.stringify(text[0].value));
  const value = text[0].value;

  // Check for validation errors on this node
  const hasErrors = validationErrors.filter(e => e.severity === "error").length > 0;
  const hasWarnings = validationErrors.filter(e => e.severity === "warning").length > 0;

  // Check for schema suggestions on this node
  const hasCriticalSuggestions = schemaSuggestions.some(
    s => s.severity === SuggestionSeverity.CRITICAL
  );
  const hasHighSuggestions = schemaSuggestions.some(s => s.severity === SuggestionSeverity.HIGH);
  const hasMediumSuggestions = schemaSuggestions.some(
    s => s.severity === SuggestionSeverity.MEDIUM
  );
  const hasAnySuggestions = schemaSuggestions.length > 0;

  const getNodeTooltip = () => {
    const errorMessages = validationErrors.length > 0 ? validationErrors.map(e => e.message) : [];
    const suggestionMessages =
      schemaSuggestions.length > 0
        ? schemaSuggestions.map(s => `Schema: ${s.title} - ${s.description}`)
        : [];

    return [...errorMessages, ...suggestionMessages].join("\n") || undefined;
  };

  return (
    <Styled.StyledForeignObject
      data-id={`node-${node.id}`}
      width={width}
      height={height}
      x={0}
      y={0}
    >
      {isImage ? (
        <StyledImageWrapper>
          <StyledImage src={JSON.stringify(text[0].value)} width="70" height="70" loading="lazy" />
          {(hasErrors || hasWarnings) && (
            <Styled.StyledValidationIcon
              $severity={hasErrors ? "error" : "warning"}
              style={{ position: "absolute", top: 5, right: 5 }}
            >
              {hasErrors ? "⚠" : "⚡"}
            </Styled.StyledValidationIcon>
          )}
          {hasAnySuggestions && !hasErrors && !hasWarnings && (
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
              style={{ position: "absolute", top: 5, left: 5 }}
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
        </StyledImageWrapper>
      ) : (
        <StyledTextNodeWrapper
          data-x={x}
          data-y={y}
          data-key={JSON.stringify(text)}
          $isParent={false}
          title={getNodeTooltip()}
        >
          <Styled.StyledKey
            $value={value}
            $type={typeof text[0].value}
            $hasError={hasErrors}
            $hasWarning={hasWarnings}
            $hasSchemaSuggestion={hasAnySuggestions}
            $suggestionSeverity={
              hasCriticalSuggestions ? "critical" : hasHighSuggestions ? "high" : "medium"
            }
          >
            <TextRenderer>{value}</TextRenderer>
          </Styled.StyledKey>
          {(hasErrors || hasWarnings) && (
            <Styled.StyledValidationIcon $severity={hasErrors ? "error" : "warning"}>
              {hasErrors ? "⚠" : "⚡"}
            </Styled.StyledValidationIcon>
          )}
          {hasAnySuggestions && !hasErrors && !hasWarnings && (
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
        </StyledTextNodeWrapper>
      )}
    </Styled.StyledForeignObject>
  );
};

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
    prev.node.text === next.node.text &&
    prev.node.width === next.node.width &&
    JSON.stringify(prev.validationErrors) === JSON.stringify(next.validationErrors) &&
    JSON.stringify(prev.schemaSuggestions) === JSON.stringify(next.schemaSuggestions)
  );
}

export const TextNode = React.memo(Node, propsAreEqual);
