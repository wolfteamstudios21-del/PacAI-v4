import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ExternalLink } from "lucide-react";

export default function HowToGuide() {
  return (
    <Card className="border-blue-500/30 bg-gradient-to-br from-blue-900/10 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-500" />
          5-Minute Quickstart
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="space-y-3">
          <li className="flex gap-3">
            <Badge className="h-fit">1</Badge>
            <div>
              <p className="font-semibold">New Project</p>
              <p className="text-sm text-muted-foreground">Click "Create" and name your world</p>
            </div>
          </li>
          <li className="flex gap-3">
            <Badge className="h-fit">2</Badge>
            <div>
              <p className="font-semibold">Paste Prompt</p>
              <p className="text-sm text-muted-foreground">Describe your scene in plain English</p>
            </div>
          </li>
          <li className="flex gap-3">
            <Badge className="h-fit">3</Badge>
            <div>
              <p className="font-semibold">Generate (≤9 sec)</p>
              <p className="text-sm text-muted-foreground">Full world + NPCs + dialogue created</p>
            </div>
          </li>
          <li className="flex gap-3">
            <Badge className="h-fit">4</Badge>
            <div>
              <p className="font-semibold">Tweak & Inject</p>
              <p className="text-sm text-muted-foreground">Live controls: override behavior, adjust counts</p>
            </div>
          </li>
          <li className="flex gap-3">
            <Badge className="h-fit">5</Badge>
            <div>
              <p className="font-semibold">Export & Import</p>
              <p className="text-sm text-muted-foreground">Choose engine → Download ZIP → Open in UE5/Unity/Godot</p>
            </div>
          </li>
        </ol>

        <div className="pt-4 border-t">
          <a
            href="https://discord.gg/TtfHgfCQMY"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline font-medium flex items-center gap-2"
            data-testid="link-discord-guide"
          >
            Full tutorials in Discord #how-to
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
