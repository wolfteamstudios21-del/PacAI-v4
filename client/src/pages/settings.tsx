import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, Key, Server, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const [openaiKey, setOpenaiKey] = useState("");
  const [ollamaEndpoint, setOllamaEndpoint] = useState("http://localhost:11434");
  const [ollamaStatus, setOllamaStatus] = useState<"unknown" | "connected" | "failed">("unknown");
  const { toast } = useToast();

  useEffect(() => {
    const savedKey = localStorage.getItem("openai_api_key") || "";
    const savedEndpoint = localStorage.getItem("ollama_endpoint") || "http://localhost:11434";
    setOpenaiKey(savedKey);
    setOllamaEndpoint(savedEndpoint);
  }, []);

  const handleSaveOpenAI = () => {
    if (openaiKey.trim()) {
      localStorage.setItem("openai_api_key", openaiKey);
      toast({
        title: "API Key Saved",
        description: "OpenAI API key stored locally",
      });
    }
  };

  const handleSaveOllama = () => {
    localStorage.setItem("ollama_endpoint", ollamaEndpoint);
    toast({
      title: "Endpoint Saved",
      description: "Ollama endpoint configuration updated",
    });
  };

  const handleTestOllama = async () => {
    try {
      const response = await fetch(`${ollamaEndpoint}/api/tags`);
      if (response.ok) {
        setOllamaStatus("connected");
        toast({
          title: "Connection Successful",
          description: "Ollama is running and accessible",
        });
      } else {
        setOllamaStatus("failed");
        toast({
          title: "Connection Failed",
          description: "Cannot reach Ollama endpoint",
          variant: "destructive",
        });
      }
    } catch (error) {
      setOllamaStatus("failed");
      toast({
        title: "Connection Failed",
        description: "Ollama is not running or endpoint is incorrect",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-full h-full overflow-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-2 flex items-center gap-2" data-testid="text-page-title">
            <SettingsIcon className="w-6 h-6" />
            Settings
          </h1>
          <p className="text-muted-foreground">
            Configure API keys and application preferences
          </p>
        </div>

        <Tabs defaultValue="api-keys" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="api-keys" className="flex-1" data-testid="tab-api-keys">
              <Key className="w-4 h-4 mr-2" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex-1" data-testid="tab-preferences">
              <Server className="w-4 h-4 mr-2" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="about" className="flex-1" data-testid="tab-about">
              <Info className="w-4 h-4 mr-2" />
              About
            </TabsTrigger>
          </TabsList>

          <TabsContent value="api-keys" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>OpenAI API Key</CardTitle>
                <CardDescription>
                  Used as fallback when Ollama is unavailable. Stored locally in browser.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="openai-key">API Key</Label>
                  <Input
                    id="openai-key"
                    type="password"
                    placeholder="sk-..."
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    data-testid="input-openai-key"
                  />
                </div>
                <Button onClick={handleSaveOpenAI} data-testid="button-save-openai">
                  Save API Key
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Ollama Configuration</CardTitle>
                    <CardDescription>
                      Local LLM endpoint for narrative generation
                    </CardDescription>
                  </div>
                  {ollamaStatus !== "unknown" && (
                    <Badge
                      variant={ollamaStatus === "connected" ? "default" : "destructive"}
                      data-testid="badge-ollama-status"
                    >
                      {ollamaStatus === "connected" ? "Connected" : "Disconnected"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ollama-endpoint">Ollama Endpoint</Label>
                  <Input
                    id="ollama-endpoint"
                    placeholder="http://localhost:11434"
                    value={ollamaEndpoint}
                    onChange={(e) => setOllamaEndpoint(e.target.value)}
                    data-testid="input-ollama-endpoint"
                  />
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleSaveOllama} data-testid="button-save-ollama">
                    Save Endpoint
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleTestOllama}
                    data-testid="button-test-ollama"
                  >
                    Test Connection
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="about" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Brain App</CardTitle>
                <CardDescription>
                  Testing companion for AI Brain Core (Godot addon)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Version:</span>
                    <span className="font-mono">1.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform:</span>
                    <span className="font-mono">Web + Mobile PWA</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">API Base:</span>
                    <span className="font-mono">http://localhost:5000/api</span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="font-semibold mb-2">Features</h3>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Behavior Tree testing and visualization</li>
                    <li>ONNX model inference testing</li>
                    <li>Narrative prompt generation (LLM)</li>
                    <li>World state management</li>
                    <li>Godot mobile integration via REST API</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
