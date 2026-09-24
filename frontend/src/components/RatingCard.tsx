'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

interface RatingCardProps {
  onSubmit: (rating: number, comment: string) => void;
  title?: string;
}

export default function RatingCard({ onSubmit, title = 'Rate your ride' }: RatingCardProps) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">{title}</h3>
      <div className="mb-4 flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`h-8 w-8 ${
                star <= (hover || rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
              }`}
            />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your experience..."
        className="mb-4 w-full rounded-lg border border-slate-200 p-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        rows={3}
      />
      <button
        onClick={() => rating > 0 && onSubmit(rating, comment)}
        disabled={rating === 0}
        className="w-full rounded-lg bg-amber-500 py-2.5 font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
      >
        Submit Rating
      </button>
    </div>
  );
}
