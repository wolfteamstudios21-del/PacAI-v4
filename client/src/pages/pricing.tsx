import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Mail, Loader2, Check, Crown, Rocket, Building2, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

interface PriceData {
  product_id: string;
  product_name: string;
  description: string;
  metadata: { tier: string };
  price_id: string;
  unit_amount: number;
  currency: string;
  recurring: { interval: string } | null;
}

const TIER_FEATURES = {
  free: [
    "5 generations per week",
    "1 image reference",
    "720p exports (watermarked)",
    "Community support",
  ],
  creator: [
    "50 generations per month",
    "5 image references",
    "4K exports – no watermark",
    "All 9 engine exports",
    "Priority support",
  ],
  pro: [
    "200 generations per month",
    "20 image references",
    "4K exports – no watermark",
    "All 9 engine exports",
    "API access",
    "Priority support",
  ],
  lifetime: [
    "Unlimited generations forever",
    "Unlimited references",
    "All future updates included",
    "All engine exports",
    "Lifetime priority support",
  ],
  enterprise: [
    "Everything in Lifetime",
    "On-premise deployment",
    "Dedicated support",
    "Custom integrations",
    "SLA guarantee",
  ],
};

export default function Pricing() {
  const { toast } = useToast();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const sessionToken = localStorage.getItem("sessionToken");
  const currentTier = localStorage.getItem("userTier") || "free";

  const { data: pricesData } = useQuery<{ prices: PriceData[] }>({
    queryKey: ["/api/billing/prices"],
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ tier, priceId }: { tier: string; priceId: string }) => {
      const response = await apiRequest("POST", "/api/billing/create-checkout-session", {
        tier,
        priceId,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Checkout Error",
        description: error.message || "Failed to start checkout",
        variant: "destructive",
      });
      setLoadingTier(null);
    },
  });

  const handleUpgrade = (tier: string, priceId: string) => {
    if (!sessionToken) {
      toast({
        title: "Login Required",
        description: "Please login to upgrade your plan",
        variant: "destructive",
      });
      return;
    }

    setLoadingTier(tier);
    checkoutMutation.mutate({ tier, priceId });
  };

  const getPriceForTier = (tier: string): PriceData | undefined => {
    return pricesData?.prices?.find((p) => p.metadata?.tier === tier);
  };

  const creatorPrice = getPriceForTier("creator");
  const proPrice = getPriceForTier("pro");
  const lifetimePrice = getPriceForTier("lifetime");
  const enterprisePrice = getPriceForTier("enterprise");

  return (
    <div className="w-full h-full overflow-auto bg-gradient-to-br from-background to-muted/50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black mb-4" data-testid="text-pricing-title">
            PacAI v6.3 – Upgrade Your Plan
          </h1>
          <p className="text-xl text-muted-foreground">
            The final AI that builds full games & cinematics in seconds.
            <br />
            <span className="text-sm">
              Offline-first • Air-gapped • HSM licensed • 100% deterministic
            </span>
          </p>
          {currentTier !== "free" && (
            <Badge className="mt-4" variant="secondary" data-testid="badge-current-tier">
              Current Plan: {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
            </Badge>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-xl font-bold">Free</h3>
            </div>
            <p className="text-3xl font-black mb-1" data-testid="text-price-free">$0</p>
            <p className="text-sm text-muted-foreground mb-6">forever</p>
            <ul className="space-y-2 text-sm mb-6 text-muted-foreground">
              {TIER_FEATURES.free.map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              className="w-full"
              disabled
              data-testid="button-tier-free"
            >
              {currentTier === "free" ? "Current Plan" : "Free Forever"}
            </Button>
          </div>

          <div className="bg-card border-2 border-primary rounded-2xl p-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground px-3">MOST POPULAR</Badge>
            </div>
            <div className="flex items-center gap-2 mb-4 mt-2">
              <Rocket className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-bold">Creator</h3>
            </div>
            <p className="text-3xl font-black mb-1" data-testid="text-price-creator">
              ${creatorPrice ? (creatorPrice.unit_amount / 100).toFixed(0) : "9.99"}
            </p>
            <p className="text-sm text-muted-foreground mb-6">/month</p>
            <ul className="space-y-2 text-sm mb-6 text-muted-foreground">
              {TIER_FEATURES.creator.map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            {currentTier === "creator" ? (
              <Button variant="outline" className="w-full" disabled data-testid="button-tier-creator">
                Current Plan
              </Button>
            ) : creatorPrice ? (
              <Button
                className="w-full"
                onClick={() => handleUpgrade("creator", creatorPrice.price_id)}
                disabled={loadingTier !== null}
                data-testid="button-tier-creator"
              >
                {loadingTier === "creator" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Upgrade to Creator"
                )}
              </Button>
            ) : (
              <a href="mailto:wolfteamstudios21@gmail.com?subject=Creator%20Plan">
                <Button className="w-full" data-testid="button-tier-creator">
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Us
                </Button>
              </a>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="h-5 w-5 text-amber-500" />
              <h3 className="text-xl font-bold">Pro</h3>
            </div>
            <p className="text-3xl font-black mb-1" data-testid="text-price-pro">
              ${proPrice ? (proPrice.unit_amount / 100).toFixed(0) : "29.99"}
            </p>
            <p className="text-sm text-muted-foreground mb-6">/month</p>
            <ul className="space-y-2 text-sm mb-6 text-muted-foreground">
              {TIER_FEATURES.pro.map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            {currentTier === "pro" ? (
              <Button variant="outline" className="w-full" disabled data-testid="button-tier-pro">
                Current Plan
              </Button>
            ) : proPrice ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleUpgrade("pro", proPrice.price_id)}
                disabled={loadingTier !== null}
                data-testid="button-tier-pro"
              >
                {loadingTier === "pro" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Upgrade to Pro"
                )}
              </Button>
            ) : (
              <a href="mailto:wolfteamstudios21@gmail.com?subject=Pro%20Plan">
                <Button variant="outline" className="w-full" data-testid="button-tier-pro">
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Us
                </Button>
              </a>
            )}
          </div>

          <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/50 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="h-5 w-5 text-purple-400" />
              <h3 className="text-xl font-bold">Lifetime</h3>
            </div>
            <p className="text-3xl font-black mb-1" data-testid="text-price-lifetime">
              ${lifetimePrice ? (lifetimePrice.unit_amount / 100).toFixed(0) : "299.99"}
            </p>
            <p className="text-sm text-muted-foreground mb-6">one-time</p>
            <ul className="space-y-2 text-sm mb-6 text-muted-foreground">
              {TIER_FEATURES.lifetime.map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            {currentTier === "lifetime" ? (
              <Button variant="outline" className="w-full" disabled data-testid="button-tier-lifetime">
                Current Plan
              </Button>
            ) : lifetimePrice ? (
              <Button
                className="w-full bg-purple-600 hover:bg-purple-700"
                onClick={() => handleUpgrade("lifetime", lifetimePrice.price_id)}
                disabled={loadingTier !== null}
                data-testid="button-tier-lifetime"
              >
                {loadingTier === "lifetime" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Get Lifetime Access"
                )}
              </Button>
            ) : (
              <a href="mailto:wolfteamstudios21@gmail.com?subject=Lifetime%20Indie%20Slot">
                <Button className="w-full bg-purple-600 hover:bg-purple-700" data-testid="button-tier-lifetime">
                  Claim Slot
                </Button>
              </a>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Building2 className="h-6 w-6" />
            <p className="text-xl font-semibold">Enterprise / Defense / On-Prem?</p>
          </div>
          <p className="text-muted-foreground mb-4">
            Custom pricing for large organizations with dedicated support and on-premise deployment.
          </p>
          <a href="mailto:wolfteamstudios21@gmail.com?subject=Enterprise%20Inquiry">
            <Button variant="outline" data-testid="button-enterprise-contact">
              <Mail className="w-4 h-4 mr-2" />
              Contact Sales
            </Button>
          </a>
        </div>

        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            Join 300+ creators →{" "}
            <a
              href="https://discord.gg/TtfHgfCQMY"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              discord.gg/TtfHgfCQMY
            </a>
          </p>
          <Link href="/dashboard">
            <Button variant="ghost" data-testid="link-back-dashboard">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
