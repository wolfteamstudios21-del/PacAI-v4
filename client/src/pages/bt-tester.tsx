import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Upload, Trash2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BTVisualizer } from "@/components/bt-visualizer";

interface BTExecutionResult {
  tick_output: {
    status: 'success' | 'failure' | 'running';
    executedNodes: string[];
    logs: string[];
  };
}

interface BTNode {
  id: string;
  type: string;
  label: string;
}

export default function BTTester() {
  const [btString, setBtString] = useState("");
  const [context, setContext] = useState("{}");
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [btNodes, setBtNodes] = useState<BTNode[]>([]);
  const [executedNodes, setExecutedNodes] = useState<string[]>([]);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const { toast } = useToast();

  const executeMutation = useMutation({
    mutationFn: async (data: { bt_string: string; context: any }) => {
      const startTime = performance.now();
      const result = await apiRequest<BTExecutionResult>("POST", "/api/bt/run", data);
      const elapsed = Math.round(performance.now() - startTime);
      setExecutionTime(elapsed);
      return result;
    },
    onSuccess: (data) => {
      const logs = [
        `[${new Date().toLocaleTimeString()}] Status: ${data.tick_output.status.toUpperCase()} (${executionTime}ms)`,
        `Nodes: ${data.tick_output.executedNodes.join(' → ')}`,
        ...data.tick_output.logs,
      ];
      setExecutionLogs((prev) => [...logs, ...prev]);
      setExecutedNodes(data.tick_output.executedNodes);
      
      const parsedNodes = btString.split('\n')
        .filter(line => line.trim())
        .map((line, idx) => ({
          id: `node_${idx}`,
          type: line.includes('?') ? 'condition' : 'action',
          label: line.trim().substring(0, 30),
        }));
      setBtNodes(parsedNodes);
      
      toast({
        title: "BT Executed",
        description: `Status: ${data.tick_output.status}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Execution Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleExecute = () => {
    if (!btString.trim()) {
      toast({
        title: "BT Required",
        description: "Please provide a behavior tree string",
        variant: "destructive",
      });
      return;
    }

    let parsedContext = {};
    try {
      parsedContext = JSON.parse(context);
    } catch (e) {
      toast({
        title: "Invalid Context",
        description: "Context must be valid JSON",
        variant: "destructive",
      });
      return;
    }

    executeMutation.mutate({
      bt_string: btString,
      context: parsedContext,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBtString(event.target?.result as string);
        toast({
          title: "File Loaded",
          description: file.name,
        });
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="w-full h-full overflow-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-2" data-testid="text-page-title">
            Behavior Tree Tester
          </h1>
          <p className="text-muted-foreground">
            Upload or paste your behavior tree definition, then execute tick-by-tick simulations
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">BT Definition</CardTitle>
                <CardDescription>Paste your behavior tree string or upload a file</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="relative">
                    <input
                      type="file"
                      accept=".txt,.json,.bt"
                      onChange={handleFileUpload}
                      className="hidden"
                      data-testid="input-file-upload"
                    />
                    <Button variant="outline" className="w-full" asChild>
                      <span className="cursor-pointer" data-testid="button-upload-file">
                        <Upload className="w-4 h-4" />
                        Upload BT File
                      </span>
                    </Button>
                  </label>
                </div>
                <Textarea
                  placeholder="Paste behavior tree string here..."
                  value={btString}
                  onChange={(e) => setBtString(e.target.value)}
                  className="font-mono text-sm min-h-[200px]"
                  data-testid="input-bt-string"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Context (JSON)</CardTitle>
                <CardDescription>Provide execution context variables</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder='{"variable": "value"}'
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  className="font-mono text-sm min-h-[120px]"
                  data-testid="input-context"
                />
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                onClick={handleExecute}
                disabled={executeMutation.isPending}
                className="flex-1"
                data-testid="button-run-tick"
              >
                <Play className="w-4 h-4" />
                {executeMutation.isPending ? "Running..." : "Run Tick"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setExecutionLogs([])}
                data-testid="button-clear-logs"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-4">
            {executeMutation.isPending && (
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                </CardContent>
              </Card>
            )}

            {btNodes.length > 0 && (
              <div className="h-[300px]">
                <BTVisualizer nodes={btNodes} executedNodes={executedNodes} />
              </div>
            )}

            <Card className="h-[400px] flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Console Output</CardTitle>
                  <Badge variant="outline" data-testid="badge-log-count">
                    {executionLogs.length} logs
                  </Badge>
                </div>
                <CardDescription>Tick execution results and debug information</CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="flex-1 p-0">
                <ScrollArea className="h-full">
                  <div className="p-6 space-y-2 bg-muted/30 font-mono text-sm">
                    {executionLogs.length === 0 ? (
                      <p className="text-muted-foreground italic" data-testid="text-empty-logs">
                        No execution logs yet. Run a tick to see output here.
                      </p>
                    ) : (
                      executionLogs.map((log, idx) => (
                        <div key={idx} className="text-foreground" data-testid={`text-log-${idx}`}>
                          {log}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
