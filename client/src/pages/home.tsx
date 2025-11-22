import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Network, Brain, Sparkles, Database, ArrowRight } from "lucide-react";

const features = [
  {
    title: "Behavior Tree Tester",
    description: "Upload and visualize behavior trees. Execute tick-by-tick simulations with detailed console output.",
    icon: Network,
    href: "/bt-tester",
    color: "text-blue-600 dark:text-blue-400",
  },
  {
    title: "ONNX Model Tester",
    description: "Test ONNX models with dynamic input generation. Get real-time predictions and performance metrics.",
    icon: Brain,
    href: "/onnx-tester",
    color: "text-purple-600 dark:text-purple-400",
  },
  {
    title: "Narrative Prompt Lab",
    description: "Generate AI narratives with preset templates. Test LLM prompts with variable substitution.",
    icon: Sparkles,
    href: "/narrative-lab",
    color: "text-amber-600 dark:text-amber-400",
  },
  {
    title: "World State Editor",
    description: "Manage and edit world state key-value pairs. Push states directly to Godot mobile instances.",
    icon: Database,
    href: "/world-state",
    color: "text-green-600 dark:text-green-400",
  },
];

export default function Home() {
  return (
    <div className="w-full h-full overflow-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">
            AI Brain Testing Companion
          </h1>
          <p className="text-muted-foreground text-lg">
            Professional testing suite for AI Brain Core (Godot addon). Test behavior trees, ONNX models, narrative generation, and world states.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="hover-elevate" data-testid={`card-feature-${feature.title.toLowerCase().replace(/ /g, '-')}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 mb-2">
                      <feature.icon className={`w-5 h-5 ${feature.color}`} />
                      {feature.title}
                    </CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Link href={feature.href}>
                  <Button variant="outline" className="w-full group" data-testid={`button-open-${feature.title.toLowerCase().replace(/ /g, '-')}`}>
                    Open
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>API Integration</CardTitle>
            <CardDescription>
              Connect your Godot mobile app to this testing platform via REST API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-md font-mono text-sm">
              <div className="text-muted-foreground mb-2"># Example Godot HTTPRequest</div>
              <pre className="text-foreground whitespace-pre-wrap">
{`var http = HTTPRequest.new()
add_child(http)
http.request("http://localhost:5000/api/onnx/predict", [],
  HTTPClient.METHOD_POST,
  JSON.stringify({"inputs":[0.1,0.5,0.2]}))`}
              </pre>
            </div>
            <p className="text-sm text-muted-foreground">
              All endpoints support CORS for seamless integration with Godot mobile instances.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
