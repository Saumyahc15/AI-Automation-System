import React, { useMemo } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Position,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Custom Node Component for Trigger
const TriggerNode = ({ data }) => (
  <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 rounded-lg font-semibold shadow-lg border-2 border-blue-700">
    <div className="text-sm font-bold">🎯 TRIGGER</div>
    <div className="text-xs mt-1">{data.label}</div>
  </div>
);

// Custom Node Component for Condition
const ConditionNode = ({ data }) => (
  <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-3 rounded-lg font-semibold shadow-lg border-2 border-purple-700">
    <div className="text-sm font-bold">⚙️ CONDITION</div>
    <div className="text-xs mt-1">{data.label}</div>
  </div>
);

// Custom Node Component for Action
const ActionNode = ({ data }) => (
  <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-3 rounded-lg font-semibold shadow-lg border-2 border-green-700">
    <div className="text-sm font-bold">✅ ACTION</div>
    <div className="text-xs mt-1">{data.label}</div>
  </div>
);

// Register custom node types
const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
};

const WorkflowViewer = ({ workflow }) => {
  // Create nodes and edges from workflow data
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!workflow) return { nodes: [], edges: [] };
    const condition = workflow.condition_json || workflow.condition || null;
    const actions = workflow.actions_json || workflow.actions || [];

    const nodes = [];
    const edges = [];
    let yOffset = 0;

    // Add Trigger Node
    if (workflow.trigger_type) {
      nodes.push({
        id: 'trigger',
        data: {
          label: `${workflow.trigger_type}\n${workflow.frequency || ''}`,
        },
        position: { x: 250, y: yOffset },
        type: 'trigger',
      });
      yOffset += 150;
    }

    // Add Condition Node
    if (condition) {
      nodes.push({
        id: 'condition',
        data: {
          label: `${condition.field || 'If'}\n${condition.operator || ''}\n${condition.value ?? ''}`,
        },
        position: { x: 250, y: yOffset },
        type: 'condition',
      });

      // Edge from Trigger to Condition
      edges.push({
        id: 'trigger-condition',
        source: 'trigger',
        target: 'condition',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#9333ea' },
        style: { stroke: '#9333ea', strokeWidth: 2 },
      });

      yOffset += 150;
    }

    // Add Action Nodes
    if (Array.isArray(actions)) {
      actions.forEach((action, index) => {
        const actionId = `action-${index}`;
        const actionLabel = typeof action === 'object' ? action.type : action;

        nodes.push({
          id: actionId,
          data: { label: `${actionLabel}\n${action.target || ''}` },
          position: { x: 250, y: yOffset },
          type: 'action',
        });

        // Edge from Condition to Action (or Trigger if no condition)
        const sourceId = condition ? 'condition' : 'trigger';
        edges.push({
          id: `${sourceId}-${actionId}`,
          source: sourceId,
          target: actionId,
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e' },
          style: { stroke: '#22c55e', strokeWidth: 2 },
        });

        yOffset += 150;
      });
    }

    return { nodes, edges };
  }, [workflow]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  if (!workflow) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No workflow selected</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg shadow-lg overflow-hidden" style={{ height: '600px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
};

export default WorkflowViewer;
