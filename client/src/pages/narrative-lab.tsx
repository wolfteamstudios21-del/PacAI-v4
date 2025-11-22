import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Copy, Download } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { NARRATIVE_TEMPLATES } from "@shared/schema";

interface NarrativeResult {
  text: string;
  usedOllama: boolean;
}

export default function NarrativeLab() {
  const [selectedPrompt, setSelectedPrompt] = useState<string>("metro");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [generatedText, setGeneratedText] = useState<string>("");
  const [usedOllama, setUsedOllama] = useState<boolean | null>(null);
  const { toast } = useToast();

  const generateMutation = useMutation({
    mutationFn: async (data: { prompt: string; vars: Record<string, string> }) => {
      return apiRequest<NarrativeResult>("POST", "/api/narrative/generate", data);
    },
    onSuccess: (data) => {
      setGeneratedText(data.text);
      setUsedOllama(data.usedOllama);
      toast({
        title: "Narrative Generated",
        description: data.usedOllama ? "Using local Ollama" : "Using OpenAI fallback",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const currentTemplate = NARRATIVE_TEMPLATES[selectedPrompt];

  const handleGenerate = () => {
    const missingVars = currentTemplate.variables.filter((v) => !variables[v]?.trim());
    if (missingVars.length > 0) {
      toast({
        title: "Missing Variables",
        description: `Please fill in: ${missingVars.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    generateMutation.mutate({
      prompt: selectedPrompt,
      vars: variables,
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText);
    toast({
      title: "Copied",
      description: "Text copied to clipboard",
    });
  };

  const handleDownload = () => {
    const blob = new Blob([generatedText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `narrative-${selectedPrompt}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full h-full overflow-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-2" data-testid="text-page-title">
            Narrative Prompt Lab
          </h1>
          <p className="text-muted-foreground">
            Generate AI narratives using preset templates with dynamic variable substitution
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Prompt Configuration</CardTitle>
              <CardDescription>
                Select template and fill in variables
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Prompt Template</Label>
                <Select
                  value={selectedPrompt}
                  onValueChange={(value) => {
                    setSelectedPrompt(value);
                    setVariables({});
                  }}
                >
                  <SelectTrigger data-testid="select-prompt-template">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="metro">Metro (Post-Apocalyptic)</SelectItem>
                    <SelectItem value="riftwar">Riftwar (Fantasy)</SelectItem>
                    <SelectItem value="training">Training (Simulation)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-muted p-3 rounded-md">
                <div className="text-xs text-muted-foreground mb-1">Template Preview</div>
                <div className="font-mono text-sm">{currentTemplate.template}</div>
              </div>

              <div className="space-y-3">
                <Label className="text-base">Variables</Label>
                {currentTemplate.variables.map((varName) => (
                  <div key={varName} className="space-y-1">
                    <Label className="text-sm text-muted-foreground capitalize">
                      {varName}
                    </Label>
                    <Input
                      placeholder={`Enter ${varName}...`}
                      value={variables[varName] || ""}
                      onChange={(e) =>
                        setVariables({ ...variables, [varName]: e.target.value })
                      }
                      data-testid={`input-var-${varName}`}
                    />
                  </div>
                ))}
              </div>

              <Button
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
                className="w-full"
                data-testid="button-generate"
              >
                <Sparkles className="w-4 h-4" />
                {generateMutation.isPending ? "Generating..." : "Generate Narrative"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Generated Output</CardTitle>
                {usedOllama !== null && (
                  <Badge variant={usedOllama ? "default" : "secondary"} data-testid="badge-llm-source">
                    {usedOllama ? "Ollama (Local)" : "OpenAI"}
                  </Badge>
                )}
              </div>
              <CardDescription>
                AI-generated narrative text
              </CardDescription>
            </CardHeader>
            <CardContent>
              {generateMutation.isPending ? (
                <div className="space-y-4">
                  <Skeleton className="h-64 w-full" />
                  <div className="flex gap-2">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 flex-1" />
                  </div>
                </div>
              ) : generatedText ? (
                <div className="space-y-4">
                  <Textarea
                    value={generatedText}
                    readOnly
                    className="min-h-[300px] font-sans text-base leading-relaxed"
                    data-testid="textarea-generated-text"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleCopy}
                      className="flex-1"
                      data-testid="button-copy"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDownload}
                      className="flex-1"
                      data-testid="button-download"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground" data-testid="text-no-output">
                    No output yet. Configure variables and generate a narrative.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
