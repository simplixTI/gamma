import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange: (stars: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
}

const StarRating = ({ value, onChange, size = 'md', readonly = false }: StarRatingProps) => {
  const sizeClass = size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8';
  return (
    <div className="flex justify-center gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onChange(star)}
          className={`transition-all p-1 ${readonly ? 'cursor-default' : 'active:scale-90 hover:scale-110'}`}
          disabled={readonly}
        >
          <Star
            className={`${sizeClass} transition-colors ${
              star <= value
                ? 'text-yellow-500 fill-yellow-500'
                : 'text-border hover:text-yellow-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

export default StarRating;
