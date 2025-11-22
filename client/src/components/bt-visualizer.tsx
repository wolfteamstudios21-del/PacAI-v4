import { useCallback } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card } from './ui/card';

interface BTNode {
  id: string;
  type: string;
  label: string;
}

interface BTVisualizerProps {
  nodes: BTNode[];
  executedNodes: string[];
}

export function BTVisualizer({ nodes, executedNodes }: BTVisualizerProps) {
  const flowNodes: Node[] = nodes.map((node, idx) => {
    const isExecuted = executedNodes.includes(node.id);
    return {
      id: node.id,
      type: 'default',
      position: { x: 250, y: idx * 100 },
      data: { label: `${node.type}: ${node.label}` },
      style: {
        background: isExecuted ? 'hsl(var(--primary))' : 'hsl(var(--card))',
        color: isExecuted ? 'hsl(var(--primary-foreground))' : 'hsl(var(--card-foreground))',
        border: isExecuted ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
        borderRadius: '6px',
        padding: '10px',
        fontSize: '12px',
        fontFamily: 'var(--font-mono)',
      },
    };
  });

  const flowEdges: Edge[] = nodes.slice(0, -1).map((node, idx) => ({
    id: `e${idx}`,
    source: node.id,
    target: nodes[idx + 1].id,
    animated: executedNodes.includes(node.id) && executedNodes.includes(nodes[idx + 1].id),
  }));

  const [nodesState, , onNodesChange] = useNodesState(flowNodes);
  const [edgesState, , onEdgesChange] = useEdgesState(flowEdges);

  return (
    <Card className="h-full p-0 overflow-hidden">
      <div className="h-full" style={{ minHeight: '400px' }}>
        <ReactFlow
          nodes={nodesState}
          edges={edgesState}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
        >
          <Controls />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>
      </div>
    </Card>
  );
}
