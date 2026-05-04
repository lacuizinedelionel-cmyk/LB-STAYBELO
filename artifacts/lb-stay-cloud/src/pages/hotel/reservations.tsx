import { useState, useMemo } from 'react';
import {
  useListHotelReservations,
  useCancelHotelReservation,
  useHotelCheckIn,
  useHotelCheckOut,
  getListHotelReservationsQueryKey,
  getListHotelRoomsQueryKey,
  getGetHotelStatsQueryKey,
  HotelReservation,
  HotelReservationStatus,
} from '@workspace/api-client-react';
import { DashboardHero } from '@/components/dashboard-hero';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { formatXAF } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar, Phone, BedDouble,
  LogIn, LogOut, XCircle, Search,
  ChevronDown, Moon, RefreshCw, X,
  AlertTriangle, Pencil, Trash2, Save,
  Smartphone, Banknote, Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DEMO_HOTEL_RESERVATIONS = [
  { id: 9101, guestName: "M. Eto'o", roomNumber: '301', status: 'RESERVED' as HotelReservationStatus, checkInDate: new Date().toISOString().split('T')[0], checkOutDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], totalAmount: 240000, nights: 2, createdAt: new Date().toISOString(), guestPhone: '+237 699 100 101' },
  { id: 9102, guestName: 'Mme Bella', roomNumber: '204', status: 'RESERVED' as HotelReservationStatus, checkInDate: new Date().toISOString().split('T')[0], checkOutDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], totalAmount: 360000, nights: 3, createdAt: new Date().toISOString(), guestPhone: '+237 699 100 102' },
  { id: 9103, guestName: 'M. Abena', roomNumber: '112', status: 'RESERVED' as HotelReservationStatus, checkInDate: new Date().toISOString().split('T')[0], checkOutDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], totalAmount: 120000, nights: 1, createdAt: new Date().toISOString(), guestPhone: '+237 699 100 103' },
];

/* ── Statuts ── */
const STATUS_CFG: Record<HotelReservationStatus, { label: string; color: string; bg: string }> = {
  RESERVED:    { label: 'Réservée',    color: '#3B82F6', bg: 'hsl(217 91% 60% / 0.12)' },
  CHECKED_IN:  { label: 'Occupée',     color: '#EF4444', bg: 'hsl(0 72% 51% / 0.12)'  },
  CHECKED_OUT: { label: 'Parti(e)',    color: '#6B7280', bg: 'hsl(220 9% 46% / 0.12)'  },
  CANCELLED:   { label: 'Annulée',     color: '#9CA3AF', bg: 'hsl(220 9% 46% / 0.10)'  },
};

/* ── Badge paiement selon paymentMethod ── */
function PaymentBadge({ method }: { method?: string | null }) {
  if (method === 'MTN_MOMO') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
      style={{ background: 'hsl(160 84% 39% / 0.12)', color: '#10B981' }}>
      <Smartphone className="w-2.5 h-2.5" />MoMo ✓
    </span>
  );
  if (method === 'ORANGE_MONEY') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
      style={{ background: 'hsl(25 95% 53% / 0.12)', color: '#F97316' }}>
      <Smartphone className="w-2.5 h-2.5" />Orange ✓
    </span>
  );
  if (method === 'CASH') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
      style={{ background: 'hsl(38 90% 56% / 0.12)', color: 'hsl(38 90% 56%)' }}>
      <Banknote className="w-2.5 h-2.5" />Cash
    </span>
  );
  if (method === 'PENDING_RECEPTION') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
      style={{ background: 'hsl(38 90% 56% / 0.10)', color: '#F59E0B' }}>
      <Clock className="w-2.5 h-2.5" />Att. réception
    </span>
  );
  return null;
}

const STATUS_FILTERS: { value: HotelReservationStatus | 'ALL'; label: string }[] = [
  { value: 'ALL',         label: 'Toutes'     },
  { value: 'RESERVED',    label: 'Réservées'  },
  { value: 'CHECKED_IN',  label: 'En séjour'  },
  { value: 'CHECKED_OUT', label: 'Partis'     },
  { value: 'CANCELLED',   label: 'Annulées'   },
];

/* ── Formatage date FR ── */
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtDateTime(d: string) {
  return new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/* ── Modal confirmation annulation ── */
function CancelConfirmModal({ res, onConfirm, onClose, isPending }: {
  res: HotelReservation;
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'hsl(0 0% 0% / 0.65)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
      >
        <div className="p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'hsl(0 72% 51% / 0.12)' }}>
              <AlertTriangle className="w-5 h-5" style={{ color: '#EF4444' }} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-foreground">Annuler la réservation ?</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Chambre <strong className="text-foreground">{res.roomNumber}</strong> · {res.guestName}<br />
                La chambre redeviendra disponible immédiatement.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
            >
              Retour
            </button>
            <button
              onClick={onConfirm}
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              style={{ background: 'hsl(0 72% 51% / 0.15)', color: '#EF4444', border: '1px solid hsl(0 72% 51% / 0.3)' }}
            >
              {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Confirmer l'annulation
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Modal Modifier réservation ── */
function EditReservationModal({ res, onSave, onClose, isPending }: {
  res: HotelReservation;
  onSave: (data: { guestName: string; guestPhone: string; checkInDate: string; checkOutDate: string; totalAmount: number }) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    guestName:   res.guestName,
    guestPhone:  res.guestPhone ?? '',
    checkInDate: res.checkInDate,
    checkOutDate: res.checkOutDate,
    totalAmount: String(res.totalAmount),
  });

  const field = (key: keyof typeof form, label: string, type = 'text') => (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full px-3 py-2.5 rounded-xl text-sm text-foreground outline-none transition-all"
        style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}
        onFocus={e => (e.target.style.borderColor = 'hsl(38 90% 56% / 0.6)')}
        onBlur={e => (e.target.style.borderColor = 'hsl(var(--border))')}
      />
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'hsl(0 0% 0% / 0.65)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'hsl(38 90% 56% / 0.12)' }}>
              <Pencil className="w-4 h-4" style={{ color: 'hsl(38 90% 56%)' }} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-foreground">Modifier la réservation</h3>
              <p className="text-[11px] text-muted-foreground">#{res.id} · Chambre {res.roomNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {field('guestName',   'Nom du client')}
          {field('guestPhone',  'Téléphone')}
          {field('checkInDate', 'Date arrivée', 'date')}
          {field('checkOutDate','Date départ',  'date')}
          {field('totalAmount', 'Montant total (FCFA)', 'number')}

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
            >
              Annuler
            </button>
            <button
              onClick={() => onSave({
                guestName:   form.guestName,
                guestPhone:  form.guestPhone,
                checkInDate: form.checkInDate,
                checkOutDate: form.checkOutDate,
                totalAmount: parseFloat(form.totalAmount),
              })}
              disabled={isPending || !form.guestName.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              style={{ background: 'hsl(38 90% 56%)', color: '#000' }}
            >
              {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Enregistrer
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Modal confirmation suppression ── */
function DeleteConfirmModal({ res, onConfirm, onClose, isPending }: {
  res: HotelReservation;
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'hsl(0 0% 0% / 0.65)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
      >
        <div className="p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'hsl(0 72% 51% / 0.12)' }}>
              <Trash2 className="w-5 h-5" style={{ color: '#EF4444' }} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-foreground">Supprimer la réservation ?</h3>
              <p className="text-xs text-muted-foreground mt-1">
                <strong className="text-foreground">{res.guestName}</strong> · Chambre {res.roomNumber}<br />
                Cette action est irréversible.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
            >
              Retour
            </button>
            <button
              onClick={onConfirm}
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              style={{ background: 'hsl(0 72% 51% / 0.15)', color: '#EF4444', border: '1px solid hsl(0 72% 51% / 0.3)' }}
            >
              {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Supprimer
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Panneau latéral détail ── */
function DetailPanel({ res, onClose, onCheckIn, onCheckOut, onCancel, onEdit, onDelete, isMutating }: {
  res: HotelReservation;
  onClose: () => void;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isMutating: boolean;
}) {
  const s = STATUS_CFG[res.status];
  return (
    <motion.div
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      className="fixed right-0 top-0 h-full w-full max-w-sm z-40 shadow-2xl flex flex-col"
      style={{ background: 'hsl(var(--card))', borderLeft: '1px solid hsl(var(--border))' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
        <div>
          <h3 className="text-base font-extrabold text-foreground">Réservation #{res.id}</h3>
          <p className="text-xs text-muted-foreground">Chambre {res.roomNumber}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Statut + paiement */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: s.bg, color: s.color }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
          <PaymentBadge method={(res as any).paymentMethod} />
        </div>

        {/* Client */}
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Client</p>
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'hsl(var(--muted))' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              style={{ background: `${s.color}20`, color: s.color }}>
              {res.guestName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{res.guestName}</p>
              {res.guestPhone && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3" />{res.guestPhone}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Séjour */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Séjour</p>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid hsl(var(--border))' }}>
            {[
              { label: 'Chambre',  value: `Chambre ${res.roomNumber}` },
              { label: 'Arrivée',  value: fmtDate(res.checkInDate)    },
              { label: 'Départ',   value: fmtDate(res.checkOutDate)   },
              { label: 'Durée',    value: `${res.nights} nuit${res.nights > 1 ? 's' : ''}` },
            ].map((row, i) => (
              <div key={i} className="flex justify-between items-center px-4 py-2.5 text-xs"
                style={{ borderBottom: i < 3 ? '1px solid hsl(var(--border))' : 'none' }}>
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-semibold text-foreground">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Montant */}
        <div className="rounded-xl p-4" style={{ background: 'hsl(38 90% 56% / 0.07)', border: '1px solid hsl(38 90% 56% / 0.2)' }}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total séjour</span>
            <span className="text-xl font-extrabold" style={{ color: 'hsl(38 90% 56%)', letterSpacing: '-0.02em' }}>
              {formatXAF(res.totalAmount)}
            </span>
          </div>
        </div>

        {/* Timestamps */}
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>Créée le {fmtDateTime(res.createdAt)}</p>
          {res.checkedInAt  && <p>Check-in : {fmtDateTime(res.checkedInAt)}</p>}
          {res.checkedOutAt && <p>Check-out : {fmtDateTime(res.checkedOutAt)}</p>}
        </div>
      </div>

      {/* Actions */}
      <div className="p-5 space-y-2" style={{ borderTop: '1px solid hsl(var(--border))' }}>
        {res.status === 'RESERVED' && (
          <>
            <button
              onClick={onCheckIn}
              disabled={isMutating}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              style={{ background: 'hsl(160 84% 39% / 0.15)', color: '#10B981', border: '1px solid hsl(160 84% 39% / 0.3)' }}
            >
              {isMutating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              Check-In
            </button>
            <button
              onClick={onCancel}
              disabled={isMutating}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
              style={{ color: '#EF4444' }}
            >
              <XCircle className="w-3.5 h-3.5" />
              Annuler la réservation
            </button>
          </>
        )}
        {res.status === 'CHECKED_IN' && (
          <button
            onClick={onCheckOut}
            disabled={isMutating}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
            style={{ background: 'hsl(0 72% 51% / 0.1)', color: '#EF4444', border: '1px solid hsl(0 72% 51% / 0.3)' }}
          >
            {isMutating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            Check-Out
          </button>
        )}

        {/* ── Modifier / Supprimer — toujours visibles ── */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onEdit}
            disabled={isMutating}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
            style={{ background: 'hsl(38 90% 56% / 0.10)', color: 'hsl(38 90% 56%)', border: '1px solid hsl(38 90% 56% / 0.25)' }}
          >
            <Pencil className="w-3.5 h-3.5" />
            Modifier
          </button>
          <button
            onClick={onDelete}
            disabled={isMutating}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
            style={{ background: 'hsl(0 72% 51% / 0.08)', color: '#EF4444', border: '1px solid hsl(0 72% 51% / 0.2)' }}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Supprimer
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════
   PAGE PRINCIPALE
══════════════════════════════════════ */
export default function HotelReservationsPage() {
  const { business } = useAuth();
  const queryClient  = useQueryClient();
  const { toast }    = useToast();

  const bId      = business?.id ?? 0;
  const resKey   = getListHotelReservationsQueryKey({ businessId: bId });
  const roomsKey = getListHotelRoomsQueryKey({ businessId: bId });
  const statsKey = getGetHotelStatsQueryKey({ businessId: bId });

  const [statusFilter, setStatusFilter] = useState<HotelReservationStatus | 'ALL'>('ALL');
  const [search, setSearch]             = useState('');
  const [selected, setSelected]         = useState<HotelReservation | null>(null);
  const [toCancel, setToCancel]         = useState<HotelReservation | null>(null);
  const [toEdit, setToEdit]             = useState<HotelReservation | null>(null);
  const [toDelete, setToDelete]         = useState<HotelReservation | null>(null);
  const [isMutating, setIsMutating]     = useState(false);

  const { data: reservations, isLoading } = useListHotelReservations(
    { businessId: bId },
    { query: { queryKey: resKey, enabled: !!bId, refetchInterval: 15000 } },
  );
  const displayReservations = (reservations && reservations.length > 0
    ? reservations
    : DEMO_HOTEL_RESERVATIONS) as HotelReservation[];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: resKey });
    queryClient.invalidateQueries({ queryKey: roomsKey });
    queryClient.invalidateQueries({ queryKey: statsKey });
  };

  const { mutate: checkIn } = useHotelCheckIn({
    mutation: {
      onSuccess: (res) => {
        invalidate(); setIsMutating(false);
        setSelected(res);
        toast({ title: '✅ Check-in effectué', description: `${res.guestName} est maintenant enregistré(e)` });
      },
      onError: () => { setIsMutating(false); toast({ title: 'Erreur', variant: 'destructive' }); },
    },
  });

  const { mutate: checkOut } = useHotelCheckOut({
    mutation: {
      onSuccess: (res) => {
        invalidate(); setIsMutating(false);
        setSelected(res);
        toast({ title: '✅ Check-out effectué', description: `${res.guestName} a quitté la chambre` });
      },
      onError: () => { setIsMutating(false); toast({ title: 'Erreur', variant: 'destructive' }); },
    },
  });

  const { mutate: cancel, isPending: isCancelling } = useCancelHotelReservation({
    mutation: {
      onSuccess: (res) => {
        invalidate();
        setToCancel(null);
        if (selected?.id === res.id) setSelected(res);
        toast({ title: '🗑 Réservation annulée', description: `Chambre ${res.roomNumber} de nouveau disponible` });
      },
      onError: () => toast({ title: 'Erreur', description: 'Impossible d\'annuler', variant: 'destructive' }),
    },
  });

  /* ── Modifier réservation ── */
  const { mutate: editReservation, isPending: isEditing } = useMutation({
    mutationFn: async (data: { id: number; guestName: string; guestPhone: string; checkInDate: string; checkOutDate: string; totalAmount: number }) => {
      const r = await fetch(`/api/hotel/reservations/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error('Update failed');
      return r.json() as Promise<HotelReservation>;
    },
    onSuccess: (updated) => {
      invalidate();
      setToEdit(null);
      setSelected(updated);
      toast({ title: '✅ Réservation modifiée', description: `${updated.guestName} · Chambre ${updated.roomNumber}` });
    },
    onError: () => toast({ title: 'Erreur', description: 'Impossible de modifier', variant: 'destructive' }),
  });

  /* ── Supprimer réservation ── */
  const { mutate: deleteReservation, isPending: isDeleting } = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/hotel/reservations/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!r.ok) throw new Error('Delete failed');
      return r.json();
    },
    onSuccess: (_, id) => {
      invalidate();
      setToDelete(null);
      if (selected?.id === id) setSelected(null);
      toast({ title: '🗑 Réservation supprimée', description: 'La chambre a été libérée' });
    },
    onError: () => toast({ title: 'Erreur', description: 'Impossible de supprimer', variant: 'destructive' }),
  });

  /* ── Filtrage & tri ── */
  const filtered = useMemo(() => {
    let list = displayReservations ?? [];
    if (statusFilter !== 'ALL') list = list.filter(r => r.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.guestName.toLowerCase().includes(q) ||
        r.roomNumber.toLowerCase().includes(q) ||
        (r.guestPhone ?? '').includes(q)
      );
    }
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [displayReservations, statusFilter, search]);

  /* ── KPI counts ── */
  const counts = useMemo(() => {
    const all = displayReservations ?? [];
    return {
      total:      all.length,
      reserved:   all.filter(r => r.status === 'RESERVED').length,
      checkedIn:  all.filter(r => r.status === 'CHECKED_IN').length,
      cancelled:  all.filter(r => r.status === 'CANCELLED').length,
      revenue:    all.filter(r => r.status !== 'CANCELLED').reduce((s, r) => s + r.totalAmount, 0),
    };
  }, [displayReservations]);

  return (
    <div className="p-6 md:p-8 space-y-6 relative page-enter">
      <DashboardHero
        title="Réservations"
        subtitle={`${counts.total} réservation${counts.total !== 1 ? 's' : ''} · Cliquez sur une ligne pour voir les détails`}
        gradient="linear-gradient(135deg,#1D4ED8,#3B82F6)"
        color="#60A5FA"
        bg="rgba(96,165,250,0.08)"
        icon={Calendar}
        badge="LIVE"
        stats={[
          { label: 'en attente', value: String(counts.reserved) },
          { label: 'en séjour',  value: String(counts.checkedIn) },
          { label: 'CA total',   value: new Intl.NumberFormat('fr-FR').format(counts.revenue) + ' FCFA' },
        ]}
      />

      {/* KPI bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Réservées',    value: counts.reserved,  color: '#3B82F6', icon: Calendar },
          { label: 'Occupées',     value: counts.checkedIn, color: '#EF4444', icon: BedDouble },
          { label: 'Annulées',     value: counts.cancelled, color: '#9CA3AF', icon: XCircle  },
          { label: 'CA total',     value: formatXAF(counts.revenue), color: 'hsl(38 90% 56%)', icon: Moon },
        ].map(kpi => (
          <div key={kpi.label} className="flex flex-col gap-1 px-4 py-3 rounded-xl"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
            <div className="flex items-center gap-1.5">
              <kpi.icon className="w-3.5 h-3.5" style={{ color: kpi.color }} strokeWidth={1.5} />
              <span className="text-[11px] text-muted-foreground">{kpi.label}</span>
            </div>
            <span className="text-lg font-extrabold text-foreground" style={{ letterSpacing: '-0.02em' }}>{kpi.value}</span>
          </div>
        ))}
      </div>

      {/* Barre recherche + filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl"
          style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}>
          <Search className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom, chambre, téléphone…"
            className="bg-transparent flex-1 text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')}>
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map(f => {
            const isActive = statusFilter === f.value;
            const cfg = f.value !== 'ALL' ? STATUS_CFG[f.value as HotelReservationStatus] : null;
            const count = f.value === 'ALL'
              ? (displayReservations?.length ?? 0)
              : (displayReservations?.filter(r => r.status === f.value).length ?? 0);
            return (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap"
                style={{
                  background: isActive ? (cfg ? `${cfg.color}20` : 'hsl(38 90% 56% / 0.15)') : 'hsl(var(--muted))',
                  border: `1px solid ${isActive ? (cfg?.color ?? 'hsl(38 90% 56%)') + '50' : 'transparent'}`,
                  color: isActive ? (cfg?.color ?? 'hsl(38 90% 56%)') : 'hsl(var(--muted-foreground))',
                }}
              >
                {cfg && <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />}
                {f.label} <span className="opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table / liste */}
      {isLoading ? (
        <div className="space-y-2">
          {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-[72px] rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Calendar className="w-12 h-12 text-muted-foreground/20" strokeWidth={1} />
          <p className="text-sm text-muted-foreground">
            {search ? 'Aucun résultat pour cette recherche' : 'Aucune réservation dans cette catégorie'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {filtered.map(res => {
              const s = STATUS_CFG[res.status];
              const isSelected = selected?.id === res.id;
              return (
                <motion.button
                  key={res.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  onClick={() => setSelected(isSelected ? null : res)}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left transition-all"
                  style={{
                    background: isSelected ? s.bg : 'hsl(var(--card))',
                    border: `1px solid ${isSelected ? s.color + '50' : 'hsl(var(--border))'}`,
                  }}
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: `${s.color}20`, color: s.color }}>
                    {res.guestName.charAt(0).toUpperCase()}
                  </div>

                  {/* Info principale */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-foreground truncate">{res.guestName}</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ background: s.bg, color: s.color }}>
                        {s.label}
                      </span>
                      <PaymentBadge method={(res as any).paymentMethod} />
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <BedDouble className="w-3 h-3" /> Ch. {res.roomNumber}
                      </span>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {fmtDate(res.checkInDate)} → {fmtDate(res.checkOutDate)}
                      </span>
                    </div>
                  </div>

                  {/* Montant + nuits */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-foreground">{formatXAF(res.totalAmount)}</p>
                    <p className="text-[11px] text-muted-foreground">{res.nights}n</p>
                  </div>

                  <ChevronDown
                    className="w-4 h-4 text-muted-foreground shrink-0 transition-transform"
                    style={{ transform: isSelected ? 'rotate(180deg)' : 'none' }}
                  />
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Panneau latéral */}
      <AnimatePresence>
        {selected && (
          <>
            {/* Overlay semi-transparent */}
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-30"
              style={{ background: 'hsl(0 0% 0% / 0.3)' }}
              onClick={() => setSelected(null)}
            />
            <DetailPanel
              key="panel"
              res={selected}
              onClose={() => setSelected(null)}
              onCheckIn={() => { setIsMutating(true); checkIn({ id: selected.id }); }}
              onCheckOut={() => { setIsMutating(true); checkOut({ id: selected.id }); }}
              onCancel={() => setToCancel(selected)}
              onEdit={() => setToEdit(selected)}
              onDelete={() => setToDelete(selected)}
              isMutating={isMutating}
            />
          </>
        )}
      </AnimatePresence>

      {/* Modal confirmation annulation */}
      <AnimatePresence>
        {toCancel && (
          <CancelConfirmModal
            key="cancel-confirm"
            res={toCancel}
            onConfirm={() => cancel({ id: toCancel.id })}
            onClose={() => setToCancel(null)}
            isPending={isCancelling}
          />
        )}
      </AnimatePresence>

      {/* Modal modifier réservation */}
      <AnimatePresence>
        {toEdit && (
          <EditReservationModal
            key="edit-modal"
            res={toEdit}
            onSave={(data) => editReservation({ id: toEdit.id, ...data })}
            onClose={() => setToEdit(null)}
            isPending={isEditing}
          />
        )}
      </AnimatePresence>

      {/* Modal supprimer réservation */}
      <AnimatePresence>
        {toDelete && (
          <DeleteConfirmModal
            key="delete-modal"
            res={toDelete}
            onConfirm={() => deleteReservation(toDelete.id)}
            onClose={() => setToDelete(null)}
            isPending={isDeleting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
