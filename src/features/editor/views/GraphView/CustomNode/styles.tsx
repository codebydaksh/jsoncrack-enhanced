import type { DefaultTheme } from "styled-components";
import styled from "styled-components";
import { LinkItUrl } from "react-linkify-it";
import { NODE_DIMENSIONS } from "../../../../../constants/graph";

type TextColorFn = {
  theme: DefaultTheme;
  $type?: string;
  $value?: string | number | null | boolean;
};

function getTextColor({ $value, $type, theme }: TextColorFn) {
  if ($value === null) return theme.NODE_COLORS.NULL;
  if ($type === "object") return theme.NODE_COLORS.NODE_KEY;
  if ($type === "number") return theme.NODE_COLORS.INTEGER;
  if ($value === true) return theme.NODE_COLORS.BOOL.TRUE;
  if ($value === false) return theme.NODE_COLORS.BOOL.FALSE;
  return theme.NODE_COLORS.NODE_VALUE;
}

export const StyledLinkItUrl = styled(LinkItUrl)`
  text-decoration: underline;
  pointer-events: all;
`;

export const StyledForeignObject = styled.foreignObject<{ $isObject?: boolean }>`
  text-align: ${({ $isObject }) => !$isObject && "center"};
  color: ${({ theme }) => theme.NODE_COLORS.TEXT};
  font-family: monospace;
  font-size: 12px;
  font-weight: 500;
  overflow: hidden;
  pointer-events: none;

  &.searched {
    background: rgba(27, 255, 0, 0.1);
    border: 1px solid ${({ theme }) => theme.TEXT_POSITIVE};
    border-radius: 2px;
    box-sizing: border-box;
  }

  .highlight {
    background: rgba(255, 214, 0, 0.15);
  }

  .renderVisible {
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 12px;
    width: 100%;
    height: 100%;
    overflow: hidden;
    cursor: pointer;
  }
`;

export const StyledKey = styled.span<{
  $type: TextColorFn["$type"];
  $value?: TextColorFn["$value"];
  $hasError?: boolean;
  $hasWarning?: boolean;
}>`
  display: inline;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-width: 0;
  height: auto;
  line-height: inherit;
  padding: 0; // Remove padding
  color: ${({ theme, $type, $value = "", $hasError, $hasWarning }) => {
    if ($hasError) return "#ff6b6b";
    if ($hasWarning) return "#ffd43b";
    return getTextColor({ $value, $type, theme });
  }};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  ${({ $hasError, $hasWarning }) => {
    if ($hasError) return "font-weight: 600; text-decoration: underline wavy #ff6b6b;";
    if ($hasWarning) return "font-weight: 600; text-decoration: underline wavy #ffd43b;";
    return "";
  }}
`;

export const StyledRow = styled.span<{ 
  $value: TextColorFn["$value"];
  $hasError?: boolean;
  $hasWarning?: boolean;
}>`
  padding: 3px 10px;
  height: ${NODE_DIMENSIONS.ROW_HEIGHT}px;
  line-height: 18px;
  color: ${({ theme, $value }) => getTextColor({ $value, theme, $type: typeof $value })};
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-bottom: 1px solid ${({ theme }) => theme.NODE_COLORS.DIVIDER};
  box-sizing: border-box;
  position: relative;
  ${({ $hasError, $hasWarning }) => {
    if ($hasError) return "background-color: rgba(255, 107, 107, 0.1); border-left: 3px solid #ff6b6b;";
    if ($hasWarning) return "background-color: rgba(255, 212, 59, 0.1); border-left: 3px solid #ffd43b;";
    return "";
  }}

  &:last-of-type {
    border-bottom: none;
  }

  .searched & {
    border-bottom: 1px solid ${({ theme }) => theme.TEXT_POSITIVE};
  }
`;

export const StyledValidationIcon = styled.span<{ $severity: "error" | "warning" }>`
  position: absolute;
  right: 5px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: ${({ $severity }) => $severity === "error" ? "#ff6b6b" : "#ffd43b"};
  z-index: 1;
  pointer-events: none;
`;

export const StyledChildrenCount = styled.span`
  color: ${({ theme }) => theme.NODE_COLORS.CHILD_COUNT};
  padding: 10px;
  margin-left: -15px;
`;
