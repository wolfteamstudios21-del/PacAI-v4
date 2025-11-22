import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Minus, Brain } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PredictionResult {
  prediction: number | number[];
}

export default function OnnxTester() {
  const [inputs, setInputs] = useState<number[]>([0]);
  const [prediction, setPrediction] = useState<number | number[] | null>(null);
  const { toast } = useToast();

  const predictMutation = useMutation({
    mutationFn: async (data: { inputs: number[] }) => {
      return apiRequest<PredictionResult>("POST", "/api/onnx/predict", data);
    },
    onSuccess: (data) => {
      setPrediction(data.prediction);
      toast({
        title: "Prediction Complete",
        description: "Model inference successful",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Prediction Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePredict = () => {
    if (inputs.some(isNaN)) {
      toast({
        title: "Invalid Input",
        description: "All inputs must be valid numbers",
        variant: "destructive",
      });
      return;
    }

    predictMutation.mutate({ inputs });
  };

  const addInput = () => setInputs([...inputs, 0]);
  const removeInput = (idx: number) => {
    if (inputs.length > 1) {
      setInputs(inputs.filter((_, i) => i !== idx));
    }
  };
  const updateInput = (idx: number, value: string) => {
    const newInputs = [...inputs];
    newInputs[idx] = parseFloat(value) || 0;
    setInputs(newInputs);
  };

  return (
    <div className="w-full h-full overflow-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-2" data-testid="text-page-title">
            ONNX Model Tester
          </h1>
          <p className="text-muted-foreground">
            Test ONNX models with dynamic input arrays and get real-time predictions
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Input Configuration</CardTitle>
              <CardDescription>
                Build your input array for model inference
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {inputs.map((value, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground font-mono w-16">
                      [{idx}]
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      value={value}
                      onChange={(e) => updateInput(idx, e.target.value)}
                      className="font-mono"
                      data-testid={`input-value-${idx}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeInput(idx)}
                      disabled={inputs.length === 1}
                      data-testid={`button-remove-${idx}`}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={addInput}
                className="w-full"
                data-testid="button-add-input"
              >
                <Plus className="w-4 h-4" />
                Add Input
              </Button>

              <div className="pt-4 border-t">
                <div className="text-sm text-muted-foreground mb-2">Input Array</div>
                <div className="bg-muted p-3 rounded-md font-mono text-sm" data-testid="text-input-array">
                  [{inputs.join(", ")}]
                </div>
              </div>

              <Button
                onClick={handlePredict}
                disabled={predictMutation.isPending}
                className="w-full"
                data-testid="button-predict"
              >
                <Brain className="w-4 h-4" />
                {predictMutation.isPending ? "Predicting..." : "Predict"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prediction Output</CardTitle>
              <CardDescription>
                Model inference results
              </CardDescription>
            </CardHeader>
            <CardContent>
              {predictMutation.isPending ? (
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : prediction === null ? (
                <div className="text-center py-12">
                  <Brain className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground" data-testid="text-no-prediction">
                    No prediction yet. Configure inputs and click Predict.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Badge className="mb-2">Prediction Result</Badge>
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 text-center">
                      <div className="text-4xl font-bold font-mono text-primary" data-testid="text-prediction-value">
                        {Array.isArray(prediction)
                          ? `[${prediction.join(", ")}]`
                          : prediction.toFixed(4)}
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted p-4 rounded-md space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Input Length:</span>
                      <span className="font-mono">{inputs.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Output Type:</span>
                      <span className="font-mono">
                        {Array.isArray(prediction) ? "Array" : "Scalar"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Timestamp:</span>
                      <span className="font-mono">{new Date().toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
