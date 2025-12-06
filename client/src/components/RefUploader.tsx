import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Upload, Link2, X, Image, Sparkles, AlertCircle } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Ref {
  id: string;
  user_id: string;
  url: string;
  thumbnail_url: string | null;
  type: "upload" | "link" | "gallery" | "other-ai";
  source: string | null;
  description: string | null;
  created_at: number;
}

interface RefsResponse {
  refs: Ref[];
  count: number;
  limit: number;
  refsPerGeneration: number;
  tier: string;
}

interface RefUploaderProps {
  username: string;
  selectedRefs: string[];
  onRefsChange: (refIds: string[]) => void;
  maxRefs?: number;
}

export default function RefUploader({ 
  username, 
  selectedRefs, 
  onRefsChange,
  maxRefs = 10 
}: RefUploaderProps) {
  const [linkUrl, setLinkUrl] = useState("");
  const [linkDescription, setLinkDescription] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const { data: refsData, isLoading } = useQuery<RefsResponse>({
    queryKey: ["/v5/refs", username],
    queryFn: async () => {
      const res = await fetch(`/v5/refs?username=${encodeURIComponent(username)}`);
      if (!res.ok) throw new Error("Failed to fetch refs");
      return res.json();
    },
    enabled: !!username,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("username", username);
      formData.append("type", "upload");
      
      const res = await fetch("/v5/refs/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Upload failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/v5/refs", username] });
      toast({ title: "Reference uploaded", description: "Image ready to use in generation" });
      if (selectedRefs.length < maxRefs) {
        onRefsChange([...selectedRefs, data.refId]);
      }
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const linkMutation = useMutation({
    mutationFn: async ({ url, description }: { url: string; description: string }) => {
      const res = await apiRequest("POST", "/v5/refs/link", {
        url,
        username,
        type: "link",
        description,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/v5/refs", username] });
      setLinkUrl("");
      setLinkDescription("");
      toast({ title: "Reference linked", description: "External image added" });
      if (selectedRefs.length < maxRefs) {
        onRefsChange([...selectedRefs, data.refId]);
      }
    },
    onError: (error: Error) => {
      toast({ title: "Link failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (refId: string) => {
      const res = await fetch(`/v5/refs/${refId}`, {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          "x-username": username 
        },
      });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: (_, refId) => {
      queryClient.invalidateQueries({ queryKey: ["/v5/refs", username] });
      onRefsChange(selectedRefs.filter(id => id !== refId));
      toast({ title: "Reference deleted" });
    },
  });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(f => f.type.startsWith("image/"));
    
    if (imageFile) {
      uploadMutation.mutate(imageFile);
    } else {
      toast({ title: "Invalid file", description: "Please drop an image file", variant: "destructive" });
    }
  }, [uploadMutation, toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (linkUrl.trim()) {
      linkMutation.mutate({ url: linkUrl.trim(), description: linkDescription.trim() });
    }
  };

  const toggleRef = (refId: string) => {
    if (selectedRefs.includes(refId)) {
      onRefsChange(selectedRefs.filter(id => id !== refId));
    } else if (selectedRefs.length < maxRefs) {
      onRefsChange([...selectedRefs, refId]);
    } else {
      toast({ 
        title: "Limit reached", 
        description: `Maximum ${maxRefs} refs per generation`,
        variant: "destructive" 
      });
    }
  };

  const refsPerGen = refsData?.refsPerGeneration || 1;
  const effectiveMaxRefs = Math.min(maxRefs, refsPerGen);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Image className="w-4 h-4" />
              Style References
            </CardTitle>
            <CardDescription className="text-xs">
              Add concept art to influence generation
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            {selectedRefs.length}/{effectiveMaxRefs} selected
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragging ? "border-blue-500 bg-blue-500/10" : "border-muted-foreground/25"
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          data-testid="dropzone-ref-upload"
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-2">
            Drop concept art here or click to upload
          </p>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            id="ref-file-input"
            onChange={handleFileSelect}
            data-testid="input-ref-file"
          />
          <label htmlFor="ref-file-input">
            <Button 
              variant="outline" 
              size="sm" 
              className="cursor-pointer"
              disabled={uploadMutation.isPending}
              asChild
            >
              <span>
                {uploadMutation.isPending ? "Uploading..." : "Choose File"}
              </span>
            </Button>
          </label>
          <p className="text-xs text-muted-foreground mt-2">PNG, JPG, WebP, GIF • Max 2MB</p>
        </div>

        <form onSubmit={handleLinkSubmit} className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Paste image URL (Midjourney, DALL-E, etc.)"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="flex-1"
              data-testid="input-ref-link"
            />
            <Button 
              type="submit" 
              size="sm"
              disabled={!linkUrl.trim() || linkMutation.isPending}
              data-testid="button-add-link"
            >
              <Link2 className="w-4 h-4" />
            </Button>
          </div>
          <Input
            placeholder="Description (optional)"
            value={linkDescription}
            onChange={(e) => setLinkDescription(e.target.value)}
            className="text-xs"
            data-testid="input-ref-description"
          />
        </form>

        {isLoading ? (
          <div className="text-center text-sm text-muted-foreground py-4">Loading refs...</div>
        ) : refsData?.refs && refsData.refs.length > 0 ? (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground flex items-center justify-between">
              <span>Your References ({refsData.count}/{refsData.limit})</span>
              {refsData.tier === "free" && (
                <span className="flex items-center gap-1 text-orange-500">
                  <AlertCircle className="w-3 h-3" />
                  Free: {refsPerGen} ref/gen
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {refsData.refs.map((ref) => (
                <div
                  key={ref.id}
                  className={`relative group rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                    selectedRefs.includes(ref.id)
                      ? "border-blue-500 ring-2 ring-blue-500/30"
                      : "border-transparent hover:border-muted-foreground/50"
                  }`}
                  onClick={() => toggleRef(ref.id)}
                  data-testid={`ref-item-${ref.id}`}
                >
                  <img
                    src={ref.thumbnail_url || ref.url}
                    alt={ref.description || "Reference"}
                    className="w-full aspect-square object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23333' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' fill='%23666' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E";
                    }}
                  />
                  {selectedRefs.includes(ref.id) && (
                    <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-blue-400" />
                    </div>
                  )}
                  {ref.source && (
                    <Badge className="absolute bottom-1 left-1 text-[10px] px-1 py-0">
                      {ref.source}
                    </Badge>
                  )}
                  <button
                    className="absolute top-1 right-1 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate(ref.id);
                    }}
                    data-testid={`button-delete-ref-${ref.id}`}
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center text-sm text-muted-foreground py-4">
            No references yet. Upload or link your first concept art!
          </div>
        )}

        {selectedRefs.length > 0 && (
          <div className="text-xs text-blue-500 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {selectedRefs.length} reference{selectedRefs.length > 1 ? "s" : ""} will influence generation style
          </div>
        )}
      </CardContent>
    </Card>
  );
}
