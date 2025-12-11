import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface GalleryItem {
  id: string;
  kind: "vehicle" | "weapon" | "creature";
  title: string;
  tags: string[];
  license: "cc0" | "cc-by" | "commercial";
  owner: string;
  imageBase64?: string;
  modelUrl?: string;
  meta: Record<string, any>;
  createdAt: number;
}

interface GalleryCardProps {
  item: GalleryItem;
  onSelect?: (item: GalleryItem) => void;
}

export function GalleryCard({ item, onSelect }: GalleryCardProps) {
  const imgSrc = item.imageBase64
    ? `data:image/svg+xml;base64,${item.imageBase64}`
    : undefined;

  const kindColors: Record<string, string> = {
    vehicle: "bg-blue-500/20 text-blue-400",
    weapon: "bg-red-500/20 text-red-400",
    creature: "bg-green-500/20 text-green-400",
  };

  const licenseColors: Record<string, string> = {
    cc0: "bg-emerald-500/20 text-emerald-400",
    "cc-by": "bg-amber-500/20 text-amber-400",
    commercial: "bg-purple-500/20 text-purple-400",
  };

  return (
    <Card
      className="hover-elevate cursor-pointer transition-all"
      onClick={() => onSelect?.(item)}
      data-testid={`card-gallery-${item.id}`}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <span className="text-sm font-medium truncate" data-testid={`text-title-${item.id}`}>
          {item.title}
        </span>
        <Badge
          variant="outline"
          className={`text-xs ${item.owner === "system" ? "bg-neutral-800" : "bg-primary/20"}`}
          data-testid={`badge-owner-${item.id}`}
        >
          {item.owner === "system" ? "System" : item.owner === "web" ? "Web" : "User"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {imgSrc && (
          <img
            src={imgSrc}
            alt={item.title}
            className="w-full h-40 object-cover rounded"
            data-testid={`img-preview-${item.id}`}
          />
        )}
        <div className="flex gap-2 flex-wrap">
          <Badge className={kindColors[item.kind]} data-testid={`badge-kind-${item.id}`}>
            {item.kind}
          </Badge>
          {item.tags?.slice(0, 4).map((t: string, idx: number) => (
            <Badge
              key={`${t}-${idx}`}
              variant="outline"
              className="text-xs"
              data-testid={`badge-tag-${item.id}-${idx}`}
            >
              {t}
            </Badge>
          ))}
          <Badge
            className={`ml-auto ${licenseColors[item.license]}`}
            data-testid={`badge-license-${item.id}`}
          >
            {item.license}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

interface GalleryGridProps {
  items: GalleryItem[];
  onSelect?: (item: GalleryItem) => void;
}

export function GalleryGrid({ items, onSelect }: GalleryGridProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground" data-testid="text-empty-gallery">
        No items in gallery yet. Use auto-fill to populate.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="grid-gallery">
      {items.map((item) => (
        <GalleryCard key={item.id} item={item} onSelect={onSelect} />
      ))}
    </div>
  );
}
