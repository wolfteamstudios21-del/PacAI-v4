import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

export default function PricingTiers() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-4">Pricing Plans</h2>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* FREE */}
        <Card>
          <CardHeader>
            <CardTitle>Free Forever</CardTitle>
            <CardDescription>Perfect to try</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-3xl font-black">$0</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span>1 demo/month</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span>720p exports</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span>Public access</span>
              </li>
            </ul>
            <a href="https://discord.gg/TtfHgfCQMY" target="_blank" rel="noopener noreferrer">
              <Button className="w-full" variant="outline" data-testid="button-tier-free">
                Get Started
              </Button>
            </a>
          </CardContent>
        </Card>

        {/* CREATOR (Popular) */}
        <Card className="border-blue-500/50 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-blue-500">Most Popular</Badge>
          </div>
          <CardHeader className="pt-6">
            <CardTitle>Creator</CardTitle>
            <CardDescription>Professional creators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-3xl font-black">$79</p>
              <p className="text-sm text-muted-foreground">/month</p>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span>Unlimited projects</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span>4K exports</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span>All engines</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span>Priority support</span>
              </li>
            </ul>
            <a href="mailto:wolfteamstudios21@gmail.com?subject=Creator%20Plan">
              <Button className="w-full bg-blue-600 hover:bg-blue-700" data-testid="button-tier-creator">
                Go Creator
              </Button>
            </a>
          </CardContent>
        </Card>

        {/* LIFETIME INDIE */}
        <Card className="border-purple-500/50 bg-gradient-to-br from-purple-900/20 to-blue-900/20">
          <CardHeader>
            <CardTitle>Lifetime Indie</CardTitle>
            <CardDescription>Limited offer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-3xl font-black">$2,997</p>
              <p className="text-sm text-muted-foreground">one-time payment</p>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span>Everything forever</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span>All future updates</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span>Lifetime support</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-yellow-500" />
                <span>247 slots remaining</span>
              </li>
            </ul>
            <a href="mailto:wolfteamstudios21@gmail.com?subject=Lifetime%20Indie%20Slot">
              <Button className="w-full bg-white text-black hover:bg-gray-100" data-testid="button-tier-lifetime">
                Claim Slot
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
