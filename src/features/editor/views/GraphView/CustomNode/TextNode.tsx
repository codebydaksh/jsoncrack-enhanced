import React from "react";
import styled from "styled-components";
import type { CustomNodeProps } from ".";
import useConfig from "../../../../../store/useConfig";
import type { ValidationError } from "../../../../../store/useValidation";
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
}: CustomNodeProps & { validationErrors?: ValidationError[] }) => {
  const { text, width, height } = node;
  const imagePreviewEnabled = useConfig(state => state.imagePreviewEnabled);
  const isImage = imagePreviewEnabled && isContentImage(JSON.stringify(text[0].value));
  const value = text[0].value;

  // Check for validation errors on this node
  const hasErrors = validationErrors.filter(e => e.severity === "error").length > 0;
  const hasWarnings = validationErrors.filter(e => e.severity === "warning").length > 0;

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
        </StyledImageWrapper>
      ) : (
        <StyledTextNodeWrapper
          data-x={x}
          data-y={y}
          data-key={JSON.stringify(text)}
          $isParent={false}
        >
          <Styled.StyledKey
            $value={value}
            $type={typeof text[0].value}
            $hasError={hasErrors}
            $hasWarning={hasWarnings}
          >
            <TextRenderer>{value}</TextRenderer>
          </Styled.StyledKey>
          {(hasErrors || hasWarnings) && (
            <Styled.StyledValidationIcon $severity={hasErrors ? "error" : "warning"}>
              {hasErrors ? "⚠" : "⚡"}
            </Styled.StyledValidationIcon>
          )}
        </StyledTextNodeWrapper>
      )}
    </Styled.StyledForeignObject>
  );
};

function propsAreEqual(
  prev: CustomNodeProps & { validationErrors?: ValidationError[] },
  next: CustomNodeProps & { validationErrors?: ValidationError[] }
) {
  return (
    prev.node.text === next.node.text &&
    prev.node.width === next.node.width &&
    JSON.stringify(prev.validationErrors) === JSON.stringify(next.validationErrors)
  );
}

export const TextNode = React.memo(Node, propsAreEqual);
