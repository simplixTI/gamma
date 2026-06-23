import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PartnerAd {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
}

interface AdDisplayProps {
  position: 'home' | 'completed' | 'searching';
}

const AdDisplay = ({ position }: AdDisplayProps) => {
  const [ads, setAds] = useState<PartnerAd[]>([]);

  useEffect(() => {
    const now = new Date().toISOString();
    // Ads with NULL dates are treated as "always active" (no schedule restriction).
    // Postgres filters out NULLs in comparisons, so we must use OR IS NULL.
    supabase
      .from('partner_ads')
      .select('id, title, description, image_url, link_url')
      .eq('position', position)
      .eq('is_active', true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .limit(2)
      .then(({ data }) => { if (data) setAds(data); });
  }, [position]);

  if (ads.length === 0) return null;

  return (
    <section className="space-y-2">
      {ads.map(ad => (
        <a
          key={ad.id}
          href={ad.link_url?.startsWith('http') ? ad.link_url : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-2xl overflow-hidden border border-border bg-card active:opacity-80 transition-opacity"
          onClick={(e) => { if (!ad.link_url?.startsWith('http')) e.preventDefault(); }}
        >
          {ad.image_url && (
            <div className="relative aspect-[2/1] overflow-hidden bg-muted">
              <img
                src={ad.image_url}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover blur-2xl scale-125 opacity-90 saturate-150"
              />
              <img
                src={ad.image_url}
                alt={ad.title}
                className="relative w-full h-full object-contain drop-shadow-md"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
          <div className="px-4 py-3">
            <p className="font-semibold text-foreground text-sm">{ad.title}</p>
            {ad.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ad.description}</p>
            )}
            <p className="text-[10px] text-muted-foreground/60 mt-1 uppercase tracking-wide">Anúncio</p>
          </div>
        </a>
      ))}
    </section>
  );
};

export default AdDisplay;
