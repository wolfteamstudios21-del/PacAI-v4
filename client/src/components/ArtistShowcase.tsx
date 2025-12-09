import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Palette, Mail, Globe, Twitter, MessageCircle, ExternalLink } from "lucide-react";

interface PublicArtwork {
  id: string;
  artist_name: string;
  title: string;
  description: string | null;
  image_url: string;
  thumbnail_url: string | null;
  license: string;
  usage_count: number;
  contact_email: string | null;
  contact_website: string | null;
  contact_twitter: string | null;
  contact_discord: string | null;
}

interface ShowcaseResponse {
  gallery: PublicArtwork[];
  total: number;
}

const LICENSE_LABELS: Record<string, string> = {
  "cc-by": "CC-BY",
  "cc-by-nc": "CC-BY-NC",
  "commercial": "Commercial",
  "pacai-exclusive": "Exclusive",
};

interface ArtistShowcaseProps {
  maxItems?: number;
  title?: string;
  showContactInfo?: boolean;
}

export default function ArtistShowcase({ 
  maxItems = 6, 
  title = "Featured Artists",
  showContactInfo = true 
}: ArtistShowcaseProps) {
  const { data, isLoading } = useQuery<ShowcaseResponse>({
    queryKey: ["/v5/artist/showcase"],
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-6 h-6 text-purple-500" />
          <h3 className="text-2xl font-bold text-white">{title}</h3>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const artworks = data?.gallery?.slice(0, maxItems) || [];

  if (artworks.length === 0) {
    return (
      <div className="bg-[#141517] rounded-2xl p-8 border border-[#2a2d33] text-center">
        <Palette className="w-16 h-16 mx-auto mb-4 text-purple-500 opacity-50" />
        <h3 className="text-xl font-bold text-white mb-2">Artist Showcase Coming Soon</h3>
        <p className="text-[#9aa0a6]">
          Artists can upload their concept art and opt-in to public showcase.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Palette className="w-6 h-6 text-purple-500" />
          <h3 className="text-2xl font-bold text-white">{title}</h3>
        </div>
        <Badge className="bg-purple-600/20 text-purple-300 border-purple-500/30">
          {data?.total || 0} Artists
        </Badge>
      </div>
      
      <div className="grid md:grid-cols-3 gap-4">
        {artworks.map((art) => (
          <Card 
            key={art.id} 
            className="bg-[#141517] border-[#2a2d33] overflow-hidden group hover:border-purple-500/50 transition-all"
            data-testid={`card-showcase-${art.id}`}
          >
            <div className="relative aspect-video overflow-hidden">
              <img
                src={art.thumbnail_url || art.image_url}
                alt={art.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-2 left-2 right-2">
                <Badge className="bg-[#1f2125]/80 text-white border-0">
                  {LICENSE_LABELS[art.license] || art.license}
                </Badge>
              </div>
            </div>
            <CardContent className="p-4">
              <h4 className="font-bold text-white mb-1 truncate" data-testid={`text-showcase-title-${art.id}`}>
                {art.title}
              </h4>
              <p className="text-sm text-purple-400 mb-2" data-testid={`text-showcase-artist-${art.id}`}>
                {art.artist_name}
              </p>
              {art.description && (
                <p className="text-xs text-[#9aa0a6] line-clamp-2 mb-3">
                  {art.description}
                </p>
              )}
              
              {showContactInfo && (art.contact_email || art.contact_website || art.contact_twitter || art.contact_discord) && (
                <div className="flex items-center gap-2 pt-2 border-t border-[#2a2d33]">
                  {art.contact_email && (
                    <a
                      href={`mailto:${art.contact_email}`}
                      className="p-1.5 rounded-lg bg-[#1f2125] hover:bg-[#2a2d33] transition-colors"
                      title={`Email ${art.artist_name}`}
                      data-testid={`link-email-${art.id}`}
                    >
                      <Mail className="w-3.5 h-3.5 text-[#9aa0a6]" />
                    </a>
                  )}
                  {art.contact_website && (
                    <a
                      href={art.contact_website.startsWith('http') ? art.contact_website : `https://${art.contact_website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-[#1f2125] hover:bg-[#2a2d33] transition-colors"
                      title="Website"
                      data-testid={`link-website-${art.id}`}
                    >
                      <Globe className="w-3.5 h-3.5 text-[#9aa0a6]" />
                    </a>
                  )}
                  {art.contact_twitter && (
                    <a
                      href={`https://twitter.com/${art.contact_twitter.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-[#1f2125] hover:bg-[#2a2d33] transition-colors"
                      title={`@${art.contact_twitter.replace('@', '')}`}
                      data-testid={`link-twitter-${art.id}`}
                    >
                      <Twitter className="w-3.5 h-3.5 text-[#9aa0a6]" />
                    </a>
                  )}
                  {art.contact_discord && (
                    <span
                      className="p-1.5 rounded-lg bg-[#1f2125] cursor-default"
                      title={`Discord: ${art.contact_discord}`}
                      data-testid={`badge-discord-${art.id}`}
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-[#9aa0a6]" />
                    </span>
                  )}
                  <span className="ml-auto text-xs text-[#9aa0a6]">
                    {art.usage_count} uses
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
