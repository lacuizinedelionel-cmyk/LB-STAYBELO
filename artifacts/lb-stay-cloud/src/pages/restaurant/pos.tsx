import { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  useListRestaurantProducts,
  useCreateRestaurantOrder,
  getListRestaurantProductsQueryKey,
  CreateRestaurantOrderBodyPaymentMethod,
  useListCustomerCredits,
  getListCustomerCreditsQueryKey,
  useAddCreditTransaction,
  CustomerCredit,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { formatXAF } from '@/lib/utils';
import { generateInvoicePDF, generateInvoiceNumber } from '@/lib/invoice';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Search, Plus, Minus, Trash2, Send, Smartphone, CreditCard, Banknote,
  TableProperties, User, ShoppingCart, ChevronRight, CheckCircle2, X,
  FileDown, Loader2, BookMarked, ChevronDown, AlertTriangle, MessageCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MobileMoneyModal } from '@/components/mobile-money-modal';

type CartItem = {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  emoji?: string | null;
};

type ApiPaymentMethod = (typeof CreateRestaurantOrderBodyPaymentMethod)[keyof typeof CreateRestaurantOrderBodyPaymentMethod];
type LocalPaymentMethod = ApiPaymentMethod | 'ARDOISE';

const PAYMENT_OPTIONS: { value: LocalPaymentMethod; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'CASH',             label: 'Espèces',      icon: Banknote,     color: '#10B981' },
  { value: 'MTN_MOBILE_MONEY', label: 'MTN MoMo',     icon: Smartphone,   color: '#F59E0B' },
  { value: 'ORANGE_MONEY',     label: 'Orange Money',  icon: Smartphone,   color: '#F97316' },
  { value: 'CARD',             label: 'Carte',          icon: CreditCard,   color: '#3B82F6' },
  { value: 'ARDOISE',          label: 'Ardoise',        icon: BookMarked,   color: '#8B5CF6' },
];

type QuickProduct = {
  id: number;
  name: string;
  price: number;
  emoji: string;
  category: string;
};

const RESTO_QUICK_PRODUCTS: QuickProduct[] = [
  { id: 1, name: 'Eau minérale', price: 1000, emoji: '💧', category: 'Boissons' },
  { id: 2, name: 'Bissap', price: 1500, emoji: '🧃', category: 'Boissons' },
  { id: 3, name: 'Jus de gingembre', price: 2000, emoji: '🍹', category: 'Boissons' },
  { id: 4, name: 'Entrée Ndolè', price: 3500, emoji: '🥗', category: 'Entrées' },
  { id: 5, name: 'Accra', price: 2500, emoji: '🍤', category: 'Entrées' },
  { id: 6, name: 'Soupe de poisson', price: 4000, emoji: '🍲', category: 'Entrées' },
  { id: 7, name: 'Ndolé', price: 8500, emoji: '🍛', category: 'Plats' },
  { id: 8, name: 'Poisson braisé', price: 12000, emoji: '🐟', category: 'Plats' },
  { id: 9, name: 'Poulet DG', price: 15000, emoji: '🍗', category: 'Plats' },
];

const SUPER_QUICK_PRODUCTS: QuickProduct[] = [
  { id: 101, name: 'Sucre 1kg', price: 1200, emoji: '🍚', category: 'Articles populaires' },
  { id: 102, name: 'Café moulu', price: 2500, emoji: '☕', category: 'Articles populaires' },
  { id: 103, name: 'Lait concentré', price: 1800, emoji: '🥛', category: 'Articles populaires' },
  { id: 104, name: 'Huile de palme', price: 3500, emoji: '🫒', category: 'Articles populaires' },
];

const PHARMA_QUICK_PRODUCTS: QuickProduct[] = [
  { id: 201, name: 'Doliprane', price: 1800, emoji: '💊', category: 'Médicaments courants' },
  { id: 202, name: 'Vitamines', price: 3000, emoji: '🌿', category: 'Médicaments courants' },
  { id: 203, name: 'Gants', price: 2500, emoji: '🧤', category: 'Médicaments courants' },
];

/* ──────────────────────────────────────────────────────────────
   ArdoiseSelector — combobox inline pour choisir un client
   ──────────────────────────────────────────────────────────── */
function ArdoiseSelector({
  businessId,
  total,
  selected,
  onSelect,
}: {
  businessId: number;
  total: number;
  selected: CustomerCredit | null;
  onSelect: (c: CustomerCredit | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const { data: rawClients = [] } = useListCustomerCredits(
    { businessId },
    { query: { queryKey: getListCustomerCreditsQueryKey({ businessId }), enabled: !!businessId } },
  );
  const clients = rawClients as CustomerCredit[];

  const filtered = useMemo(() =>
    clients.filter(c =>
      c.status !== 'SETTLED' &&
      c.clientName.toLowerCase().includes(q.toLowerCase()),
    ), [clients, q]);

  const remaining = selected ? selected.creditLimit - selected.totalDebt : 0;
  const willExceed = selected && total > remaining;

  return (
    <div className="space-y-2">
      {/* Selector trigger */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all"
          style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className={selected ? 'text-foreground truncate' : 'text-muted-foreground'}>
              {selected ? selected.clientName : 'Choisir un client ardoise…'}
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute z-30 top-full mt-1 left-0 right-0 rounded-xl overflow-hidden shadow-xl"
              style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
            >
              <div className="p-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'hsl(var(--muted))' }}>
                  <Search className="w-3 h-3 text-muted-foreground" />
                  <input
                    autoFocus
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    placeholder="Rechercher…"
                    className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none flex-1"
                  />
                </div>
              </div>
              <div className="max-h-40 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Aucun client trouvé</p>
                ) : (
                  filtered.map(c => {
                    const rem = c.creditLimit - c.totalDebt;
                    const blocked = c.status === 'BLOCKED';
                    return (
                      <button
                        key={c.id}
                        type="button"
                        disabled={blocked}
                        onClick={() => { onSelect(c); setOpen(false); setQ(''); }}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 disabled:opacity-40"
                      >
                        <div>
                          <p className="text-xs font-semibold text-foreground">{c.clientName}</p>
                          <p className="text-[10px] text-muted-foreground">{c.clientPhone || '—'}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] font-bold" style={{ color: blocked ? '#EF4444' : rem > 0 ? '#10B981' : '#F59E0B' }}>
                            {blocked ? 'Bloqué' : `${formatXAF(rem)} dispo.`}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Dette : {formatXAF(c.totalDebt)}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Debt preview for selected client */}
      {selected && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="px-3 py-2 rounded-xl space-y-1"
          style={{
            background: willExceed ? 'hsl(0 72% 51% / 0.08)' : 'hsl(160 84% 39% / 0.06)',
            border: `1px solid ${willExceed ? 'hsl(0 72% 51% / 0.3)' : 'hsl(160 84% 39% / 0.2)'}`,
          }}
        >
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Dette actuelle</span>
            <span className="font-bold text-foreground">{formatXAF(selected.totalDebt)}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Plafond</span>
            <span className="font-semibold text-muted-foreground">{formatXAF(selected.creditLimit)}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Après cette commande</span>
            <span className="font-bold" style={{ color: willExceed ? '#EF4444' : '#10B981' }}>
              {formatXAF(selected.totalDebt + total)}
            </span>
          </div>
          {willExceed && (
            <div className="flex items-center gap-1.5 pt-1">
              <AlertTriangle className="w-3 h-3 shrink-0" style={{ color: '#EF4444' }} />
              <p className="text-[10px] font-semibold" style={{ color: '#EF4444' }}>
                Dépasse le plafond de {formatXAF(total - remaining)}
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   SuccessOverlay
   ──────────────────────────────────────────────────────────── */
function SuccessOverlay({
  onClose,
  onPrintInvoice,
  isPrinting,
  isArdoise,
  ardoiseClient,
}: {
  onClose: () => void;
  onPrintInvoice: () => Promise<void>;
  isPrinting: boolean;
  isArdoise: boolean;
  ardoiseClient: CustomerCredit | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-2xl gap-3 p-5"
      style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="flex flex-col items-center gap-4 w-full"
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: isArdoise ? 'hsl(262 83% 58% / 0.15)' : 'hsl(160 84% 39% / 0.15)' }}
        >
          {isArdoise
            ? <BookMarked className="w-8 h-8" style={{ color: '#8B5CF6' }} />
            : <CheckCircle2 className="w-8 h-8" style={{ color: '#10B981' }} />
          }
        </div>
        <div className="text-center">
          <p className="text-lg font-extrabold text-foreground" style={{ letterSpacing: '-0.02em' }}>
            {isArdoise ? 'Ajouté à l\'ardoise !' : 'Commande envoyée !'}
          </p>
          {isArdoise && ardoiseClient ? (
            <p className="text-xs text-muted-foreground mt-1">
              Enregistré sur le compte de <span className="font-semibold text-foreground">{ardoiseClient.clientName}</span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">La cuisine a reçu la commande</p>
          )}
        </div>

        {/* WhatsApp reminder if ardoise */}
        {isArdoise && ardoiseClient?.clientPhone && (
          <a
            href={`https://wa.me/${ardoiseClient.clientPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
              `Bonjour ${ardoiseClient.clientName}, votre ardoise chez nous vient d'être mise à jour. Contactez-nous pour connaître votre solde ou effectuer un paiement. Merci 🙏`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
            style={{
              background: '#25D36615',
              border: '1px solid #25D36640',
              color: '#25D366',
            }}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Envoyer rappel WhatsApp
          </a>
        )}

        <div className="flex flex-col gap-2 w-full">
          <button
            onClick={onPrintInvoice}
            disabled={isPrinting}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-60"
            style={{
              background: 'hsl(38 90% 56% / 0.12)',
              border: '1px solid hsl(38 90% 56% / 0.4)',
              color: 'hsl(38 90% 56%)',
            }}
          >
            {isPrinting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
            {isPrinting ? 'Génération…' : 'Télécharger la facture'}
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
            style={{
              background: 'linear-gradient(135deg, hsl(38 90% 56%), hsl(38 90% 46%))',
              color: '#000',
            }}
          >
            Nouvelle commande
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Page principale POS
   ──────────────────────────────────────────────────────────── */
export default function POSPage() {
  const { business } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('TOUS');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNumber, setTableNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<LocalPaymentMethod>('CASH');
  const [ardoiseClient, setArdoiseClient] = useState<CustomerCredit | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [showMobileMoneyModal, setShowMobileMoneyModal] = useState(false);
  const quickProducts = useMemo(() => {
    if (business?.sector === 'GROCERY') return SUPER_QUICK_PRODUCTS;
    if (business?.sector === 'PHARMACY') return PHARMA_QUICK_PRODUCTS;
    return RESTO_QUICK_PRODUCTS;
  }, [business?.sector]);

  // Ref to capture values for async callbacks
  const submitRef = useRef<{ cart: CartItem[]; paymentMethod: LocalPaymentMethod; ardoiseClient: CustomerCredit | null; total: number }>({ cart: [], paymentMethod: 'CASH', ardoiseClient: null, total: 0 });

  const productsQueryKey = getListRestaurantProductsQueryKey({ businessId: business?.id ?? 0 });

  const { data: products, isLoading } = useListRestaurantProducts(
    { businessId: business?.id ?? 0 },
    { query: { queryKey: productsQueryKey, enabled: !!business?.id } },
  );

  const { mutateAsync: createOrderAsync, isPending: isOrderPending } = useCreateRestaurantOrder();
  const { mutateAsync: addCreditTxAsync, isPending: isTxPending } = useAddCreditTransaction();
  const { data: billingSettings } = useQuery({
    queryKey: ['billing-settings', business?.id],
    queryFn: async () => {
      if (!business?.id) return null;
      const res = await fetch(`/api/billing/settings?businessId=${business.id}`, { credentials: 'include' });
      if (!res.ok) return null;
      return res.json() as Promise<{ businessName?: string | null; logoUrl?: string | null; address?: string | null; phone?: string | null; currency?: string | null }>;
    },
    enabled: !!business?.id,
  });

  const isPending = isOrderPending || isTxPending;

  const categories = useMemo(() => {
    if (!products) return ['TOUS'];
    const cats = Array.from(new Set(products.map(p => p.category)));
    return ['TOUS', ...cats];
  }, [products]);

  const filtered = useMemo(() => {
    if (!products) return [];
    return products.filter(p => {
      const matchesCat = activeCategory === 'TOUS' || p.category === activeCategory;
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      return matchesCat && matchesSearch && p.isAvailable;
    });
  }, [products, activeCategory, search]);

  const quickCategories = useMemo(() => {
    return Array.from(new Set(quickProducts.map(p => p.category)));
  }, [quickProducts]);

  const addQuickProduct = (product: QuickProduct) => {
    addToCart({ id: product.id, name: product.name, price: product.price, emoji: product.emoji });
  };

  const addToCart = (product: { id: number; name: string; price: number; emoji?: string | null }) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1, emoji: product.emoji }];
    });
  };

  const updateQty = (productId: number, delta: number) => {
    setCart(prev =>
      prev.map(i => i.productId === productId ? { ...i, quantity: i.quantity + delta } : i).filter(i => i.quantity > 0),
    );
  };

  const removeFromCart = (productId: number) => setCart(prev => prev.filter(i => i.productId !== productId));

  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const ardoiseRemaining = ardoiseClient ? ardoiseClient.creditLimit - ardoiseClient.totalDebt : 0;
  const ardoiseWouldExceed = paymentMethod === 'ARDOISE' && ardoiseClient && total > ardoiseRemaining;
  const ardoiseMissingClient = paymentMethod === 'ARDOISE' && !ardoiseClient;

  const canSubmit = cart.length > 0 && !ardoiseWouldExceed && !ardoiseMissingClient;

  const isMobileMoney = paymentMethod === 'MTN_MOBILE_MONEY' || paymentMethod === 'ORANGE_MONEY';

  const handleSubmit = async () => {
    if (!business?.id || !canSubmit) return;

    // Mobile Money → affiche le simulateur USSD d'abord
    if (isMobileMoney) {
      setShowMobileMoneyModal(true);
      return;
    }

    await doSubmit();
  };

  const doSubmit = async () => {
    if (!business?.id || !canSubmit) return;
    const invNum = generateInvoiceNumber();
    setInvoiceNumber(invNum);
    submitRef.current = { cart: [...cart], paymentMethod, ardoiseClient, total };

    const apiPaymentMethod = paymentMethod === 'ARDOISE'
      ? CreateRestaurantOrderBodyPaymentMethod.CASH
      : paymentMethod as ApiPaymentMethod;

    const orderClientName = paymentMethod === 'ARDOISE' && ardoiseClient
      ? ardoiseClient.clientName
      : clientName || undefined;

    try {
      await createOrderAsync({
        data: {
          businessId: business.id,
          tableNumber: tableNumber || undefined,
          clientName: orderClientName,
          items: cart.map(i => ({ productId: i.productId, quantity: i.quantity })),
          paymentMethod: apiPaymentMethod,
        },
      });

      queryClient.invalidateQueries({ queryKey: productsQueryKey });

      // If ardoise: record the debit transaction
      if (paymentMethod === 'ARDOISE' && ardoiseClient) {
        await addCreditTxAsync({
          id: ardoiseClient.id,
          data: {
            businessId: business.id,
            amount: total,
            type: 'DEBIT',
            description: `Commande restaurant${tableNumber ? ` · Table ${tableNumber}` : ''} · ${new Date().toLocaleDateString('fr-FR')}`,
          },
        });
        queryClient.invalidateQueries({
          queryKey: getListCustomerCreditsQueryKey({ businessId: business.id }),
        });
      }

      setShowSuccess(true);
    } catch {
      toast({ title: 'Erreur', description: "Impossible de traiter la commande", variant: 'destructive' });
    }
  };

  const handlePrintInvoice = async () => {
    if (!business) return;
    const snap = submitRef.current;
    if (snap.cart.length === 0) return;
    setIsPrinting(true);
    try {
      await generateInvoicePDF({
        businessName: billingSettings?.businessName ?? business.name,
        businessAddress: billingSettings?.address ?? undefined,
        businessPhone: billingSettings?.phone ?? undefined,
        businessLogo: billingSettings?.logoUrl ?? undefined,
        invoiceNumber,
        date: new Date().toLocaleDateString('fr-FR'),
        items: snap.cart.map(i => ({ name: i.name, quantity: i.quantity, unitPrice: i.price })),
        paymentMethod: snap.paymentMethod === 'ARDOISE'
          ? 'Ardoise client'
          : PAYMENT_OPTIONS.find(p => p.value === snap.paymentMethod)?.label ?? String(snap.paymentMethod),
        clientName: snap.ardoiseClient?.clientName || clientName || undefined,
        tableNumber: tableNumber || undefined,
        withTVA: false,
      });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de générer la facture', variant: 'destructive' });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    setCart([]);
    setTableNumber('');
    setClientName('');
    setPaymentMethod('CASH');
    setArdoiseClient(null);
    setInvoiceNumber('');
  };

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'hsl(var(--background))' }}>
      {/* LEFT — Product catalog */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top bar */}
        <div
          className="shrink-0 flex items-center gap-4 px-5 py-3"
          style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
        >
          <div className="flex-1 flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: 'hsl(var(--muted))' }}>
            <Search className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un article..."
              className="bg-transparent flex-1 text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')}>
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-bold text-foreground">{filtered.length}</span> articles
          </div>
        </div>

        {/* Category tabs */}
        <div
          className="shrink-0 flex gap-2 px-5 py-3 overflow-x-auto"
          style={{ borderBottom: '1px solid hsl(var(--border))' }}
        >
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all',
                activeCategory === cat ? 'text-black' : 'text-muted-foreground hover:text-foreground',
              )}
              style={activeCategory === cat
                ? { background: 'hsl(38 90% 56%)' }
                : { background: 'hsl(var(--muted))' }
              }
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-5">
            <div className="space-y-3">
              {quickCategories.map(category => (
                <div key={category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground">{category}</p>
                    <span className="text-[10px] text-muted-foreground">{quickProducts.filter(p => p.category === category).length} rapides</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {quickProducts.filter(p => p.category === category).map(product => (
                      <button
                        key={product.id}
                        onClick={() => addQuickProduct(product)}
                        className="flex flex-col items-start gap-1.5 p-3 rounded-xl text-left transition-all"
                        style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      >
                        <span className="text-xl leading-none">{product.emoji}</span>
                        <div className="w-full">
                          <p className="text-[11px] font-semibold text-foreground leading-tight">{product.name}</p>
                          <p className="text-[10px] font-bold mt-0.5" style={{ color: 'hsl(38 90% 56%)' }}>
                            {formatXAF(product.price)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs font-bold text-foreground mb-3">Catalogue complet</p>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array(12).fill(0).map((_, i) => <Skeleton key={i} className="h-[120px] rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <p className="text-4xl">🍽️</p>
              <p className="text-sm text-muted-foreground">Aucun article trouvé</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map(product => {
                const inCart = cart.find(i => i.productId === product.id);
                return (
                  <motion.button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    whileTap={{ scale: 0.97 }}
                    className="relative flex flex-col items-start gap-2 p-4 rounded-xl text-left transition-all"
                    style={{
                      background: inCart ? 'hsl(38 90% 56% / 0.1)' : 'hsl(var(--card))',
                      border: `1px solid ${inCart ? 'hsl(38 90% 56% / 0.5)' : 'hsl(var(--border))'}`,
                    }}
                  >
                    {inCart && (
                      <span
                        className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{ background: 'hsl(38 90% 56%)', color: '#000' }}
                      >
                        {inCart.quantity}
                      </span>
                    )}
                    <span className="text-3xl leading-none">{product.emoji || '🍽️'}</span>
                    <div className="w-full">
                      <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{product.name}</p>
                      <p className="text-xs font-bold mt-1" style={{ color: 'hsl(38 90% 56%)' }}>
                        {formatXAF(product.price)}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
            </div>
        </div>
      </div>

      {/* RIGHT — Cart panel */}
      <div
        className="relative w-[320px] shrink-0 flex flex-col overflow-hidden"
        style={{ borderLeft: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
      >
        <AnimatePresence>
          {showSuccess && (
            <SuccessOverlay
              onClose={handleSuccessClose}
              onPrintInvoice={handlePrintInvoice}
              isPrinting={isPrinting}
              isArdoise={submitRef.current.paymentMethod === 'ARDOISE'}
              ardoiseClient={submitRef.current.ardoiseClient}
            />
          )}
        </AnimatePresence>

        {/* Cart header */}
        <div
          className="shrink-0 flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid hsl(var(--border))' }}
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-foreground" strokeWidth={1.5} />
            <span className="text-sm font-bold text-foreground">Commande en cours</span>
          </div>
          {cartCount > 0 && (
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ background: 'hsl(38 90% 56%)', color: '#000' }}
            >
              {cartCount}
            </span>
          )}
        </div>

        {/* Table + Client (hidden when ardoise selected — client comes from selector) */}
        <div className="shrink-0 px-5 py-3 space-y-2.5" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'hsl(var(--muted))' }}>
            <TableProperties className="w-3.5 h-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
            <input
              value={tableNumber}
              onChange={e => setTableNumber(e.target.value)}
              placeholder="N° de table (optionnel)"
              className="bg-transparent flex-1 text-xs text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
          {paymentMethod !== 'ARDOISE' && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'hsl(var(--muted))' }}>
              <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
              <input
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="Nom du client (optionnel)"
                className="bg-transparent flex-1 text-xs text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-3 space-y-2">
          <AnimatePresence mode="popLayout">
            {cart.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full gap-3 py-12 text-center"
              >
                <ShoppingCart className="w-10 h-10 text-muted-foreground/30" strokeWidth={1} />
                <p className="text-xs text-muted-foreground">Aucun article dans la commande</p>
                <p className="text-[11px] text-muted-foreground/60">Cliquez sur les articles à gauche</p>
              </motion.div>
            ) : (
              cart.map(item => (
                <motion.div
                  key={item.productId}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'hsl(var(--muted))' }}
                >
                  <span className="text-xl shrink-0">{item.emoji || '🍽️'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground">{formatXAF(item.price * item.quantity)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => updateQty(item.productId, -1)}
                      className="w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
                      style={{ background: 'hsl(var(--card))' }}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.productId, 1)}
                      className="w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
                      style={{ background: 'hsl(var(--card))' }}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-destructive transition-all hover:bg-destructive/10 ml-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Payment + Submit */}
        <div className="shrink-0 px-5 py-4 space-y-3" style={{ borderTop: '1px solid hsl(var(--border))' }}>
          {/* Payment method grid */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Mode de paiement
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {PAYMENT_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const isActive = paymentMethod === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setPaymentMethod(opt.value);
                      if (opt.value !== 'ARDOISE') setArdoiseClient(null);
                    }}
                    className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl text-[10px] font-semibold transition-all"
                    style={{
                      background: isActive ? `${opt.color}18` : 'hsl(var(--muted))',
                      border: `1px solid ${isActive ? opt.color + '60' : 'transparent'}`,
                      color: isActive ? opt.color : 'hsl(var(--muted-foreground))',
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span className="truncate w-full text-center">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ardoise client selector */}
          <AnimatePresence>
            {paymentMethod === 'ARDOISE' && business && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <ArdoiseSelector
                  businessId={business.id}
                  total={total}
                  selected={ardoiseClient}
                  onSelect={setArdoiseClient}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Total */}
          <div
            className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ background: 'hsl(var(--muted))' }}
          >
            <span className="text-sm text-muted-foreground font-medium">Total</span>
            <span className="text-xl font-extrabold text-foreground" style={{ letterSpacing: '-0.02em' }}>
              {formatXAF(total)}
            </span>
          </div>

          {/* Submit */}
          <motion.button
            onClick={handleSubmit}
            disabled={!canSubmit || isPending}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: canSubmit
                ? paymentMethod === 'ARDOISE'
                  ? 'linear-gradient(135deg, #8B5CF6, #7C3AED)'
                  : 'linear-gradient(135deg, hsl(38 90% 56%), hsl(38 90% 46%))'
                : 'hsl(var(--muted))',
              color: canSubmit ? (paymentMethod === 'ARDOISE' ? '#fff' : '#000') : 'hsl(var(--muted-foreground))',
              boxShadow: canSubmit
                ? paymentMethod === 'ARDOISE'
                  ? '0 4px 16px #8B5CF640'
                  : '0 4px 16px hsl(38 90% 56% / 0.3)'
                : 'none',
            }}
          >
            {isPending ? (
              <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            ) : ardoiseMissingClient ? (
              <>
                <BookMarked className="w-4 h-4" />
                Choisir un client ardoise
              </>
            ) : paymentMethod === 'ARDOISE' ? (
              <>
                <BookMarked className="w-4 h-4" />
                Ajouter à l&apos;ardoise
                <ChevronRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Envoyer en cuisine
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* ── Simulateur Mobile Money ── */}
      <MobileMoneyModal
        open={showMobileMoneyModal}
        amount={total}
        label={`Commande restaurant${tableNumber ? ` · Table ${tableNumber}` : ''}`}
        onSuccess={() => {
          setShowMobileMoneyModal(false);
          doSubmit();
        }}
        onClose={() => setShowMobileMoneyModal(false)}
      />
    </div>
  );
}
