import styled from "styled-components";

export const StyledToolElement = styled.button<{ $hide?: boolean; $highlight?: boolean }>`
  display: ${({ $hide }) => ($hide ? "none" : "flex")};
  align-items: center;
  gap: 0.25rem;
  place-content: center;
  font-size: clamp(0.75rem, 1.5vw, 0.875rem);
  background: ${({ $highlight }) =>
    $highlight ? "linear-gradient(rgba(0, 0, 0, 0.1) 0 0)" : "none"};
  color: ${({ theme }) => theme.INTERACTIVE_NORMAL};
  padding: clamp(0.375rem, 1vw, 0.5rem) clamp(0.5rem, 1.5vw, 0.75rem);
  border-radius: 0.1875rem;
  white-space: nowrap;
  min-height: 2.75rem;
  transition: all 0.2s ease;

  /* Better scaling for high zoom */
  @media screen and (min-resolution: 144dpi) {
    font-size: 0.6875rem;
    padding: 0.3125rem 0.4375rem;
  }

  /* Mobile responsive */
  @media screen and (max-width: 768px) {
    font-size: 0.8125rem;
    padding: 0.5rem 0.625rem;
    gap: 0.1875rem;
  }

  &:hover {
    background-image: linear-gradient(rgba(0, 0, 0, 0.1) 0 0);
    transform: scale(1.02);
  }

  &:hover {
    color: ${({ theme }) => theme.INTERACTIVE_HOVER};
    opacity: 1;
    box-shadow: none;
  }

  /* Focus styles for accessibility */
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.INTERACTIVE_ACTIVE};
    outline-offset: 2px;
  }
`;
