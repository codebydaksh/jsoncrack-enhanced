import { createGlobalStyle } from "styled-components";

const GlobalStyle = createGlobalStyle`
  html {
    font-size: 16px;
    scroll-behavior: smooth;
    
    /* Responsive font scaling */
    @media screen and (max-width: 768px) {
      font-size: 14px;
    }
    
    @media screen and (min-width: 1440px) {
      font-size: 18px;
    }
    
    /* Handle high zoom levels */
    @media screen and (min-resolution: 144dpi) {
      font-size: 15px;
    }
  }

  html, body {
    background: #ffffff;
    overscroll-behavior: none;
    -webkit-font-smoothing: subpixel-antialiased !important;
    line-height: 1.5;
    min-height: 100vh;
  }

  *,
  *::before,
  *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      scroll-behavior: smooth !important;
      -webkit-tap-highlight-color: transparent;
      -webkit-font-smoothing: never;
  }

  /* Container max-widths for better scaling */
  .container {
    max-width: min(100vw - 2rem, 1400px);
    margin: 0 auto;
    padding: 0 1rem;
  }

  /* Responsive text scaling */
  .responsive-text {
    font-size: clamp(0.875rem, 2.5vw, 1.125rem);
  }

  /* Flexible spacing */
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
    /* Better touch targets */
    min-height: 44px;
    min-width: 44px;
  }

  /* Improved responsive images */
  img {
    max-width: 100%;
    height: auto;
  }

  /* Better form controls scaling */
  input, textarea, select {
    font-size: max(16px, 1rem);
  }
  
  /* Handle zoom and high DPI displays */
  @media screen and (min-resolution: 2dppx) {
    * {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
  }
`;

export default GlobalStyle;
