import React from "react";
import {
  Button,
  Container,
  Flex,
  Image,
  List,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import styled from "styled-components";
import { LuBadgeCheck } from "react-icons/lu";

const StyledDottedContainer = styled.div`
  position: relative;
  width: 100%;
  min-width: clamp(18.75rem, 50vw, 31.25rem);
  max-width: clamp(31.25rem, 60vw, 37.5rem);
  border-radius: 0.9375rem;
  height: clamp(28.75rem, 60vw, 28.75rem);
  aspect-ratio: 500 / 460;

  .jc {
    position: absolute;
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

  @media only screen and (max-width: 67.8125rem) {
    display: none;
  }

  @media screen and (min-resolution: 144dpi) {
    min-width: clamp(15rem, 45vw, 25rem);
    height: clamp(23rem, 50vw, 23rem);
  }
`;

export const Section3 = () => {
  return (
    <Container size="xl" py="clamp(3rem, 10vw, 5rem)">
      <Flex
        justify="center"
        gap="clamp(2rem, 8vw, 5rem)"
        align="center"
        direction={{ base: "column", lg: "row" }}
      >
        <StyledDottedContainer>
          <Image
            className="jc"
            src="/assets/bf2-image.png"
            alt="json, csv, yaml, xml"
            loading="lazy"
          />
        </StyledDottedContainer>
        <Stack maw={634}>
          <Title
            lh="1.1"
            fz={{
              base: 26,
              xs: 32,
              sm: 42,
            }}
            maw={500}
            order={2}
            c="gray.9"
          >
            Visualize and convert to multiple formats
          </Title>
          <Text my="md" c="gray.7" fz={16} maw={510}>
            JSON Crack supports formats like TOML, CSV, YAML, and XML, making it easier to visualize
            your data, no matter the type.
          </Text>
          <List
            fz={{
              base: 16,
              xs: 18,
            }}
            fw={500}
            component={SimpleGrid}
            c="gray.8"
            icon={<LuBadgeCheck size="20" />}
          >
            <SimpleGrid w="fit-content" cols={2}>
              <List.Item>JSON to CSV</List.Item>
              <List.Item>YAML to JSON</List.Item>
              <List.Item>XML to JSON</List.Item>
              <List.Item>and more...</List.Item>
            </SimpleGrid>
          </List>
          <Button
            component="a"
            href="/converter/json-to-yaml"
            color="#202842"
            size="lg"
            radius="md"
            w="fit-content"
            mt="sm"
          >
            Open Converter
          </Button>
        </Stack>
      </Flex>
    </Container>
  );
};
