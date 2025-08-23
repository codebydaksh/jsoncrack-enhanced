import React, { useEffect, useRef, useState } from "react";
import { ActionIcon, Card, Group, Text, Tooltip } from "@mantine/core";
import { useViewportSize } from "@mantine/hooks";
import { event as gaEvent } from "nextjs-google-analytics";
import { LuMap, LuMapPin, LuX } from "react-icons/lu";
import styled from "styled-components";
import useGraph from "./stores/useGraph";

const StyledMiniMapContainer = styled(Card)<{ $visible: boolean }>`
  position: absolute;
  top: 60px;
  right: 10px;
  width: 200px;
  height: 150px;
  z-index: 99;
  opacity: ${({ $visible }) => ($visible ? 0.9 : 0)};
  visibility: ${({ $visible }) => ($visible ? "visible" : "hidden")};
  transition: opacity 0.3s ease, visibility 0.3s ease;
  pointer-events: ${({ $visible }) => ($visible ? "auto" : "none")};
  border: 1px solid ${({ theme }) => theme.INTERACTIVE_NORMAL};
  
  &:hover {
    opacity: 1;
  }
`;

const StyledMiniMapCanvas = styled.canvas`
  width: 100%;
  height: 100%;
  cursor: crosshair;
  border-radius: 4px;
`;

const StyledViewportIndicator = styled.div<{
  $x: number;
  $y: number;
  $width: number;
  $height: number;
}>`
  position: absolute;
  left: ${({ $x }) => $x}px;
  top: ${({ $y }) => $y}px;
  width: ${({ $width }) => $width}px;
  height: ${({ $height }) => $height}px;
  border: 2px solid #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  pointer-events: none;
  border-radius: 2px;
`;

interface MiniMapProps {
  visible: boolean;
  onToggle: () => void;
}

export const MiniMap = ({ visible, onToggle }: MiniMapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodes = useGraph(state => state.nodes);
  const viewPort = useGraph(state => state.viewPort);
  const { width: screenWidth, height: screenHeight } = useViewportSize();
  const [graphBounds, setGraphBounds] = useState({ minX: 0, minY: 0, maxX: 0, maxY: 0 });
  const [viewportBounds, setViewportBounds] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Calculate graph bounds
  useEffect(() => {
    if (nodes.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    // Find all node elements to get their actual positions
    nodes.forEach(node => {
      const nodeElement = document.querySelector(`g[id$='node-${node.id}']`) as SVGElement;
      if (nodeElement) {
        const transform = nodeElement.getAttribute('transform') || '';
        const matches = transform.match(/translate\(([^,]+),([^)]+)\)/);
        if (matches) {
          const x = parseFloat(matches[1]);
          const y = parseFloat(matches[2]);
          
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x + node.width);
          maxY = Math.max(maxY, y + node.height);
        }
      }
    });

    if (isFinite(minX)) {
      setGraphBounds({ minX, minY, maxX, maxY });
    }
  }, [nodes]);

  // Update viewport indicator
  useEffect(() => {
    if (!viewPort || !visible) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();
    const graphWidth = graphBounds.maxX - graphBounds.minX;
    const graphHeight = graphBounds.maxY - graphBounds.minY;

    if (graphWidth === 0 || graphHeight === 0) return;

    // Calculate viewport position and size relative to graph
    const scaleX = canvasRect.width / graphWidth;
    const scaleY = canvasRect.height / graphHeight;

    // Calculate current viewport bounds in graph coordinates
    const viewportGraphX = (viewPort.centerX - screenWidth / 2) / viewPort.zoomFactor;
    const viewportGraphY = (viewPort.centerY - screenHeight / 2) / viewPort.zoomFactor;
    const viewportGraphWidth = screenWidth / viewPort.zoomFactor;
    const viewportGraphHeight = screenHeight / viewPort.zoomFactor;

    // Convert to minimap coordinates
    const x = Math.max(0, (viewportGraphX - graphBounds.minX) * scaleX);
    const y = Math.max(0, (viewportGraphY - graphBounds.minY) * scaleY);
    const width = Math.min(canvasRect.width - x, viewportGraphWidth * scaleX);
    const height = Math.min(canvasRect.height - y, viewportGraphHeight * scaleY);

    setViewportBounds({ x, y, width, height });
  }, [viewPort, graphBounds, screenWidth, screenHeight, visible]);

  // Draw minimap
  useEffect(() => {
    if (!visible) return;

    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match display size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--mantine-color-gray-0') || '#f8f9fa';
    ctx.fillRect(0, 0, rect.width, rect.height);

    const graphWidth = graphBounds.maxX - graphBounds.minX;
    const graphHeight = graphBounds.maxY - graphBounds.minY;

    if (graphWidth === 0 || graphHeight === 0) return;

    const scaleX = rect.width / graphWidth;
    const scaleY = rect.height / graphHeight;

    // Draw nodes
    nodes.forEach(node => {
      const nodeElement = document.querySelector(`g[id$='node-${node.id}']`) as SVGElement;
      if (nodeElement) {
        const transform = nodeElement.getAttribute('transform') || '';
        const matches = transform.match(/translate\(([^,]+),([^)]+)\)/);
        if (matches) {
          const x = parseFloat(matches[1]);
          const y = parseFloat(matches[2]);
          
          const miniX = (x - graphBounds.minX) * scaleX;
          const miniY = (y - graphBounds.minY) * scaleY;
          const miniWidth = Math.max(2, node.width * scaleX);
          const miniHeight = Math.max(2, node.height * scaleY);

          // Node color based on type
          const hasKey = node.text[0].key;
          ctx.fillStyle = hasKey ? '#3b82f6' : '#6b7280';
          ctx.fillRect(miniX, miniY, miniWidth, miniHeight);
        }
      }
    });

    // Draw edges (simplified)
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    
    // We'll skip edge drawing for performance since it's complex to get actual positions
    // The nodes give a good enough overview for navigation

  }, [nodes, graphBounds, visible]);

  const handleMiniMapClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!viewPort) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const graphWidth = graphBounds.maxX - graphBounds.minX;
    const graphHeight = graphBounds.maxY - graphBounds.minY;

    if (graphWidth === 0 || graphHeight === 0) return;

    // Convert click position to graph coordinates
    const graphX = (clickX / rect.width) * graphWidth + graphBounds.minX;
    const graphY = (clickY / rect.height) * graphHeight + graphBounds.minY;

    // Center viewport on clicked position
    viewPort.camera?.recenter(graphX, graphY, viewPort.zoomFactor);
    
    gaEvent("minimap_navigate");
  };

  if (nodes.length < 5) {
    // Don't show minimap for small graphs
    return null;
  }

  return (
    <StyledMiniMapContainer $visible={visible}>
      <Group justify="space-between" mb="xs">
        <Group gap="xs">
          <LuMap size={12} />
          <Text size="xs" fw={500}>Mini Map</Text>
        </Group>
        <ActionIcon size="xs" variant="subtle" onClick={onToggle}>
          <LuX size={10} />
        </ActionIcon>
      </Group>
      
      <div style={{ position: 'relative', height: 'calc(100% - 30px)' }}>
        <StyledMiniMapCanvas
          ref={canvasRef}
          onClick={handleMiniMapClick}
        />
        {visible && viewPort && (
          <StyledViewportIndicator
            $x={viewportBounds.x}
            $y={viewportBounds.y}
            $width={viewportBounds.width}
            $height={viewportBounds.height}
          />
        )}
      </div>
    </StyledMiniMapContainer>
  );
};

export const MiniMapToggle = () => {
  const [miniMapVisible, setMiniMapVisible] = useState(false);
  const nodes = useGraph(state => state.nodes);

  const toggleMiniMap = () => {
    setMiniMapVisible(!miniMapVisible);
    gaEvent("toggle_minimap", { visible: !miniMapVisible });
  };

  // Don't render toggle for small graphs
  if (nodes.length < 5) {
    return null;
  }

  return (
    <>
      <Tooltip label="Toggle Mini Map">
        <ActionIcon
          size="lg"
          variant="light"
          color="gray"
          onClick={toggleMiniMap}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            zIndex: 100,
          }}
        >
          {miniMapVisible ? <LuMapPin /> : <LuMap />}
        </ActionIcon>
      </Tooltip>
      
      <MiniMap visible={miniMapVisible} onToggle={toggleMiniMap} />
    </>
  );
};