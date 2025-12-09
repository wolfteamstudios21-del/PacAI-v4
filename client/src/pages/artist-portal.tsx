import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, DollarSign, TrendingUp, Award, Image as ImageIcon, Sparkles } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ArtistRef {
  id: string;
  user_id: string;
  artist_name: string;
  image_url: string;
  thumbnail_url: string | null;
  title: string;
  description: string | null;
  royalty_percent: number;
  license: string;
  total_earned: number;
  usage_count: number;
  is_featured: boolean;
  created_at: number;
}

interface ArtistStats {
  total_earned: number;
  total_earned_formatted: string;
  total_uses: number;
  ref_count: number;
  refs: ArtistRef[];
}

interface LeaderboardEntry {
  user_id: string;
  artist_name: string;
  total_earned: number;
  total_earned_formatted: string;
  total_uses: number;
  ref_count: number;
}

const LICENSE_LABELS: Record<string, string> = {
  "cc-by": "CC-BY (Attribution)",
  "cc-by-nc": "CC-BY-NC (Non-Commercial)",
  "commercial": "Commercial Use Allowed",
  "pacai-exclusive": "PacAI Exclusive",
};

export default function ArtistPortal({ username }: { username: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [royaltyPercent, setRoyaltyPercent] = useState("30");
  const [license, setLicense] = useState("commercial");
  const [artistName, setArtistName] = useState(`@${username}`);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<ArtistStats>({
    queryKey: ["/v5/artist/stats", username],
    queryFn: async () => {
      const res = await fetch(`/v5/artist/stats?username=${username}`, {
        headers: { "x-username": username },
      });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery<{ leaderboard: LeaderboardEntry[] }>({
    queryKey: ["/v5/artist/leaderboard"],
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file selected");
      if (!title.trim()) throw new Error("Title is required");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("username", username);
      formData.append("title", title);
      formData.append("description", description);
      formData.append("royaltyPercent", royaltyPercent);
      formData.append("license", license);
      formData.append("artistName", artistName);

      const res = await fetch("/v5/refs/artist", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/v5/artist/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/v5/artist/leaderboard"] });
      setFile(null);
      setTitle("");
      setDescription("");
      setPreviewUrl(null);
      toast({
        title: "Art uploaded!",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(selectedFile);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl p-8 text-white">
        <h1 className="text-5xl font-black mb-4" data-testid="text-artist-portal-title">
          Earn Money with Your Art on PacAI
        </h1>
        <p className="text-xl mb-8 opacity-90">
          Every time a game developer uses your concept art to generate a world, you get paid — automatically.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white/10 rounded-xl p-6 text-center backdrop-blur-sm">
            <div className="text-4xl font-black mb-2">30%</div>
            <div className="opacity-80">Revenue Share</div>
          </div>
          <div className="bg-white/10 rounded-xl p-6 text-center backdrop-blur-sm">
            <div className="text-4xl font-black mb-2">$0</div>
            <div className="opacity-80">Upfront Cost</div>
          </div>
          <div className="bg-white/10 rounded-xl p-6 text-center backdrop-blur-sm">
            <div className="text-4xl font-black mb-2">Forever</div>
            <div className="opacity-80">Credits in Every Game</div>
          </div>
        </div>
      </div>

      {statsLoading ? (
        <div className="grid md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : stats && (
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="bg-[#141517] border-[#2a2d33]">
            <CardContent className="p-6 flex items-center gap-4">
              <DollarSign className="w-10 h-10 text-green-500" />
              <div>
                <p className="text-2xl font-black text-white" data-testid="text-total-earned">
                  {stats.total_earned_formatted}
                </p>
                <p className="text-[#9aa0a6] text-sm">Total Earned</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#141517] border-[#2a2d33]">
            <CardContent className="p-6 flex items-center gap-4">
              <TrendingUp className="w-10 h-10 text-[#3e73ff]" />
              <div>
                <p className="text-2xl font-black text-white" data-testid="text-total-uses">
                  {stats.total_uses}
                </p>
                <p className="text-[#9aa0a6] text-sm">Times Used</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#141517] border-[#2a2d33]">
            <CardContent className="p-6 flex items-center gap-4">
              <ImageIcon className="w-10 h-10 text-purple-500" />
              <div>
                <p className="text-2xl font-black text-white" data-testid="text-ref-count">
                  {stats.ref_count}
                </p>
                <p className="text-[#9aa0a6] text-sm">Art Pieces</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#141517] border-[#2a2d33]">
            <CardContent className="p-6 flex items-center gap-4">
              <Sparkles className="w-10 h-10 text-yellow-500" />
              <div>
                <p className="text-2xl font-black text-white">
                  ${stats.total_uses > 0 ? ((stats.total_earned / stats.total_uses) / 100).toFixed(2) : "0.00"}
                </p>
                <p className="text-[#9aa0a6] text-sm">Avg Per Use</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="bg-[#141517] border-[#2a2d33]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Your Art
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                previewUrl ? "border-[#3e73ff]" : "border-[#2a2d33] hover:border-[#3e73ff]"
              }`}
              onClick={() => document.getElementById("artist-file-input")?.click()}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
              ) : (
                <div className="text-[#9aa0a6]">
                  <Upload className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Click to upload your concept art</p>
                  <p className="text-sm opacity-70">PNG, JPG, WebP up to 5MB</p>
                </div>
              )}
            </div>
            <input
              id="artist-file-input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFileChange}
              data-testid="input-artist-file"
            />

            <Input
              placeholder="Title (required)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-[#1f2125] border-[#2a2d33] text-white"
              data-testid="input-artist-title"
            />

            <Input
              placeholder="Artist name (e.g., @YourName)"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              className="bg-[#1f2125] border-[#2a2d33] text-white"
              data-testid="input-artist-name"
            />

            <Textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-[#1f2125] border-[#2a2d33] text-white min-h-[80px]"
              data-testid="input-artist-description"
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[#9aa0a6] mb-1 block">Royalty %</label>
                <Select value={royaltyPercent} onValueChange={setRoyaltyPercent}>
                  <SelectTrigger className="bg-[#1f2125] border-[#2a2d33] text-white" data-testid="select-royalty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10%</SelectItem>
                    <SelectItem value="20">20%</SelectItem>
                    <SelectItem value="30">30%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-[#9aa0a6] mb-1 block">License</label>
                <Select value={license} onValueChange={setLicense}>
                  <SelectTrigger className="bg-[#1f2125] border-[#2a2d33] text-white" data-testid="select-license">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cc-by">CC-BY</SelectItem>
                    <SelectItem value="cc-by-nc">CC-BY-NC</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="pacai-exclusive">PacAI Exclusive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={() => uploadMutation.mutate()}
              disabled={!file || !title.trim() || uploadMutation.isPending}
              className="w-full py-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-lg font-bold"
              data-testid="button-upload-art"
            >
              {uploadMutation.isPending ? "Uploading..." : "Upload & Start Earning"}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-[#141517] border-[#2a2d33]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              Top Artists This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leaderboardLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : leaderboard?.leaderboard && leaderboard.leaderboard.length > 0 ? (
              <div className="space-y-3">
                {leaderboard.leaderboard.map((entry, i) => (
                  <div
                    key={entry.user_id}
                    className={`flex items-center justify-between p-4 rounded-lg ${
                      i === 0
                        ? "bg-gradient-to-r from-yellow-900/30 to-amber-900/30 border border-yellow-600/30"
                        : i === 1
                        ? "bg-gradient-to-r from-gray-700/30 to-gray-600/30 border border-gray-500/30"
                        : i === 2
                        ? "bg-gradient-to-r from-orange-900/30 to-amber-900/30 border border-orange-600/30"
                        : "bg-[#1f2125]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-black text-[#9aa0a6] w-8">#{i + 1}</span>
                      <div>
                        <p className="font-bold text-white">{entry.artist_name}</p>
                        <p className="text-sm text-[#9aa0a6]">
                          {entry.ref_count} pieces / {entry.total_uses} uses
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-green-400">{entry.total_earned_formatted}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-[#9aa0a6]">
                <Award className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-bold mb-2">No artists yet!</p>
                <p>Be the first to upload art and earn royalties.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {stats && stats.refs.length > 0 && (
        <Card className="bg-[#141517] border-[#2a2d33]">
          <CardHeader>
            <CardTitle className="text-white">Your Art Portfolio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
              {stats.refs.map((ref) => (
                <div key={ref.id} className="bg-[#1f2125] rounded-xl overflow-hidden">
                  <img
                    src={ref.image_url}
                    alt={ref.title}
                    className="w-full h-40 object-cover"
                  />
                  <div className="p-4">
                    <h4 className="font-bold text-white truncate">{ref.title}</h4>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {ref.royalty_percent}% royalty
                      </Badge>
                      <span className="text-green-400 font-bold text-sm">
                        ${(ref.total_earned / 100).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-[#9aa0a6] mt-2">
                      {ref.usage_count} uses / {LICENSE_LABELS[ref.license] || ref.license}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
