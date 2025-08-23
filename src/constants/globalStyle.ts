import { createGlobalStyle } from "styled-components";

const GlobalStyle = createGlobalStyle`
  html {
    font-size: 16px;
    scroll-behavior: smooth;
    
    /* Responsive font scaling - improved */
    @media screen and (max-width: 768px) {
      font-size: 14px;
    }
    
    @media screen and (min-width: 1440px) {
      font-size: 18px;
    }
    
    /* Better zoom handling - use zoom media queries instead of DPI */
    @media screen and (min-width: 1px) {
      /* This ensures consistent scaling across zoom levels */
      font-size: clamp(12px, 1rem, 20px);
    }
  }

  html, body {
    background: #ffffff;
    overscroll-behavior: none;
    /* Fixed font-smoothing conflict */
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    line-height: 1.5;
    min-height: 100vh;
    /* Prevent layout shifts on zoom */
    overflow-x: hidden;
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    scroll-behavior: smooth !important;
    -webkit-tap-highlight-color: transparent;
    /* Remove conflicting font-smoothing */
  }

  /* Improved container with better zoom handling */
  .container {
    max-width: min(100vw - 2rem, 1400px);
    margin: 0 auto;
    padding: 0 clamp(1rem, 2.5vw, 2rem);
    /* Prevent container from getting too wide on zoom */
    width: 100%;
  }

  /* Better responsive text scaling */
  .responsive-text {
    font-size: clamp(0.875rem, 2.5vw, 1.125rem);
    line-height: 1.4;
  }

  /* Flexible spacing with zoom consideration */
  .responsive-spacing {
    padding: clamp(0.5rem, 2.5vw, 2rem);
    margin: clamp(0.25rem, 1.25vw, 1rem);
  }

  .hide {
    display: none;
  }

  svg {
    vertical-align: text-top;
    max-width: 100%;
    height: auto;
    /* Better scaling for icons */
    flex-shrink: 0;
  }

  a {
    color: unset;
    text-decoration: none;
  }

  button {
    border: none;
    outline: none;
    background: transparent;
    width: fit-content;
    margin: 0;
    padding: 0;
    cursor: pointer;
    /* Better touch targets with flexible sizing */
    min-height: clamp(32px, 6vw, 44px);
    min-width: clamp(32px, 6vw, 44px);
    /* Prevent button text from wrapping awkwardly */
    white-space: nowrap;
  }

  /* Improved responsive images */
  img {
    max-width: 100%;
    height: auto;
    /* Prevent images from getting pixelated on zoom */
    image-rendering: -webkit-optimize-contrast;
  }

  /* Better form controls scaling */
  input, textarea, select {
    font-size: max(16px, 1rem);
    /* Better scaling on zoom */
    min-height: clamp(32px, 5vh, 44px);
    padding: clamp(0.25rem, 1vw, 0.75rem);
  }

  /* Specific zoom level optimizations */
  @media screen and (min-width: 1px) {
    /* At high zoom levels, prioritize readability */
    body {
      font-size: clamp(14px, 1rem + 0.5vw, 22px);
    }
    
    /* Ensure buttons don't become tiny */
    button {
      font-size: clamp(12px, 0.875rem + 0.25vw, 18px);
    }
    
    /* Better spacing at different zoom levels */
    .container {
      padding: clamp(0.5rem, 3vw, 3rem);
    }
  }

  /* High DPI display optimizations */
  @media screen and (min-resolution: 2dppx) {
    * {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    /* Sharper rendering for high DPI */
    svg, img {
      image-rendering: -webkit-optimize-contrast;
    }
  }

  /* Prevent horizontal scroll issues on zoom */
  body {
    max-width: 100vw;
    overflow-x: hidden;
  }

  /* Better focus indicators that scale */
  *:focus-visible {
    outline: clamp(1px, 0.125rem, 3px) solid #007acc;
    outline-offset: clamp(1px, 0.125rem, 2px);
  }
`;

export default GlobalStyle;