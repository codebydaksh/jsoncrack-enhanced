import React from "react";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { createTheme, MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/code-highlight/styles.css";
import { ThemeProvider } from "styled-components";
import { NextSeo, SoftwareAppJsonLd } from "next-seo";
import { GoogleAnalytics } from "nextjs-google-analytics";
import { Toaster } from "react-hot-toast";
import GlobalStyle from "../constants/globalStyle";
import { SEO } from "../constants/seo";
import { lightTheme } from "../constants/theme";
import { smartColorSchemeManager } from "../lib/utils/mantineColorScheme";

const theme = createTheme({
  autoContrast: true,
  fontSmoothing: false,
  respectReducedMotion: true,
  cursorType: "pointer",
  fontFamily:
    'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji"',
  defaultGradient: {
    from: "#388cdb",
    to: "#0f037f",
    deg: 180,
  },
  primaryShade: 8,
  colors: {
    brightBlue: [
      "#e6f2ff",
      "#cee1ff",
      "#9bc0ff",
      "#649dff",
      "#3980fe",
      "#1d6dfe",
      "#0964ff",
      "#0054e4",
      "#004acc",
      "#003fb5",
    ],
  },
  radius: {
    lg: "0.75rem",
  },
  // Add responsive breakpoints
  breakpoints: {
    xs: "30em", // 480px
    sm: "48em", // 768px
    md: "64em", // 1024px
    lg: "74em", // 1184px
    xl: "90em", // 1440px
  },
  // Responsive font sizes
  fontSizes: {
    xs: "clamp(0.75rem, 1.5vw, 0.875rem)",
    sm: "clamp(0.875rem, 2vw, 1rem)",
    md: "clamp(1rem, 2.5vw, 1.125rem)",
    lg: "clamp(1.125rem, 3vw, 1.25rem)",
    xl: "clamp(1.25rem, 3.5vw, 1.5rem)",
  },
  // Responsive spacing
  spacing: {
    xs: "clamp(0.25rem, 1vw, 0.5rem)",
    sm: "clamp(0.5rem, 1.5vw, 0.75rem)",
    md: "clamp(0.75rem, 2vw, 1rem)",
    lg: "clamp(1rem, 2.5vw, 1.5rem)",
    xl: "clamp(1.5rem, 3vw, 2rem)",
  },
  components: {
    Button: {
      defaultProps: {
        fw: 500,
      },
      styles: {
        root: {
          fontSize: "clamp(0.875rem, 2vw, 1rem)",
          padding: "clamp(0.5rem, 1.5vw, 0.75rem) clamp(1rem, 2.5vw, 1.5rem)",
          minHeight: "2.75rem",
        },
      },
    },
    Container: {
      defaultProps: {
        size: "xl",
      },
      styles: {
        root: {
          maxWidth: "min(100vw - 2rem, 1400px)",
          padding: "0 clamp(1rem, 2.5vw, 2rem)",
        },
      },
    },
  },
});

function JsonCrack({ Component, pageProps }: AppProps) {
  const { pathname } = useRouter();

  // Create a single smart manager that handles pathname logic internally
  const colorSchemeManager = smartColorSchemeManager({
    key: "editor-color-scheme",
    getPathname: () => pathname,
    dynamicPaths: ["/editor"], // Only editor paths use dynamic theme
  });

  return (
    <>
      <NextSeo
        {...SEO}
        additionalMetaTags={[
          {
            name: "viewport",
            content:
              "width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover",
          },
          {
            name: "format-detection",
            content: "telephone=no",
          },
          {
            name: "mobile-web-app-capable",
            content: "yes",
          },
        ]}
      />
      <SoftwareAppJsonLd
        name="JSON Crack"
        price="0"
        priceCurrency="USD"
        type="SoftwareApplication"
        operatingSystem="Browser"
        keywords="json, json viewer, json visualizer, json formatter, json editor, json parser, json to tree view, json to diagram, json graph, json beautifier, json validator, json to csv, json to yaml, json minifier, json schema, json data transformer, json api, online json viewer, online json formatter, online json editor, json tool"
        applicationCategory="DeveloperApplication"
        aggregateRating={{ ratingValue: "4.9", ratingCount: "19" }}
      />
      <MantineProvider
        colorSchemeManager={colorSchemeManager}
        defaultColorScheme="light"
        theme={theme}
      >
        <ThemeProvider theme={lightTheme}>
          <Toaster
            position="bottom-right"
            containerStyle={{
              bottom: 34,
              right: 8,
              fontSize: 14,
            }}
            toastOptions={{
              style: {
                background: "#4D4D4D",
                color: "#B9BBBE",
                borderRadius: 4,
              },
            }}
          />
          <GlobalStyle />
          {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && <GoogleAnalytics trackPageViews />}
          <Component {...pageProps} />
        </ThemeProvider>
      </MantineProvider>
    </>
  );
}

export default JsonCrack;
