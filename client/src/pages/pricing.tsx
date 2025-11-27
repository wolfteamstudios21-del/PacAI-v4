import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Mail } from "lucide-react";

export default function Pricing() {
  return (
    <div className="w-full h-full overflow-auto bg-gradient-to-br from-background to-muted/50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black mb-4">PacAI v5 – Public Forever</h1>
          <p className="text-xl text-muted-foreground">
            The final AI that builds full games & cinematics in seconds.<br />
            <span className="text-sm">Offline-first • Air-gapped • HSM licensed • 100% deterministic</span>
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {/* FREE */}
          <div className="bg-card border border-border rounded-2xl p-8">
            <h3 className="text-2xl font-bold mb-4">Free Forever</h3>
            <p className="text-4xl font-black mb-6">$0</p>
            <ul className="space-y-3 text-sm mb-8 text-muted-foreground">
              <li>✓ 1 demo game + 1 short animation / month</li>
              <li>✓ 720p exports (watermarked)</li>
              <li>✓ Full public access</li>
            </ul>
            <a
              href="https://discord.gg/TtfHgfCQMY"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="button-pricing-discord"
            >
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                <ExternalLink className="w-4 h-4 mr-2" />
                Join Discord – Start Now
              </Button>
            </a>
          </div>

          {/* CREATOR (Popular) */}
          <div className="bg-card border-2 border-blue-500 rounded-2xl p-8 relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <Badge className="bg-blue-500 text-white px-3 py-1">MOST POPULAR</Badge>
            </div>
            <h3 className="text-2xl font-bold mb-4 mt-2">Creator</h3>
            <p className="text-4xl font-black mb-1">$79</p>
            <p className="text-sm text-muted-foreground mb-6">/month</p>
            <ul className="space-y-3 text-sm mb-8 text-muted-foreground">
              <li>✓ Unlimited animation & games</li>
              <li>✓ 4K exports – no watermark</li>
              <li>✓ All future engines & updates</li>
            </ul>
            <a href="mailto:wolfteamstudios21@gmail.com?subject=Lifetime%20Creator" data-testid="button-pricing-creator">
              <Button className="w-full bg-blue-500 hover:bg-blue-600">
                <Mail className="w-4 h-4 mr-2" />
                Go Creator
              </Button>
            </a>
          </div>

          {/* LIFETIME INDIE */}
          <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold mb-4">Lifetime Indie</h3>
            <p className="text-4xl font-black mb-1">$2,997</p>
            <p className="text-sm text-muted-foreground mb-6">one-time</p>
            <ul className="space-y-3 text-sm mb-8 text-muted-foreground">
              <li>✓ Everything in Creator forever</li>
              <li>✓ All future updates</li>
              <li>✓ First 250 slots only</li>
            </ul>
            <a href="mailto:wolfteamstudios21@gmail.com?subject=Lifetime%20Indie%20Slot" data-testid="button-pricing-lifetime">
              <Button className="w-full bg-white text-black hover:bg-gray-100">
                Claim Slot (247 left)
              </Button>
            </a>
          </div>
        </div>

        {/* Enterprise CTA */}
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <p className="text-xl font-semibold mb-4">Need Studio / Defense / On-Prem?</p>
          <a href="mailto:wolfteamstudios21@gmail.com" className="text-blue-500 text-lg font-semibold hover:underline">
            wolfteamstudios21@gmail.com
          </a>
          <p className="mt-6 text-sm text-muted-foreground">
            Join 300+ creators →{" "}
            <a href="https://discord.gg/TtfHgfCQMY" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
              discord.gg/TtfHgfCQMY
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
