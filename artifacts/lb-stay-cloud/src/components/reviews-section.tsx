import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Send, MessageSquarePlus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/* ──────────────────────────────────────────────────────── */
type Review = {
  id: number;
  businessId: number;
  authorName: string;
  authorInitials: string;
  avatarColor: string;
  rating: number;
  comment: string;
  sector: string;
  isDemo: boolean;
  createdAt: string;
};

/* ──────────────────────────────────────────────────────── */
function StarRating({ value, onChange, readonly = false }: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(i)}
          onMouseEnter={() => !readonly && setHovered(i)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className="focus:outline-none disabled:cursor-default transition-transform hover:scale-110"
        >
          <Star
            className={`w-4 h-4 transition-colors ${
              i <= (hovered || value)
                ? 'fill-[hsl(38_90%_56%)] text-[hsl(38_90%_56%)]'
                : 'fill-transparent text-muted-foreground/40'
            }`}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────────────── */
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/* ──────────────────────────────────────────────────────── */
export function ReviewsSection({ businessId, sector }: { businessId: number; sector: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const QK = ['reviews', businessId];

  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: QK,
    queryFn: async () => {
      const r = await fetch(`/api/reviews?businessId=${businessId}`, { credentials: 'include' });
      if (!r.ok) throw new Error('Erreur chargement avis');
      return r.json();
    },
    enabled: !!businessId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/reviews/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!r.ok) throw new Error('Erreur suppression');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK });
      toast({ title: 'Avis supprimé', description: 'L\'avis a été retiré avec succès.' });
    },
  });

  /* Form state */
  const [authorName, setAuthorName] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !comment.trim()) {
      toast({ title: 'Champ manquant', description: 'Nom et commentaire sont requis.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const r = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ businessId, authorName: authorName.trim(), rating, comment: comment.trim(), sector }),
      });
      if (!r.ok) throw new Error();
      const newReview: Review = await r.json();
      qc.setQueryData<Review[]>(QK, prev => [newReview, ...(prev ?? [])]);
      setAuthorName(''); setComment(''); setRating(5); setShowForm(false);
      toast({ title: '✓ Avis publié !', description: `Merci ${newReview.authorName}, votre avis est en ligne.` });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible d\'enregistrer l\'avis.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const avg = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '—';

  const dist = [5, 4, 3, 2, 1].map(s => ({
    stars: s,
    count: reviews.filter(r => r.rating === s).length,
    pct: reviews.length > 0 ? Math.round((reviews.filter(r => r.rating === s).length / reviews.length) * 100) : 0,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="rounded-xl overflow-hidden"
      style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid hsl(var(--border))' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'hsl(38 90% 56% / 0.12)' }}>
            <Star className="w-4 h-4 fill-[hsl(38_90%_56%)] text-[hsl(38_90%_56%)]" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Avis Clients</h2>
            <p className="text-xs text-muted-foreground">
              {reviews.length} avis · Note moyenne{' '}
              <span className="font-bold" style={{ color: 'hsl(38 90% 56%)' }}>{avg}/5</span>
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
          style={{ background: 'hsl(38 90% 56%)', color: '#000' }}
        >
          <MessageSquarePlus className="w-3.5 h-3.5" />
          Laisser un avis
          {showForm ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
        </button>
      </div>

      {/* Add review form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="px-6 py-5"
              style={{ background: 'hsl(38 90% 56% / 0.04)', borderBottom: '1px solid hsl(var(--border))' }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                    Votre nom *
                  </label>
                  <Input
                    value={authorName}
                    onChange={e => setAuthorName(e.target.value)}
                    placeholder="Ex: M. Kamdem Jean-Pierre"
                    className="bg-background/60 border-border/60 h-9 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                    Note
                  </label>
                  <div className="flex items-center gap-2 h-9">
                    <StarRating value={rating} onChange={setRating} />
                    <span className="text-sm font-bold" style={{ color: 'hsl(38 90% 56%)' }}>{rating}/5</span>
                  </div>
                </div>
              </div>
              <div className="mb-4">
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  Votre commentaire *
                </label>
                <Textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Partagez votre expérience avec cette enseigne..."
                  className="bg-background/60 border-border/60 text-sm resize-none"
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  size="sm"
                  className="font-bold"
                  style={{ background: 'hsl(38 90% 56%)', color: '#000' }}
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  {isSubmitting ? 'Publication...' : 'Publier mon avis'}
                </Button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Body */}
      <div className="p-6">
        {isLoading ? (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: 'hsl(var(--muted))' }} />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Star className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-sm font-semibold">Aucun avis pour le moment</p>
            <p className="text-xs mt-0.5">Soyez le premier à partager votre expérience !</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Distribution bar */}
            <div className="lg:col-span-1">
              <div className="rounded-xl p-4" style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}>
                <div className="text-center mb-4">
                  <p className="text-4xl font-extrabold text-foreground">{avg}</p>
                  <StarRating value={Math.round(parseFloat(avg as string) || 0)} readonly />
                  <p className="text-xs text-muted-foreground mt-1">{reviews.length} avis</p>
                </div>
                <div className="space-y-2">
                  {dist.map(d => (
                    <div key={d.stars} className="flex items-center gap-2">
                      <span className="text-xs w-4 text-right font-semibold text-muted-foreground">{d.stars}</span>
                      <Star className="w-3 h-3 fill-[hsl(38_90%_56%)] text-[hsl(38_90%_56%)] shrink-0" strokeWidth={1} />
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'hsl(var(--muted))' }}>
                        <div className="h-full rounded-full" style={{ width: `${d.pct}%`, background: 'hsl(38 90% 56%)' }} />
                      </div>
                      <span className="text-xs w-4 text-muted-foreground">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Reviews list */}
            <div className="lg:col-span-2 space-y-3 max-h-[420px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
              <AnimatePresence mode="popLayout">
                {reviews.map((review, i) => (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-xl p-4 group"
                    style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold text-white shrink-0"
                        style={{ background: review.avatarColor }}
                      >
                        {review.authorInitials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold text-foreground leading-tight">{review.authorName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <StarRating value={review.rating} readonly />
                              <span className="text-[10px] text-muted-foreground">{fmtDate(review.createdAt)}</span>
                              {review.isDemo && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                                  style={{ background: 'hsl(38 90% 56% / 0.1)', color: 'hsl(38 90% 56%)' }}>
                                  DÉMO
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => deleteMutation.mutate(review.id)}
                            disabled={deleteMutation.isPending}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-500/10"
                            title="Supprimer cet avis"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                          &ldquo;{review.comment}&rdquo;
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
