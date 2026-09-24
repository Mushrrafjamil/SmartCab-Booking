'use client';

import { useEffect, useState } from 'react';
import { reviewService } from '@/services';
import { Star } from 'lucide-react';

interface ReviewItem {
  _id: string;
  rating: number;
  comment?: string;
  reviewType?: string;
  createdAt: string;
  ride?: { rideId?: string; pickup?: { address?: string }; destination?: { address?: string } };
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reviewService.getMyReviews()
      .then(({ data }) => setReviews(data.reviews || []))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">My Reviews</h1>
      <p className="mb-6 text-slate-600">Reviews you have submitted for completed rides.</p>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          No reviews yet. Rate a completed ride from your{' '}
          <a href="/ride-history" className="font-medium text-amber-600 hover:underline">ride history</a>.
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review._id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                  />
                ))}
                <span className="ml-2 text-sm text-slate-500">{review.rating}/5</span>
              </div>
              {review.comment && <p className="mt-2 text-sm text-slate-700">{review.comment}</p>}
              {review.ride && (
                <p className="mt-2 text-xs text-slate-500">
                  {review.ride.pickup?.address || 'Pickup'} → {review.ride.destination?.address || 'Destination'}
                </p>
              )}
              <p className="mt-1 text-xs text-slate-400">{new Date(review.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
