import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Image, GitFork, Share2, QrCode, Lock, Globe, ExternalLink, Copy, Plus } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface GalleryItem {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  description: string | null;
  thumbnail: string | null;
  is_public: boolean;
  remix_count: number;
  remixed_from: string | null;
  seed: number;
  refs: string[];
  license: "private" | "cc-by" | "cc-by-nc" | "commercial";
  created_at: number;
  canRemix: boolean;
}

interface GalleryResponse {
  galleries: GalleryItem[];
  total: number;
  limit: number;
  offset: number;
}

const LICENSE_LABELS: Record<string, { label: string; color: string }> = {
  "private": { label: "Private", color: "bg-zinc-600" },
  "cc-by": { label: "CC-BY", color: "bg-green-600" },
  "cc-by-nc": { label: "CC-BY-NC", color: "bg-blue-600" },
  "commercial": { label: "Commercial", color: "bg-purple-600" }
};

export default function GalleryPage() {
  const [tab, setTab] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addProjectId, setAddProjectId] = useState("");
  const [addName, setAddName] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addIsPublic, setAddIsPublic] = useState(false);
  const [addLicense, setAddLicense] = useState("private");
  const { toast } = useToast();

  const username = "demo-user"; // In production, get from auth context

  const { data: galleryData, isLoading } = useQuery<GalleryResponse>({
    queryKey: ["/v5/gallery", tab],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (tab === "public") params.set("publicOnly", "true");
      if (tab === "mine") params.set("userId", username);
      const res = await fetch(`/v5/gallery?${params.toString()}`, {
        headers: { "x-username": username }
      });
      if (!res.ok) throw new Error("Failed to fetch gallery");
      return res.json();
    }
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/v5/gallery", {
        projectId: addProjectId,
        name: addName,
        description: addDescription,
        isPublic: addIsPublic,
        license: addLicense
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/v5/gallery"] });
      setShowAddDialog(false);
      setAddProjectId("");
      setAddName("");
      setAddDescription("");
      toast({ title: "Added to gallery", description: "Your project is now in the gallery" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add", description: error.message, variant: "destructive" });
    }
  });

  const remixMutation = useMutation({
    mutationFn: async (galleryId: string) => {
      const res = await apiRequest("POST", `/v5/gallery/${galleryId}/remix`, {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/v5/gallery"] });
      toast({ 
        title: "Remixed!", 
        description: `New project created: ${data.remix.name}. Seed: ${data.remix.seed}` 
      });
    },
    onError: (error: Error) => {
      toast({ title: "Remix failed", description: error.message, variant: "destructive" });
    }
  });

  const shareMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const res = await apiRequest("POST", `/v5/projects/${projectId}/link`, {
        username,
        expiresInDays: 30,
        license: "cc-by"
      });
      return res.json();
    },
    onSuccess: (data) => {
      navigator.clipboard.writeText(data.link);
      toast({ 
        title: "Link copied!", 
        description: `Share link: ${data.link}` 
      });
    },
    onError: (error: Error) => {
      toast({ title: "Share failed", description: error.message, variant: "destructive" });
    }
  });

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-gallery-title">
            <Image className="w-6 h-6" />
            Gallery
          </h1>
          <p className="text-muted-foreground">Browse and remix community creations</p>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-to-gallery">
              <Plus className="w-4 h-4 mr-2" />
              Add to Gallery
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Project to Gallery</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                placeholder="Project ID"
                value={addProjectId}
                onChange={(e) => setAddProjectId(e.target.value)}
                data-testid="input-project-id"
              />
              <Input
                placeholder="Gallery Name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                data-testid="input-gallery-name"
              />
              <Input
                placeholder="Description (optional)"
                value={addDescription}
                onChange={(e) => setAddDescription(e.target.value)}
                data-testid="input-gallery-description"
              />
              <div className="flex items-center justify-between">
                <span className="text-sm">Make public</span>
                <Switch 
                  checked={addIsPublic} 
                  onCheckedChange={setAddIsPublic}
                  data-testid="switch-public"
                />
              </div>
              <Select value={addLicense} onValueChange={setAddLicense}>
                <SelectTrigger data-testid="select-license">
                  <SelectValue placeholder="License" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private (No remixes)</SelectItem>
                  <SelectItem value="cc-by">CC-BY (Remix with credit)</SelectItem>
                  <SelectItem value="cc-by-nc">CC-BY-NC (Non-commercial)</SelectItem>
                  <SelectItem value="commercial">Commercial (Full rights)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button 
                onClick={() => addMutation.mutate()}
                disabled={!addProjectId || addMutation.isPending}
                data-testid="button-confirm-add"
              >
                {addMutation.isPending ? "Adding..." : "Add to Gallery"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
          <TabsTrigger value="public" data-testid="tab-public">Public</TabsTrigger>
          <TabsTrigger value="mine" data-testid="tab-mine">My Gallery</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <Skeleton className="h-40 w-full" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : galleryData?.galleries.length === 0 ? (
        <Card className="p-8 text-center">
          <Image className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No gallery items yet</h3>
          <p className="text-muted-foreground mb-4">Add your first project to the gallery to get started</p>
          <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-first">
            <Plus className="w-4 h-4 mr-2" />
            Add Project
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {galleryData?.galleries.map((item) => (
            <Card key={item.id} className="overflow-hidden hover-elevate" data-testid={`card-gallery-${item.id}`}>
              <div className="h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative">
                {item.thumbnail ? (
                  <img 
                    src={item.thumbnail} 
                    alt={item.name} 
                    className="w-full h-full object-cover"
                    data-testid={`img-thumbnail-${item.id}`}
                  />
                ) : (
                  <Image className="w-12 h-12 text-muted-foreground" />
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  <Badge className={LICENSE_LABELS[item.license]?.color || "bg-zinc-600"}>
                    {LICENSE_LABELS[item.license]?.label || item.license}
                  </Badge>
                  {item.is_public ? (
                    <Badge variant="outline" className="bg-background/80">
                      <Globe className="w-3 h-3" />
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-background/80">
                      <Lock className="w-3 h-3" />
                    </Badge>
                  )}
                </div>
              </div>
              
              <CardContent className="p-4">
                <h3 className="font-semibold truncate" data-testid={`text-name-${item.id}`}>
                  {item.name}
                </h3>
                <p className="text-sm text-muted-foreground truncate mb-3">
                  {item.description || `Seed: ${item.seed}`}
                </p>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                  <span>{item.refs.length} refs</span>
                  <span>{item.remix_count} remixes</span>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => remixMutation.mutate(item.id)}
                    disabled={!item.canRemix || remixMutation.isPending}
                    data-testid={`button-remix-${item.id}`}
                  >
                    <GitFork className="w-3 h-3 mr-1" />
                    Remix
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => shareMutation.mutate(item.project_id)}
                    disabled={shareMutation.isPending}
                    data-testid={`button-share-${item.id}`}
                  >
                    <Share2 className="w-3 h-3 mr-1" />
                    Share
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {galleryData && galleryData.total > galleryData.limit && (
        <div className="mt-6 text-center text-muted-foreground">
          Showing {galleryData.galleries.length} of {galleryData.total} items
        </div>
      )}
    </div>
  );
}
