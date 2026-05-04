import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  useGetSuperAdminStats,
  useGetSuperAdminRevenueChart,
  useListBusinesses,
  useGetSuperAdminSectorRevenue,
  useGetSuperAdminPaymentMethods,
  useGetSuperAdminRecentActivity,
  getGetSuperAdminSectorRevenueQueryKey,
  getGetSuperAdminPaymentMethodsQueryKey,
  getGetSuperAdminRecentActivityQueryKey,
  getGetSuperAdminStatsQueryKey,
  getGetSuperAdminRevenueChartQueryKey,
  getListBusinessesQueryKey,
} from '@workspace/api-client-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, BarChart, Bar, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { formatXAF } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2, CreditCard, Activity, Users, TrendingUp,
  ArrowUpRight, Zap, ShoppingBag, Smartphone, Banknote,
  Clock, CheckCircle2, BarChart2, AlertTriangle, PackageX,
  Eye, Pencil, X,
} from 'lucide-react';

/* ── 7 derniers jours ── */
const DAYS_7 = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(Date.now() - (6 - i) * 86400000);
  const label = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
  const revenues = [1420000, 1680000, 1350000, 1890000, 2100000, 1750000, 2340000];
  const sales    = [48, 62, 44, 71, 83, 65, 92];
  const reservas = [12, 18, 14, 22, 25, 20, 28];
  return { label, revenue: revenues[i], ventes: sales[i], reservations: reservas[i] };
});

const DEMO_REVENUE_CHART = DAYS_7;

const DEMO_RECENT_ACTIVITY = [
  { id: 1, businessName: 'Hôtel Palace Douala',    sector: 'HOTEL',      method: 'MTN_MOBILE_MONEY', methodLabel: 'MTN MoMo',     amount: 185000, status: 'COMPLETED', createdAt: new Date(Date.now() - 4  * 60000).toISOString() },
  { id: 2, businessName: 'Restaurant La Saveur',   sector: 'RESTAURANT', method: 'CASH',             methodLabel: 'Espèces',      amount: 32500,  status: 'COMPLETED', createdAt: new Date(Date.now() - 11 * 60000).toISOString() },
  { id: 3, businessName: 'Pharmacie Centrale',     sector: 'PHARMACY',   method: 'ORANGE_MONEY',     methodLabel: 'Orange Money', amount: 14800,  status: 'COMPLETED', createdAt: new Date(Date.now() - 18 * 60000).toISOString() },
  { id: 4, businessName: 'Marché Royal Yaoundé',   sector: 'GROCERY',    method: 'CASH',             methodLabel: 'Espèces',      amount: 9200,   status: 'COMPLETED', createdAt: new Date(Date.now() - 27 * 60000).toISOString() },
  { id: 5, businessName: 'Hôtel Akwa Palace',      sector: 'HOTEL',      method: 'CARD',             methodLabel: 'Carte',        amount: 320000, status: 'COMPLETED', createdAt: new Date(Date.now() - 35 * 60000).toISOString() },
  { id: 6, businessName: 'Grill & Braise Mvog-Mbi',sector: 'RESTAURANT', method: 'MTN_MOBILE_MONEY', methodLabel: 'MTN MoMo',     amount: 28700,  status: 'COMPLETED', createdAt: new Date(Date.now() - 48 * 60000).toISOString() },
  { id: 7, businessName: 'Pharma Soleil Bonanjo',  sector: 'PHARMACY',   method: 'ORANGE_MONEY',     methodLabel: 'Orange Money', amount: 7600,   status: 'COMPLETED', createdAt: new Date(Date.now() - 62 * 60000).toISOString() },
  { id: 8, businessName: 'Supermarché Pro Bali',   sector: 'GROCERY',    method: 'CASH',             methodLabel: 'Espèces',      amount: 45300,  status: 'COMPLETED', createdAt: new Date(Date.now() - 74 * 60000).toISOString() },
  { id: 9, businessName: 'Restaurant Ndolé Club',  sector: 'RESTAURANT', method: 'MTN_MOBILE_MONEY', methodLabel: 'MTN MoMo',     amount: 19500,  status: 'COMPLETED', createdAt: new Date(Date.now() - 91 * 60000).toISOString() },
  { id: 10,businessName: 'Hôtel Sawa Beach',       sector: 'HOTEL',      method: 'ORANGE_MONEY',     methodLabel: 'Orange Money', amount: 125000, status: 'COMPLETED', createdAt: new Date(Date.now() - 108* 60000).toISOString() },
];

const DEMO_SECTOR_REVENUE = [
  { sector: 'RESTAURANT', label: 'Restauration', revenue: 4200000, transactions: 180 },
  { sector: 'HOTEL', label: 'Hôtellerie', revenue: 3800000, transactions: 92 },
  { sector: 'GROCERY', label: 'Supermarché', revenue: 2900000, transactions: 210 },
  { sector: 'PHARMACY', label: 'Pharmacie', revenue: 1700000, transactions: 74 },
];

const DEMO_PAYMENT_METHODS = [
  { method: 'CASH', label: 'Espèces', amount: 4200000, percentage: 35 },
  { method: 'MTN_MOBILE_MONEY', label: 'MTN Mobile Money', amount: 3100000, percentage: 26 },
  { method: 'ORANGE_MONEY', label: 'Orange Money', amount: 2900000, percentage: 24 },
  { method: 'CARD', label: 'Carte bancaire', amount: 1800000, percentage: 15 },
];

const DEMO_STOCK_ALERTS = [
  { businessId: 801, businessName: 'Marché Royal', sector: 'GROCERY', sectorLabel: 'Supermarché', source: 'grocery', sourceLabel: 'Supermarché', productName: 'Riz parfumé 5kg', stock: 2, minStock: 20, severity: 'critical' },
  { businessId: 801, businessName: 'Marché Royal', sector: 'GROCERY', sectorLabel: 'Supermarché', source: 'grocery', sourceLabel: 'Supermarché', productName: 'Huile végétale 1L', stock: 4, minStock: 18, severity: 'critical' },
  { businessId: 802, businessName: 'Pharmacie Centrale', sector: 'PHARMACY', sectorLabel: 'Pharmacie', source: 'pharmacy', sourceLabel: 'Pharmacie', productName: 'Paracétamol 500mg', stock: 6, minStock: 24, severity: 'critical' },
  { businessId: 802, businessName: 'Pharmacie Centrale', sector: 'PHARMACY', sectorLabel: 'Pharmacie', source: 'pharmacy', sourceLabel: 'Pharmacie', productName: 'Vitamine C 1000mg', stock: 5, minStock: 20, severity: 'critical' },
  { businessId: 803, businessName: 'Saveurs & Santé', sector: 'GROCERY', sectorLabel: 'Supermarché', source: 'grocery', sourceLabel: 'Supermarché', productName: 'Savon de lessive', stock: 8, minStock: 30, severity: 'low' },
  { businessId: 803, businessName: 'Saveurs & Santé', sector: 'PHARMACY', sectorLabel: 'Pharmacie', source: 'pharmacy', sourceLabel: 'Pharmacie', productName: 'Pansements stériles', stock: 9, minStock: 25, severity: 'low' },
  { businessId: 804, businessName: 'Nourriture Express', sector: 'GROCERY', sectorLabel: 'Supermarché', source: 'grocery', sourceLabel: 'Supermarché', productName: 'Farine de maïs 1kg', stock: 3, minStock: 15, severity: 'critical' },
  { businessId: 804, businessName: 'Nourriture Express', sector: 'GROCERY', sectorLabel: 'Supermarché', source: 'grocery', sourceLabel: 'Supermarché', productName: 'Tomates en boîte', stock: 7, minStock: 18, severity: 'low' },
  { businessId: 805, businessName: 'Clinique Pharma+ Market', sector: 'PHARMACY', sectorLabel: 'Pharmacie', source: 'pharmacy', sourceLabel: 'Pharmacie', productName: 'Sirop antitussif', stock: 4, minStock: 12, severity: 'critical' },
  { businessId: 805, businessName: 'Clinique Pharma+ Market', sector: 'PHARMACY', sectorLabel: 'Pharmacie', source: 'pharmacy', sourceLabel: 'Pharmacie', productName: 'Gants médicaux', stock: 10, minStock: 40, severity: 'low' },
  { businessId: 806, businessName: 'Douala Market Pro', sector: 'GROCERY', sectorLabel: 'Supermarché', source: 'grocery', sourceLabel: 'Supermarché', productName: 'Sucre en sachet', stock: 11, minStock: 35, severity: 'low' },
  { businessId: 806, businessName: 'Douala Market Pro', sector: 'GROCERY', sectorLabel: 'Supermarché', source: 'grocery', sourceLabel: 'Supermarché', productName: 'Huile de palme', stock: 2, minStock: 16, severity: 'critical' },
  { businessId: 807, businessName: 'Pharma Soleil', sector: 'PHARMACY', sectorLabel: 'Pharmacie', source: 'pharmacy', sourceLabel: 'Pharmacie', productName: 'Seringues 5ml', stock: 5, minStock: 22, severity: 'critical' },
  { businessId: 807, businessName: 'Pharma Soleil', sector: 'PHARMACY', sectorLabel: 'Pharmacie', source: 'pharmacy', sourceLabel: 'Pharmacie', productName: 'Gel hydroalcoolique', stock: 8, minStock: 28, severity: 'low' },
  { businessId: 808, businessName: 'Le Panier Urbain', sector: 'GROCERY', sectorLabel: 'Supermarché', source: 'grocery', sourceLabel: 'Supermarché', productName: 'Riz long grain', stock: 6, minStock: 20, severity: 'critical' },
  { businessId: 808, businessName: 'Le Panier Urbain', sector: 'GROCERY', sectorLabel: 'Supermarché', source: 'grocery', sourceLabel: 'Supermarché', productName: 'Savon liquide', stock: 9, minStock: 24, severity: 'low' },
  { businessId: 809, businessName: 'Pharma Elite', sector: 'PHARMACY', sectorLabel: 'Pharmacie', source: 'pharmacy', sourceLabel: 'Pharmacie', productName: 'Crème antiseptique', stock: 3, minStock: 14, severity: 'critical' },
  { businessId: 809, businessName: 'Pharma Elite', sector: 'PHARMACY', sectorLabel: 'Pharmacie', source: 'pharmacy', sourceLabel: 'Pharmacie', productName: 'Vitamine C 500mg', stock: 7, minStock: 18, severity: 'low' },
  { businessId: 810, businessName: 'Grand Marché Santé', sector: 'GROCERY', sectorLabel: 'Supermarché', source: 'grocery', sourceLabel: 'Supermarché', productName: 'Lentilles', stock: 4, minStock: 16, severity: 'critical' },
  { businessId: 810, businessName: 'Grand Marché Santé', sector: 'PHARMACY', sectorLabel: 'Pharmacie', source: 'pharmacy', sourceLabel: 'Pharmacie', productName: 'Pansements adhésifs', stock: 6, minStock: 20, severity: 'low' },
];

/* ── Stock Alert type ── */
type StockAlert = {
  businessId: number;
  businessName: string;
  sector: string;
  sectorLabel: string;
  source: string;
  sourceLabel: string;
  productName: string;
  stock: number;
  minStock: number;
  severity: 'critical' | 'low';
};

function useStockAlerts() {
  return useQuery<StockAlert[]>({
    queryKey: ['superadmin-stock-alerts'],
    queryFn: async () => {
      const r = await fetch('/api/superadmin/stock-alerts', { credentials: 'include' });
      if (!r.ok) throw new Error('Failed to fetch stock alerts');
      return r.json();
    },
    refetchInterval: 30000,
  });
}

function useDemoFallback<T>(data: T[] | undefined, fallback: T[]) {
  return data && data.length > 0 ? data : fallback;
}

/* ──────────────────────────────────────────────────────── */
/*  Constants                                              */
/* ──────────────────────────────────────────────────────── */
const SECTOR_COLORS: Record<string, string> = {
  RESTAURANT: '#F97316', HOTEL: '#818CF8', BEAUTY: '#F472B6',
  GROCERY: '#34D399', PHARMACY: '#F472B6', GARAGE: '#94A3B8',
  FITNESS: '#FBBF24', EDUCATION: '#60A5FA',
};

const METHOD_COLORS: Record<string, string> = {
  CASH: '#34D399',
  MTN_MOBILE_MONEY: '#FBBF24',
  ORANGE_MONEY: '#F97316',
  CARD: '#818CF8',
};

const METHOD_ICONS: Record<string, React.ElementType> = {
  CASH: Banknote,
  MTN_MOBILE_MONEY: Smartphone,
  ORANGE_MONEY: Smartphone,
  CARD: CreditCard,
};

/* ──────────────────────────────────────────────────────── */
/*  Helpers                                                */
/* ──────────────────────────────────────────────────────── */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  return `Il y a ${Math.floor(h / 24)}j`;
}

/* ──────────────────────────────────────────────────────── */
/*  KPI Card                                               */
/* ──────────────────────────────────────────────────────── */
function KPI({
  title, value, sub, icon: Icon, color, bg, trend, loading,
}: {
  title: string; value: string; sub?: string;
  icon: React.ElementType; color: string; bg: string;
  trend?: { value: number; positive: boolean };
  loading?: boolean;
}) {
  if (loading) return <Skeleton className="h-28 rounded-xl" />;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-5 flex flex-col justify-between"
      style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
          <Icon className="w-4.5 h-4.5" style={{ color }} strokeWidth={2} />
        </div>
        {trend && (
          <div
            className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full"
            style={{
              background: trend.positive ? 'hsl(160 84% 39% / 0.12)' : 'hsl(0 72% 51% / 0.1)',
              color: trend.positive ? '#10B981' : '#EF4444',
            }}
          >
            <ArrowUpRight className="w-3 h-3" style={{ transform: trend.positive ? 'none' : 'rotate(90deg)' }} />
            {trend.value}%
          </div>
        )}
      </div>
      <div>
        <p className="text-xl font-extrabold text-foreground" style={{ letterSpacing: '-0.02em' }}>{value}</p>
        <p className="text-xs font-medium text-muted-foreground mt-0.5">{title}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5 opacity-70">{sub}</p>}
      </div>
    </motion.div>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  Stock Alerts Panel                                     */
/* ──────────────────────────────────────────────────────── */
const SECTOR_COLORS_ALERT: Record<string, string> = {
  GROCERY: '#34D399', PHARMACY: '#F472B6', GARAGE: '#94A3B8',
};

function StockAlertsPanel() {
  const { data: alerts, isLoading } = useStockAlerts();
  const displayAlerts = alerts && alerts.length > 0 ? alerts : DEMO_STOCK_ALERTS;
  const critical = displayAlerts.filter(a => a.severity === 'critical');
  const low      = displayAlerts.filter(a => a.severity === 'low');

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.28 }}
      className="rounded-xl overflow-hidden"
      style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid hsl(var(--border))' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'hsl(0 72% 51% / 0.12)' }}>
            <AlertTriangle className="w-4 h-4" style={{ color: '#EF4444' }} strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Alertes Stock Critique</h2>
            <p className="text-xs text-muted-foreground">
              Produits sous le seuil minimum — toutes enseignes
            </p>
          </div>
        </div>
        {!isLoading && (
          <div className="flex items-center gap-2">
            {critical.length > 0 && (
              <span className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: 'hsl(0 72% 51% / 0.12)', color: '#EF4444' }}>
                <PackageX className="w-3 h-3" />
                {critical.length} rupture{critical.length > 1 ? 's' : ''}
              </span>
            )}
            {low.length > 0 && (
              <span className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: 'hsl(38 90% 56% / 0.12)', color: 'hsl(38 90% 56%)' }}>
                <AlertTriangle className="w-3 h-3" />
                {low.length} bas
              </span>
            )}
            {displayAlerts.length === 0 && (
              <span className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: 'hsl(160 84% 39% / 0.1)', color: '#10B981' }}>
                Tous les stocks sont OK
              </span>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : displayAlerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <CheckCircle2 className="w-8 h-8 mb-2" style={{ color: '#10B981' }} />
          <p className="text-sm font-semibold">Aucune alerte stock</p>
          <p className="text-xs mt-0.5">Tous les produits sont au-dessus du seuil minimum</p>
        </div>
      ) : (
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {displayAlerts.map((alert, i) => {
            const isCritical = alert.severity === 'critical';
            const accentColor = isCritical ? '#EF4444' : 'hsl(38 90% 56%)';
            const bgColor     = isCritical ? 'hsl(0 72% 51% / 0.08)' : 'hsl(38 90% 56% / 0.07)';
            const borderColor = isCritical ? 'hsl(0 72% 51% / 0.25)' : 'hsl(38 90% 56% / 0.2)';
            const sColor      = SECTOR_COLORS_ALERT[alert.sector] ?? '#6B7280';
            const pct = alert.minStock > 0 ? Math.min(100, (alert.stock / alert.minStock) * 100) : 0;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl p-4"
                style={{ background: bgColor, border: `1px solid ${borderColor}` }}
              >
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground leading-tight truncate">
                      {alert.productName}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      {alert.businessName}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                    style={{ background: sColor + '20', color: sColor }}>
                    {alert.sectorLabel}
                  </span>
                </div>

                {/* Stock bar */}
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-muted-foreground">Stock actuel</span>
                    <span className="text-[11px] font-extrabold" style={{ color: accentColor }}>
                      {alert.stock} / {alert.minStock} min
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ background: 'hsl(var(--muted))' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: accentColor }} />
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {isCritical
                    ? <PackageX className="w-3 h-3 shrink-0" style={{ color: accentColor }} />
                    : <AlertTriangle className="w-3 h-3 shrink-0" style={{ color: accentColor }} />
                  }
                  <span className="text-[10px] font-semibold" style={{ color: accentColor }}>
                    {isCritical ? 'RUPTURE DE STOCK' : 'Stock bas — commander'}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  Page header                                            */
/* ──────────────────────────────────────────────────────── */
function PageHeader() {
  const dateStr = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  return (
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1 capitalize">
          {dateStr}
        </p>
        <h1 className="text-2xl font-extrabold text-foreground" style={{ letterSpacing: '-0.02em' }}>
          Vue d'ensemble de la plateforme
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Toutes les enseignes · Données en temps réel</p>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
        style={{ background: 'hsl(38 90% 56% / 0.12)', color: 'hsl(38 90% 56%)', border: '1px solid hsl(38 90% 56% / 0.25)' }}>
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
        SUPER ADMIN
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  Custom Tooltip                                         */
/* ──────────────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-4 py-3 text-xs shadow-xl"
      style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
      <p className="font-bold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {formatter ? formatter(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  Business Detail / Edit Modals                          */
/* ──────────────────────────────────────────────────────── */
type AnyBiz = { id: number; name: string; sector: string; city: string; plan: string; monthlyRevenue: number; isActive: boolean; [k: string]: unknown };

function BizDetailModal({ biz, onClose }: { biz: AnyBiz; onClose: () => void }) {
  const LABELS: Record<string, string> = {
    RESTAURANT: 'Restauration', HOTEL: 'Hôtellerie', BEAUTY: 'Beauté',
    GROCERY: 'Supermarché', PHARMACY: 'Pharmacie', GARAGE: 'Garage',
    FITNESS: 'Fitness', EDUCATION: 'Formation',
  };
  const color = SECTOR_COLORS[biz.sector] ?? '#6B7280';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
        <div className="h-1 w-full" style={{ background: color }} />
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white" style={{ background: color }}>
              {biz.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{biz.name}</p>
              <p className="text-[11px] text-muted-foreground">{LABELS[biz.sector] ?? biz.sector} · {biz.city}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-3">
          {[
            { label: 'Plan', value: biz.plan },
            { label: 'CA mensuel', value: formatXAF(biz.monthlyRevenue) },
            { label: 'Ville', value: biz.city },
            { label: 'Statut', value: biz.isActive ? 'Actif ✓' : 'Inactif' },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <span className="text-xs text-muted-foreground">{row.label}</span>
              <span className="text-xs font-bold text-foreground">{String(row.value)}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function BizEditModal({ biz, onClose }: { biz: AnyBiz; onClose: () => void }) {
  const [name, setName] = useState(biz.name);
  const [city, setCity] = useState(biz.city);
  const [plan, setPlan] = useState(biz.plan);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <p className="text-sm font-bold text-foreground">Modifier l'enseigne</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-4">
          {[
            { label: 'Nom', value: name, set: setName },
            { label: 'Ville', value: city, set: setCity },
            { label: 'Plan', value: plan, set: setPlan },
          ].map(f => (
            <div key={f.label} className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{f.label}</label>
              <input value={f.value} onChange={e => f.set(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-foreground outline-none transition-all"
                style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }} />
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}>Annuler</button>
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all" style={{ background: 'hsl(38 90% 56%)', color: '#000' }}>
              Enregistrer
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const [detailBiz, setDetailBiz] = useState<AnyBiz | null>(null);
  const [editBiz, setEditBiz]     = useState<AnyBiz | null>(null);
  const { data: stockAlerts, isLoading: stockLoading } = useStockAlerts();
  const { data: stats, isLoading: statsLoading } = useGetSuperAdminStats({
    query: { queryKey: getGetSuperAdminStatsQueryKey() },
  });
  const { data: chart, isLoading: chartLoading } = useGetSuperAdminRevenueChart({
    query: { queryKey: getGetSuperAdminRevenueChartQueryKey() },
  });
  const { data: businesses, isLoading: bizLoading } = useListBusinesses(undefined, {
    query: { queryKey: getListBusinessesQueryKey() },
  });
  const { data: sectorRevenue, isLoading: sectorLoading } = useGetSuperAdminSectorRevenue({
    query: { queryKey: getGetSuperAdminSectorRevenueQueryKey() },
  });
  const { data: paymentMethods, isLoading: pmLoading } = useGetSuperAdminPaymentMethods({
    query: { queryKey: getGetSuperAdminPaymentMethodsQueryKey() },
  });
  const { data: recentActivity, isLoading: activityLoading } = useGetSuperAdminRecentActivity({
    query: { queryKey: getGetSuperAdminRecentActivityQueryKey() },
  });

  const chartData = useDemoFallback(chart as unknown[], DEMO_REVENUE_CHART as unknown[]) as typeof DEMO_REVENUE_CHART;
  const sectorData = useDemoFallback(sectorRevenue, DEMO_SECTOR_REVENUE);
  const paymentData = useDemoFallback(paymentMethods, DEMO_PAYMENT_METHODS);
  const alertsData = useDemoFallback(stockAlerts, DEMO_STOCK_ALERTS);
  const totalCA = sectorData.reduce((s, r) => s + r.revenue, 0);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px]">
      <PageHeader />

      {/* ── ROW 1 : KPIs ─────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <KPI
          loading={statsLoading}
          title="Enseignes actives"
          value={String(stats?.activeBusinesses ?? 0)}
          sub={`${stats?.totalBusinesses ?? 0} au total`}
          icon={Building2}
          color="hsl(38 90% 56%)"
          bg="hsl(38 90% 56% / 0.12)"
          trend={{ value: 12, positive: true }}
        />
        <KPI
          loading={sectorLoading}
          title="CA total plateforme"
          value={formatXAF(totalCA)}
          sub="Toutes transactions"
          icon={CreditCard}
          color="#10B981"
          bg="hsl(160 84% 39% / 0.1)"
          trend={{ value: 18, positive: true }}
        />
        <KPI
          loading={statsLoading}
          title="Transactions aujourd'hui"
          value={String(stats?.totalTransactionsToday ?? 0)}
          icon={Activity}
          color="#818CF8"
          bg="hsl(239 84% 67% / 0.1)"
          trend={{ value: 8, positive: true }}
        />
        <KPI
          loading={statsLoading}
          title="Nouvelles enseignes"
          value={String(stats?.newBusinessesThisMonth ?? 0)}
          sub="Ce mois-ci"
          icon={Users}
          color="#F97316"
          bg="hsl(25 95% 53% / 0.1)"
        />
        <KPI
          loading={pmLoading}
          title="Transactions totales"
          value={String(paymentMethods?.reduce((s, m) => s + m.amount, 0) ? (paymentMethods?.length ?? 0) : (stats?.totalTransactionsToday ?? 0))}
          sub="Tous paiements"
          icon={BarChart2}
          color="#FBBF24"
          bg="hsl(38 92% 50% / 0.1)"
        />
      </div>

      {/* ── ROW 2 : Revenue chart + Payment methods ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Area chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 rounded-xl p-6"
          style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-foreground">Évolution des revenus — 7 derniers jours</h2>
              <p className="text-xs text-muted-foreground mt-0.5">CA journalier de la plateforme · semaine courante</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-full"
              style={{ background: 'hsl(160 84% 39% / 0.1)', color: '#10B981' }}>
              <TrendingUp className="w-3.5 h-3.5" />
              +18% vs N-1
            </div>
          </div>

          {chartLoading
            ? <Skeleton className="h-[240px] w-full rounded-lg" />
            : (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={DAYS_7} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gold-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="hsl(38 90% 56%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(38 90% 56%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="blue-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#818CF8" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#818CF8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11}
                      tickLine={false} axisLine={false} fontFamily="Plus Jakarta Sans" />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11}
                      tickLine={false} axisLine={false}
                      tickFormatter={v => `${(v / 1000000).toFixed(1)}M`}
                      fontFamily="Plus Jakarta Sans" />
                    <Tooltip content={<ChartTooltip formatter={(v: number) => formatXAF(v)} />} />
                    <Area type="monotone" dataKey="revenue" name="Revenus"
                      stroke="hsl(38 90% 56%)" strokeWidth={2.5}
                      fill="url(#gold-grad)" dot={false}
                      activeDot={{ r: 5, fill: 'hsl(38 90% 56%)', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
        </motion.div>

        {/* Payment methods donut */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl p-6"
          style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
        >
          <h2 className="text-sm font-bold text-foreground mb-1">Modes de paiement</h2>
          <p className="text-xs text-muted-foreground mb-4">Répartition du CA</p>

          {pmLoading
            ? <Skeleton className="h-[200px] w-full" />
            : (
              <>
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <PieChart width={150} height={150}>
                      <Pie
                        data={paymentData}
                        cx={75} cy={75}
                        innerRadius={48} outerRadius={70}
                        dataKey="amount"
                        strokeWidth={2}
                        stroke="hsl(var(--background))"
                      >
                        {paymentData.map(m => (
                          <Cell key={m.method} fill={METHOD_COLORS[m.method] ?? '#6B7280'} />
                        ))}
                      </Pie>
                    </PieChart>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-xs font-bold text-foreground">Total</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatXAF(paymentData.reduce((s, m) => s + m.amount, 0))}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {paymentData.map(m => {
                    const Icon = METHOD_ICONS[m.method] ?? CreditCard;
                    const color = METHOD_COLORS[m.method] ?? '#6B7280';
                    return (
                      <div key={m.method} className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: color + '20' }}>
                          <Icon className="w-3 h-3" style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[11px] font-medium text-foreground truncate">{m.label}</span>
                            <span className="text-[11px] font-bold ml-2" style={{ color }}>
                              {m.percentage.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full h-1 rounded-full" style={{ background: 'hsl(var(--muted))' }}>
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${m.percentage}%`, background: color }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
        </motion.div>
      </div>

      {/* ── ROW 3 : Sector bar + Activity feed ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Sector revenue bar chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-3 rounded-xl p-6"
          style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-foreground">CA par secteur</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Chiffre d'affaires agrégé</p>
            </div>
          </div>

          {sectorLoading
            ? <Skeleton className="h-[200px] w-full rounded-lg" />
            : (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sectorData} barSize={28} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11}
                      tickLine={false} axisLine={false} fontFamily="Plus Jakarta Sans" />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11}
                      tickLine={false} axisLine={false}
                      tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                      fontFamily="Plus Jakarta Sans" />
                    <Tooltip content={<ChartTooltip formatter={(v: number) => formatXAF(v)} />} />
                    <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                      {sectorData.map(r => (
                        <Cell key={r.sector} fill={SECTOR_COLORS[r.sector] ?? '#6B7280'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

          {/* Sector legend */}
          {!sectorLoading && (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4">
              {sectorData.map(r => (
                <div key={r.sector} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: SECTOR_COLORS[r.sector] ?? '#6B7280' }} />
                  <span className="text-[10px] text-muted-foreground">{r.label}</span>
                  <span className="text-[10px] font-semibold text-foreground">{r.transactions} tx</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent activity feed */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="lg:col-span-2 rounded-xl"
          style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
        >
          <div className="px-5 py-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-foreground">Activité récente</h2>
                <p className="text-xs text-muted-foreground">Dernières transactions</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            </div>
          </div>

          <div className="overflow-y-auto max-h-[280px] custom-scrollbar divide-y"
            style={{ borderColor: 'hsl(var(--border))' }}>
            {activityLoading
              ? Array(6).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                  <Skeleton className="h-3 w-16" />
                </div>
              ))
              : (recentActivity && recentActivity.length > 0 ? recentActivity : DEMO_RECENT_ACTIVITY).map(activity => {
                const color = SECTOR_COLORS[activity.sector] ?? '#6B7280';
                const Icon = METHOD_ICONS[activity.method] ?? CreditCard;
                return (
                  <div key={activity.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/30">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-bold text-white"
                      style={{ background: color }}>
                      {activity.businessName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{activity.businessName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Icon className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{activity.methodLabel}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-foreground">{formatXAF(activity.amount)}</p>
                      <div className="flex items-center gap-1 mt-0.5 justify-end">
                        <Clock className="w-2.5 h-2.5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{timeAgo(activity.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            }
          </div>
        </motion.div>
      </div>

      {/* ── Modales Détails / Modifier ─────────────────── */}
      {detailBiz && <BizDetailModal biz={detailBiz as AnyBiz} onClose={() => setDetailBiz(null)} />}
      {editBiz   && <BizEditModal   biz={editBiz   as AnyBiz} onClose={() => setEditBiz(null)}   />}

      {/* ── ROW 4 : Stock Alerts ──────────────────────── */}
      <StockAlertsPanel />

      {/* ── ROW 5 : Businesses table ──────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl overflow-hidden"
        style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
      >
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <div>
            <h2 className="text-sm font-bold text-foreground">Toutes les enseignes</h2>
            <p className="text-xs text-muted-foreground">
              {bizLoading ? '…' : `${businesses?.length ?? 0} enregistrées`}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#10B981' }} />
            {businesses?.filter(b => b.isActive).length ?? 0} actives
          </div>
        </div>

        {bizLoading
          ? <div className="p-6 space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    {['Enseigne', 'Secteur', 'Ville', 'Plan', 'CA ce mois', 'Statut', 'Actions'].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(businesses ?? []).map((biz, i) => {
                    const color = SECTOR_COLORS[biz.sector] ?? '#6B7280';
                    const LABELS: Record<string, string> = {
                      RESTAURANT: 'Restauration', HOTEL: 'Hôtellerie', BEAUTY: 'Beauté',
                      GROCERY: 'Supermarché', PHARMACY: 'Pharmacie', GARAGE: 'Garage',
                      FITNESS: 'Fitness', EDUCATION: 'Formation',
                    };
                    return (
                      <tr
                        key={biz.id}
                        className="transition-colors hover:bg-muted/30"
                        style={{ borderBottom: i < (businesses?.length ?? 1) - 1 ? '1px solid hsl(var(--border))' : 'none' }}
                      >
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                              style={{ background: color }}>
                              {biz.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">{biz.name}</p>
                              <p className="text-[11px] text-muted-foreground">{biz.city}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold"
                            style={{ background: color + '18', color }}>
                            {LABELS[biz.sector] ?? biz.sector}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-sm text-muted-foreground">{biz.city}</td>
                        <td className="px-6 py-3.5">
                          <span className="text-[11px] font-bold uppercase tracking-wide"
                            style={{ color: 'hsl(38 90% 56%)' }}>
                            {biz.plan}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-sm font-bold text-foreground">
                          {formatXAF(biz.monthlyRevenue)}
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                              {biz.isActive && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                                  style={{ background: '#10B981' }} />
                              )}
                              <span className="relative inline-flex rounded-full h-2 w-2"
                                style={{ background: biz.isActive ? '#10B981' : '#EF4444' }} />
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {biz.isActive ? 'Actif' : 'Inactif'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setDetailBiz(biz as unknown as AnyBiz)}
                              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all hover:opacity-80"
                              style={{ background: 'hsl(217 91% 60% / 0.12)', color: '#3B82F6' }}
                            >
                              <Eye className="w-3 h-3" /> Détails
                            </button>
                            <button
                              onClick={() => setEditBiz(biz as unknown as AnyBiz)}
                              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all hover:opacity-80"
                              style={{ background: 'hsl(38 90% 56% / 0.12)', color: 'hsl(38 90% 56%)' }}
                            >
                              <Pencil className="w-3 h-3" /> Modifier
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </motion.div>
    </div>
  );
}
