import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Car, Sword, Bug, GitFork, Sparkles, CreditCard, Shield, Loader2, ExternalLink } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

interface GalleryItem {
  id: string;
  kind: "vehicle" | "weapon" | "creature";
  title: string;
  tags: string[];
  license: "cc0" | "cc-by" | "commercial";
  owner: string;
  imageBase64?: string;
  meta: Record<string, any>;
  createdAt: number;
}

interface GalleryResponse {
  success: boolean;
  count: number;
  items: GalleryItem[];
}

const KIND_ICONS: Record<string, typeof Car> = {
  vehicle: Car,
  weapon: Sword,
  creature: Bug,
};

const KIND_COLORS: Record<string, string> = {
  vehicle: "bg-blue-600",
  weapon: "bg-red-600",
  creature: "bg-green-600",
};

const LICENSE_BADGES: Record<string, { label: string; color: string }> = {
  cc0: { label: "CC0", color: "bg-emerald-600" },
  "cc-by": { label: "CC-BY", color: "bg-sky-600" },
  commercial: { label: "Commercial", color: "bg-purple-600" },
};

export default function AssetGalleryPage() {
  const [activeKind, setActiveKind] = useState<string>("all");
  const [forkDialogOpen, setForkDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [projectId, setProjectId] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const user = JSON.parse(localStorage.getItem("pacai_user") || "{}");
  const isDevTeam = ["WolfTeamstudio2", "AdminTeam15"].includes(user?.name);

  const { data: galleryData, isLoading, refetch } = useQuery<GalleryResponse>({
    queryKey: ["/v6/gallery", activeKind],
    queryFn: async () => {
      const params = activeKind !== "all" ? `?kind=${activeKind}` : "";
      const res = await fetch(`${API_BASE_URL}/v6/gallery${params}`);
      if (!res.ok) throw new Error("Failed to fetch gallery");
      return res.json();
    },
  });

  const forkMutation = useMutation({
    mutationFn: async ({ itemId, projectId }: { itemId: string; projectId: string }) => {
      const res = await fetch(`${API_BASE_URL}/v6/gallery/fork/${itemId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          username: user?.name || "anonymous",
          password: localStorage.getItem("DEV_BYPASS_PASSWORD") || undefined,
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.requiresPayment && data.checkoutUrl) {
        setCheckoutUrl(data.checkoutUrl);
        toast({
          title: "Payment required",
          description: "Redirecting to Stripe checkout...",
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/v6/gallery"] });
        setForkDialogOpen(false);
        setCheckoutUrl(null);
        toast({
          title: "Forked successfully!",
          description: `Asset forked to project ${projectId}${data.charged === 0 ? " (Dev team - free)" : ""}`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Fork failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const autofillMutation = useMutation({
    mutationFn: async ({ kind, prompt, title }: { kind: string; prompt: string; title: string }) => {
      const res = await fetch(`${API_BASE_URL}/v6/gallery/autofill/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          title,
          username: user?.name || "anonymous",
          password: localStorage.getItem("DEV_BYPASS_PASSWORD") || undefined,
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.requiresPayment && data.checkoutUrl) {
        setCheckoutUrl(data.checkoutUrl);
        toast({
          title: "Payment required",
          description: "Redirecting to Stripe checkout...",
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/v6/gallery"] });
        toast({
          title: "Asset generated!",
          description: `New ${data.item?.kind} added to gallery`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Generation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFork = (item: GalleryItem) => {
    setSelectedItem(item);
    setForkDialogOpen(true);
  };

  const confirmFork = () => {
    if (!selectedItem || !projectId) return;
    forkMutation.mutate({ itemId: selectedItem.id, projectId });
  };

  const generateAsset = (kind: string) => {
    const prompts: Record<string, string> = {
      vehicle: "futuristic military transport with hover capabilities",
      weapon: "plasma rifle with energy cells",
      creature: "armored jungle predator with camouflage",
    };
    autofillMutation.mutate({
      kind,
      prompt: prompts[kind] || "default asset",
      title: `Generated ${kind.charAt(0).toUpperCase() + kind.slice(1)}`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0d0f] to-[#141517] text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500" data-testid="text-gallery-title">
            PacAI Asset Gallery
          </h1>
          <p className="text-xl text-[#9aa0a6] mb-2">
            Browse vehicles, weapons, and creatures.
          </p>
          <p className="text-lg">
            Fork any asset to your project for{" "}
            <span className="text-[#3e73ff] font-bold">$0.50</span>
            {isDevTeam && (
              <Badge className="ml-2 bg-emerald-600">
                <Shield className="w-3 h-3 mr-1" />
                Dev Team - Free
              </Badge>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <Tabs value={activeKind} onValueChange={setActiveKind}>
            <TabsList className="bg-[#1f2125]">
              <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
              <TabsTrigger value="vehicle" data-testid="tab-vehicles">
                <Car className="w-4 h-4 mr-1" />
                Vehicles
              </TabsTrigger>
              <TabsTrigger value="weapon" data-testid="tab-weapons">
                <Sword className="w-4 h-4 mr-1" />
                Weapons
              </TabsTrigger>
              <TabsTrigger value="creature" data-testid="tab-creatures">
                <Bug className="w-4 h-4 mr-1" />
                Creatures
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => generateAsset("vehicle")}
              disabled={autofillMutation.isPending}
              data-testid="button-generate-vehicle"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Vehicle
            </Button>
            <Button
              variant="outline"
              onClick={() => generateAsset("weapon")}
              disabled={autofillMutation.isPending}
              data-testid="button-generate-weapon"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Weapon
            </Button>
            <Button
              variant="outline"
              onClick={() => generateAsset("creature")}
              disabled={autofillMutation.isPending}
              data-testid="button-generate-creature"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Creature
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i} className="bg-[#141517] border-[#2a2d33]">
                <Skeleton className="h-48 w-full bg-[#1f2125]" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4 bg-[#1f2125]" />
                  <Skeleton className="h-3 w-1/2 bg-[#1f2125]" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : galleryData?.items.length === 0 ? (
          <Card className="bg-[#141517] border-[#2a2d33] p-12 text-center">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-[#3e73ff]" />
            <h3 className="text-2xl font-bold mb-2">Gallery is empty</h3>
            <p className="text-[#9aa0a6] mb-6">Generate your first assets to populate the gallery</p>
            <div className="flex justify-center gap-3">
              <Button onClick={() => generateAsset("vehicle")} data-testid="button-first-vehicle">
                <Car className="w-4 h-4 mr-2" />
                Generate Vehicle
              </Button>
              <Button onClick={() => generateAsset("weapon")} variant="secondary" data-testid="button-first-weapon">
                <Sword className="w-4 h-4 mr-2" />
                Generate Weapon
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {galleryData?.items.map((item) => {
              const KindIcon = KIND_ICONS[item.kind] || Car;
              return (
                <Card
                  key={item.id}
                  className="bg-[#141517] border-[#2a2d33] overflow-hidden hover-elevate group"
                  data-testid={`card-asset-${item.id}`}
                >
                  <div className="h-48 bg-[#0b0d0f] flex items-center justify-center relative">
                    {item.imageBase64 ? (
                      <img
                        src={`data:image/svg+xml;base64,${item.imageBase64}`}
                        alt={item.title}
                        className="w-full h-full object-contain p-4"
                        data-testid={`img-asset-${item.id}`}
                      />
                    ) : (
                      <KindIcon className="w-20 h-20 text-[#3e73ff]/50" />
                    )}
                    <div className="absolute top-2 left-2">
                      <Badge className={`${KIND_COLORS[item.kind]} text-xs`}>
                        <KindIcon className="w-3 h-3 mr-1" />
                        {item.kind}
                      </Badge>
                    </div>
                    <div className="absolute top-2 right-2">
                      <Badge className={LICENSE_BADGES[item.license]?.color || "bg-zinc-600"}>
                        {LICENSE_BADGES[item.license]?.label || item.license}
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <h3 className="font-bold text-lg truncate mb-1" data-testid={`text-title-${item.id}`}>
                      {item.title}
                    </h3>
                    <p className="text-xs text-[#9aa0a6] mb-3">
                      Owner: {item.owner} | {new Date(item.createdAt).toLocaleDateString()}
                    </p>

                    <div className="flex flex-wrap gap-1 mb-4">
                      {item.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs bg-[#1f2125] border-[#2a2d33]">
                          {tag}
                        </Badge>
                      ))}
                      {item.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs bg-[#1f2125] border-[#2a2d33]">
                          +{item.tags.length - 3}
                        </Badge>
                      )}
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => handleFork(item)}
                      disabled={forkMutation.isPending}
                      data-testid={`button-fork-${item.id}`}
                    >
                      <GitFork className="w-4 h-4 mr-2" />
                      Fork to Project
                      {!isDevTeam && (
                        <span className="ml-2 text-xs opacity-75">$0.50</span>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {galleryData && galleryData.count > 0 && (
          <div className="mt-8 text-center text-[#9aa0a6]">
            Showing {galleryData.items.length} assets
          </div>
        )}
      </div>

      <Dialog open={forkDialogOpen} onOpenChange={setForkDialogOpen}>
        <DialogContent className="bg-[#141517] border-[#2a2d33] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitFork className="w-5 h-5" />
              Fork Asset to Project
            </DialogTitle>
          </DialogHeader>

          {checkoutUrl ? (
            <div className="py-6 text-center">
              <CreditCard className="w-16 h-16 mx-auto mb-4 text-[#3e73ff]" />
              <p className="mb-4">Payment required: $0.50</p>
              <Button asChild>
                <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" data-testid="link-checkout">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Continue to Checkout
                </a>
              </Button>
            </div>
          ) : (
            <>
              <div className="py-4 space-y-4">
                {selectedItem && (
                  <div className="bg-[#0b0d0f] rounded-lg p-4">
                    <p className="font-semibold">{selectedItem.title}</p>
                    <p className="text-sm text-[#9aa0a6]">
                      {selectedItem.kind} | {selectedItem.license}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-sm text-[#9aa0a6] mb-2 block">
                    Target Project ID
                  </label>
                  <Input
                    placeholder="Enter project ID"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="bg-[#0b0d0f] border-[#2a2d33]"
                    data-testid="input-project-id"
                  />
                </div>

                <div className="bg-[#1f2125] rounded-lg p-4 flex items-center justify-between">
                  <span>Fork Cost</span>
                  <span className="font-bold text-lg">
                    {isDevTeam ? (
                      <span className="text-emerald-400">$0.00 (Dev)</span>
                    ) : (
                      <span className="text-[#3e73ff]">$0.50</span>
                    )}
                  </span>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setForkDialogOpen(false)}
                  data-testid="button-cancel-fork"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmFork}
                  disabled={!projectId || forkMutation.isPending}
                  data-testid="button-confirm-fork"
                >
                  {forkMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <GitFork className="w-4 h-4 mr-2" />
                      Confirm Fork
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
