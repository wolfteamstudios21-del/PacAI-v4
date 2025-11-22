import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save, Send } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function WorldState() {
  const [keyValuePairs, setKeyValuePairs] = useState<Array<{ key: string; value: string }>>([
    { key: "", value: "" },
  ]);
  const [jsonText, setJsonText] = useState("{}");
  const { toast } = useToast();

  const { data: worldState } = useQuery({
    queryKey: ["/api/worldstate"],
  });

  useEffect(() => {
    if (worldState) {
      const pairs = Object.entries(worldState).map(([key, value]) => ({
        key,
        value: JSON.stringify(value),
      }));
      setKeyValuePairs(pairs.length > 0 ? pairs : [{ key: "", value: "" }]);
      setJsonText(JSON.stringify(worldState, null, 2));
    }
  }, [worldState]);

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      return apiRequest("POST", "/api/worldstate", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/worldstate"] });
      toast({
        title: "State Saved",
        description: "World state updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const pushToGodotMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      return apiRequest("POST", "/api/worldstate/push", data);
    },
    onSuccess: () => {
      toast({
        title: "Pushed to Godot",
        description: "State synchronized with Godot instance",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Push Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveKeyValue = () => {
    try {
      const state: Record<string, any> = {};
      keyValuePairs.forEach((pair) => {
        if (pair.key.trim()) {
          try {
            state[pair.key] = JSON.parse(pair.value);
          } catch {
            state[pair.key] = pair.value;
          }
        }
      });
      saveMutation.mutate(state);
    } catch (error: any) {
      toast({
        title: "Invalid Data",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveJson = () => {
    try {
      const state = JSON.parse(jsonText);
      saveMutation.mutate(state);
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Please provide valid JSON format",
        variant: "destructive",
      });
    }
  };

  const handlePushToGodot = () => {
    try {
      const state = JSON.parse(jsonText);
      pushToGodotMutation.mutate(state);
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Cannot push invalid state",
        variant: "destructive",
      });
    }
  };

  const addPair = () => {
    setKeyValuePairs([...keyValuePairs, { key: "", value: "" }]);
  };

  const removePair = (idx: number) => {
    if (keyValuePairs.length > 1) {
      setKeyValuePairs(keyValuePairs.filter((_, i) => i !== idx));
    }
  };

  const updatePair = (idx: number, field: "key" | "value", val: string) => {
    const updated = [...keyValuePairs];
    updated[idx][field] = val;
    setKeyValuePairs(updated);
  };

  return (
    <div className="w-full h-full overflow-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">
              World State Editor
            </h1>
            <Badge variant="outline" data-testid="badge-sync-time">
              Last sync: {new Date().toLocaleTimeString()}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Manage world state key-value pairs and push to Godot mobile instances
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>State Management</CardTitle>
            <CardDescription>
              Edit state using table view or raw JSON
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="table" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="table" className="flex-1" data-testid="tab-table-view">
                  Table View
                </TabsTrigger>
                <TabsTrigger value="json" className="flex-1" data-testid="tab-json-view">
                  JSON View
                </TabsTrigger>
              </TabsList>

              <TabsContent value="table" className="space-y-4">
                <div className="space-y-3">
                  {keyValuePairs.map((pair, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        placeholder="Key"
                        value={pair.key}
                        onChange={(e) => updatePair(idx, "key", e.target.value)}
                        className="flex-1"
                        data-testid={`input-key-${idx}`}
                      />
                      <Input
                        placeholder="Value (JSON or string)"
                        value={pair.value}
                        onChange={(e) => updatePair(idx, "value", e.target.value)}
                        className="flex-1"
                        data-testid={`input-value-${idx}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePair(idx)}
                        disabled={keyValuePairs.length === 1}
                        data-testid={`button-remove-${idx}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  onClick={addPair}
                  className="w-full"
                  data-testid="button-add-pair"
                >
                  <Plus className="w-4 h-4" />
                  Add Pair
                </Button>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSaveKeyValue}
                    disabled={saveMutation.isPending}
                    className="flex-1"
                    data-testid="button-save-table"
                  >
                    <Save className="w-4 h-4" />
                    Save State
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="json" className="space-y-4">
                <Textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  className="font-mono text-sm min-h-[400px]"
                  placeholder='{"key": "value"}'
                  data-testid="textarea-json"
                />

                <div className="flex gap-3">
                  <Button
                    onClick={handleSaveJson}
                    disabled={saveMutation.isPending}
                    className="flex-1"
                    data-testid="button-save-json"
                  >
                    <Save className="w-4 h-4" />
                    Save State
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handlePushToGodot}
                    disabled={pushToGodotMutation.isPending}
                    className="flex-1"
                    data-testid="button-push-godot"
                  >
                    <Send className="w-4 h-4" />
                    Push to Godot
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
