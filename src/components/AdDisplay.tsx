import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type ContentType = 'ad' | 'curiosity';

interface PartnerAd {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  content_type: ContentType;
}

interface AdDisplayProps {
  position: 'home' | 'completed' | 'searching';
}

const ROTATE_INTERVAL_MS = 5000;
const SWIPE_THRESHOLD_PX = 40;

const AdDisplay = ({ position }: AdDisplayProps) => {
  const [items, setItems] = useState<PartnerAd[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const paused = useRef(false);

  useEffect(() => {
    const now = new Date().toISOString();
    supabase
      .from('partner_ads')
      .select('id, title, description, image_url, link_url, content_type')
      .eq('position', position)
      .eq('is_active', true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .limit(5)
      .then(({ data }) => {
        if (data) setItems(data as PartnerAd[]);
      });
  }, [position]);

  // Auto-rotate a cada ROTATE_INTERVAL_MS, pausa em hover/touch
  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      if (paused.current) return;
      setCurrentIndex(i => (i + 1) % items.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [items.length]);

  if (items.length === 0) return null;

  const current = items[currentIndex];

  const recordClick = (adId: string, contentType: ContentType) => {
    // Apenas anuncios geram registro de click (curiosidades nao tem valor comercial)
    if (contentType !== 'ad') return;
    supabase.auth.getUser().then(({ data }) => {
      supabase.from('ad_clicks').insert({ ad_id: adId, user_id: data.user?.id ?? null }).then(({ error }) => {
        if (error) console.warn('ad_clicks insert failed:', error);
      });
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    paused.current = true;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    paused.current = false;
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
    if (dx < 0) {
      setCurrentIndex(i => (i + 1) % items.length);
    } else {
      setCurrentIndex(i => (i - 1 + items.length) % items.length);
    }
  };

  const isCuriosity = current.content_type === 'curiosity';
  const hasLink = !isCuriosity && current.link_url?.startsWith('http');

  const cardContent = (
    <>
      {current.image_url && (
        <div className="relative aspect-[2/1] overflow-hidden bg-white">
          <img
            src={current.image_url}
            alt={current.title}
            className="w-full h-full object-contain"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}
      <div className="px-4 py-3">
        <p className="font-semibold text-foreground text-sm">{current.title}</p>
        {current.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{current.description}</p>
        )}
        <p className={`text-[10px] mt-1 uppercase tracking-wide ${isCuriosity ? 'text-emerald-600 font-semibold' : 'text-muted-foreground/60'}`}>
          {isCuriosity ? '💡 Curiosidade da Ilha' : 'Anúncio'}
        </p>
      </div>
    </>
  );

  return (
    <section
      className="relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={() => { paused.current = true; }}
      onMouseLeave={() => { paused.current = false; }}
    >
      {hasLink ? (
        <a
          href={current.link_url ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-2xl overflow-hidden border border-border bg-card active:opacity-80 transition-opacity"
          onClick={() => recordClick(current.id, current.content_type)}
        >
          {cardContent}
        </a>
      ) : (
        <div className="block rounded-2xl overflow-hidden border border-border bg-card">
          {cardContent}
        </div>
      )}

      {items.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              aria-label={`Item ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === currentIndex
                  ? 'w-6 bg-foreground'
                  : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default AdDisplay;
