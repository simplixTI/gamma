import { ReactNode, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  children: ReactNode;
  className?: string;
}

/**
 * Draggable bottom sheet with two snap points: peek (40vh) and expanded (90vh).
 * The inner content is independently scrollable when expanded.
 */
const BottomSheet: React.FC<BottomSheetProps> = ({ children, className }) => {
  const [expanded, setExpanded] = useState(false);
  const startY = useRef<number | null>(null);
  const startExpanded = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    startExpanded.current = expanded;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (startY.current === null) return;
    const delta = e.changedTouches[0].clientY - startY.current;
    if (delta < -40) setExpanded(true);
    if (delta > 40) setExpanded(false);
    startY.current = null;
  };

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 bg-card rounded-t-2xl shadow-sheet z-40',
        'transition-all duration-300 ease-out',
        expanded ? 'h-[90dvh]' : 'h-[46dvh]',
        className,
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Drag handle */}
      <div className="flex justify-center py-2 shrink-0 cursor-pointer" onClick={() => setExpanded((v) => !v)}>
        <div className="w-10 h-1 bg-border rounded-full" />
      </div>

      {/* Scrollable content */}
      <div className="px-4 pb-6 overflow-y-auto h-[calc(100%-28px)] overscroll-contain">
        {children}
      </div>
    </div>
  );
};

export default BottomSheet;
