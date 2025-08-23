import React from "react";
import { Container, Image, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import styled from "styled-components";

const StyledImageWrapper = styled.div`
  position: relative;

  &::after {
    content: "";
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    padding: clamp(0.75rem, 1.5vw, 1rem);
    border-radius: 0.9375rem;
    border: 1px solid #e0e0e0;
    background: #f3f3f3;
    --line-color-1: #e3e3e3;
    --line-color-2: #e5e5e5;
    background-image:
      linear-gradient(var(--line-color-1) 1.5px, transparent 1.5px),
      linear-gradient(90deg, var(--line-color-1) 1.5px, transparent 1.5px),
      linear-gradient(var(--line-color-2) 1px, transparent 1px),
      linear-gradient(90deg, var(--line-color-2) 1px, transparent 1px);
    background-position:
      -1.5px -1.5px,
      -1.5px -1.5px,
      -1px -1px,
      -1px -1px;
    background-size:
      clamp(6.25rem, 12.5vw, 6.25rem) clamp(6.25rem, 12.5vw, 6.25rem),
      clamp(6.25rem, 12.5vw, 6.25rem) clamp(6.25rem, 12.5vw, 6.25rem),
      clamp(1.25rem, 2.5vw, 1.25rem) clamp(1.25rem, 2.5vw, 1.25rem),
      clamp(1.25rem, 2.5vw, 1.25rem) clamp(1.25rem, 2.5vw, 1.25rem);
  }

  img {
    z-index: 1;
  }
`;

export const Section1 = () => {
  return (
    <Container size="xl" py="clamp(3rem, 10vw, 5rem)">
      <Title
        lh="1.1"
        fz={{
          base: "clamp(1.625rem, 4vw, 2rem)",
          xs: "clamp(2.25rem, 5vw, 2.875rem)",
          sm: "clamp(2.625rem, 6vw, 3.25rem)",
        }}
        maw="clamp(12ch, 90vw, 16ch)"
        ta="center"
        order={2}
        c="gray.9"
        mx="auto"
        mb="clamp(0.9375rem, 3vw, 0.9375rem)"
      >
        Make working with JSON easy
      </Title>
      <Title
        order={3}
        fw={400}
        c="gray.7"
        px="clamp(1rem, 3vw, 1.5rem)"
        mx="auto"
        ta="center"
        mb="clamp(3.125rem, 8vw, 3.125rem)"
        fz={{
          base: "clamp(1rem, 2.5vw, 1rem)",
          sm: "clamp(1.125rem, 3vw, 1.125rem)",
        }}
        w={{
          base: "100%",
          md: "clamp(37.5rem, 80vw, 37.5rem)",
        }}
      >
        JSON Crack eliminates the chaos of raw, messy data, making the complex appear simple and
        easy to understand.
      </Title>
      <SimpleGrid
        cols={{
          base: 1,
          sm: 3,
        }}
      >
        <Stack
          p="clamp(1rem, 2.5vw, 1.5rem)"
          m="clamp(1rem, 2.5vw, 1.5rem)"
          maw="clamp(22.5rem, 90vw, 22.5rem)"
          mx="auto"
          style={{
            borderRadius: "clamp(1.0625rem, 2.5vw, 1.0625rem)",
            border: "1px solid #e0e0e0",
          }}
        >
          <StyledImageWrapper>
            <Image src="/assets/step1-visual.png" pos="relative" w="100%" alt="upload" />
          </StyledImageWrapper>
          <Title ta="center" c="black" order={3}>
            Upload your data
          </Title>
          <Text ta="center" c="gray.7">
            Upload your JSON file, URL, or type your data directly into our easy-to-use text editor.
          </Text>
        </Stack>
        <Stack
          p="clamp(1rem, 2.5vw, 1.5rem)"
          m="clamp(1rem, 2.5vw, 1.5rem)"
          maw="clamp(22.5rem, 90vw, 22.5rem)"
          mx="auto"
          style={{
            borderRadius: "clamp(1.0625rem, 2.5vw, 1.0625rem)",
            border: "1px solid #e0e0e0",
          }}
        >
          <StyledImageWrapper>
            <Image src="/assets/step2-visual.png" pos="relative" w="100%" alt="visualize" />
          </StyledImageWrapper>
          <Title ta="center" c="black" order={3}>
            Visualize your JSON
          </Title>
          <Text ta="center" c="gray.7">
            Your data will automatically be turned into a visual tree graph so you can quickly
            understand your data at a glance.
          </Text>
        </Stack>
        <Stack
          p="clamp(1rem, 2.5vw, 1.5rem)"
          m="clamp(1rem, 2.5vw, 1.5rem)"
          maw="clamp(22.5rem, 90vw, 22.5rem)"
          mx="auto"
          style={{
            borderRadius: "clamp(1.0625rem, 2.5vw, 1.0625rem)",
            border: "1px solid #e0e0e0",
          }}
        >
          <StyledImageWrapper>
            <Image src="/assets/step3-visual.png" pos="relative" w="100%" alt="export image" />
          </StyledImageWrapper>
          <Title ta="center" c="black" order={3}>
            Export to image
          </Title>
          <Text ta="center" c="gray.7">
            Once you&apos;re satisfied, you can export an image of your graph as PNG, JPEG, or SVG
            and share with others.
          </Text>
        </Stack>
      </SimpleGrid>
    </Container>
  );
};
