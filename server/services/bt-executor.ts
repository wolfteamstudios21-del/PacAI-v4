export interface BTExecutionResult {
  status: 'success' | 'failure' | 'running';
  executedNodes: string[];
  logs: string[];
}

export function executeBehaviorTree(
  btString: string,
  context: Record<string, any>
): BTExecutionResult {
  const logs: string[] = [];
  const executedNodes: string[] = [];

  try {
    logs.push(`[BT Executor] Starting execution with context: ${JSON.stringify(context)}`);
    logs.push(`[BT Executor] BT String: ${btString.substring(0, 100)}${btString.length > 100 ? '...' : ''}`);

    const parsedTree = parseBT(btString);
    logs.push(`[BT Executor] Parsed ${parsedTree.length} nodes`);

    parsedTree.forEach((node, idx) => {
      executedNodes.push(node.id);
      logs.push(`[Node ${idx + 1}] Executing: ${node.type} - ${node.label}`);
    });

    const hasFailure = btString.toLowerCase().includes('fail');
    const status = hasFailure ? 'failure' : 'success';

    logs.push(`[BT Executor] Execution completed with status: ${status.toUpperCase()}`);

    return {
      status,
      executedNodes,
      logs,
    };
  } catch (error: any) {
    logs.push(`[BT Executor] Error: ${error.message}`);
    return {
      status: 'failure',
      executedNodes,
      logs,
    };
  }
}

function parseBT(btString: string): Array<{ id: string; type: string; label: string }> {
  const lines = btString.split('\n').filter(line => line.trim());
  return lines.map((line, idx) => ({
    id: `node_${idx}`,
    type: line.includes('?') ? 'condition' : 'action',
    label: line.trim().substring(0, 50),
  }));
}
