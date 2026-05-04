import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { AccessDeniedPage } from '@/components/permission-guard';
import { DashboardHero } from '@/components/dashboard-hero';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Shield, Search, X, Filter, RefreshCw,
  User, Clock, ChevronDown, ChevronRight,
  Users, Lock, Unlock, Eye, TrendingUp,
  LogIn, Calendar, DollarSign, Package,
  AlertTriangle, CheckCircle2, Settings,
  Crown, Star, UserCheck, Activity,
} from 'lucide-react';

/* ═══════════════════════════════════════════
   TYPES
═══════════════════════════════════════════ */
interface ActivityLog {
  id: number;
  businessId: number | null;
  userId: number | null;
  userName: string;
  userRole: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  description: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'OWNER' | 'MANAGER' | 'STAFF';
  businessId: number | null;
  createdAt: string;
}

/* ═══════════════════════════════════════════
   CONFIG ACTIONS
═══════════════════════════════════════════ */
const ACTION_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  LOGIN:               { label: 'Connexion',           color: '#60A5FA', bg: 'hsl(217 91% 60% / 0.12)', icon: LogIn        },
  CHECK_IN:            { label: 'Check-In',            color: '#10B981', bg: 'hsl(160 84% 39% / 0.12)', icon: LogIn        },
  CHECK_OUT:           { label: 'Check-Out',           color: '#6B7280', bg: 'hsl(220 9% 46% / 0.12)',  icon: LogIn        },
  RESERVATION_CREATED: { label: 'Réservation créée',   color: '#3B82F6', bg: 'hsl(217 91% 60% / 0.12)', icon: Calendar     },
  REPORT_VIEWED:       { label: 'Rapport consulté',    color: '#A78BFA', bg: 'hsl(262 83% 58% / 0.12)', icon: TrendingUp   },
  DISCOUNT_APPLIED:    { label: 'Remise accordée',     color: '#F59E0B', bg: 'hsl(38 90% 56% / 0.12)',  icon: DollarSign   },
  ROOM_STATUS_CHANGED: { label: 'Statut chambre',      color: '#818CF8', bg: 'hsl(239 84% 67% / 0.12)', icon: Package      },
  ORDER_DELETED:       { label: 'Commande supprimée',  color: '#EF4444', bg: 'hsl(0 72% 51% / 0.12)',   icon: AlertTriangle},
  STOCK_ADJUSTED:      { label: 'Stock ajusté',        color: '#F97316', bg: 'hsl(25 95% 53% / 0.12)',  icon: Package      },
  PAYMENT_PROCESSED:   { label: 'Paiement traité',     color: '#10B981', bg: 'hsl(160 84% 39% / 0.12)', icon: DollarSign   },
  PRESCRIPTION_CREATED:{ label: 'Ordonnance créée',    color: '#F472B6', bg: 'hsl(330 81% 60% / 0.12)', icon: CheckCircle2 },
  ROLE_CHANGED:        { label: 'Rôle modifié',        color: 'hsl(38 90% 56%)', bg: 'hsl(38 90% 56% / 0.12)', icon: Shield },
};

const defaultAction = { label: 'Action', color: '#94A3B8', bg: 'hsl(215 20% 65% / 0.12)', icon: Activity };

/* ═══════════════════════════════════════════
   CONFIG RÔLES
═══════════════════════════════════════════ */
const ROLE_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  SUPER_ADMIN: { label: 'Super Admin', color: 'hsl(38 90% 56%)', bg: 'hsl(38 90% 56% / 0.12)', icon: Crown     },
  OWNER:       { label: 'Patron',      color: '#A78BFA',          bg: 'hsl(262 83% 58% / 0.12)', icon: Star      },
  MANAGER:     { label: 'Gérant',      color: '#3B82F6',          bg: 'hsl(217 91% 60% / 0.12)', icon: UserCheck },
  STAFF:       { label: 'Serveur',     color: '#6B7280',          bg: 'hsl(220 9% 46% / 0.12)',  icon: User      },
};

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */
function fmtDateTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000)   return 'à l\'instant';
  if (diff < 3600000) return `il y a ${Math.round(diff / 60000)} min`;
  if (diff < 86400000) return `il y a ${Math.round(diff / 3600000)}h`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function groupByDay(logs: ActivityLog[]): Record<string, ActivityLog[]> {
  return logs.reduce((acc, log) => {
    const day = new Date(log.createdAt).toISOString().split('T')[0];
    if (!acc[day]) acc[day] = [];
    acc[day].push(log);
    return acc;
  }, {} as Record<string, ActivityLog[]>);
}

/* ═══════════════════════════════════════════
   COMPOSANT — Badge action
═══════════════════════════════════════════ */
function ActionBadge({ action }: { action: string }) {
  const cfg = ACTION_CFG[action] ?? defaultAction;
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
      style={{ background: cfg.bg, color: cfg.color }}>
      <Icon className="w-2.5 h-2.5" strokeWidth={2} />
      {cfg.label}
    </span>
  );
}

/* ═══════════════════════════════════════════
   COMPOSANT — Badge rôle
═══════════════════════════════════════════ */
function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CFG[role] ?? { label: role, color: '#94A3B8', bg: 'hsl(220 9% 46% / 0.12)', icon: User };
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0"
      style={{ background: cfg.bg, color: cfg.color }}>
      <Icon className="w-2.5 h-2.5" strokeWidth={2} />
      {cfg.label}
    </span>
  );
}

/* ═══════════════════════════════════════════
   COMPOSANT — Ligne de log expandable
═══════════════════════════════════════════ */
function LogRow({ log }: { log: ActivityLog }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = ACTION_CFG[log.action] ?? defaultAction;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden transition-all"
      style={{ border: `1px solid hsl(var(--border))`, background: 'hsl(var(--card))' }}
    >
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        {/* Icône action */}
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: cfg.bg }}>
          <cfg.icon className="w-4 h-4" style={{ color: cfg.color }} strokeWidth={1.5} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-foreground truncate">{log.description}</span>
            <ActionBadge action={log.action} />
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <User className="w-2.5 h-2.5" />
              {log.userName}
            </span>
            <RoleBadge role={log.userRole} />
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {fmtDateTime(log.createdAt)}
            </span>
          </div>
        </div>

        {/* Expand */}
        <ChevronRight
          className="w-4 h-4 text-muted-foreground shrink-0 transition-transform"
          style={{ transform: expanded ? 'rotate(90deg)' : 'none' }}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: 'hidden', borderTop: '1px solid hsl(var(--border))' }}
          >
            <div className="px-4 py-3 space-y-2 text-xs" style={{ background: 'hsl(var(--muted) / 0.3)' }}>
              <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
                {[
                  { label: 'ID Log',       value: `#${log.id}` },
                  { label: 'Utilisateur',  value: `${log.userName} (ID ${log.userId ?? '—'})` },
                  { label: 'Rôle',         value: log.userRole },
                  { label: 'Action',       value: log.action },
                  ...(log.entityType ? [{ label: 'Entité', value: `${log.entityType} #${log.entityId ?? '?'}` }] : []),
                  ...(log.ipAddress  ? [{ label: 'IP',    value: log.ipAddress }] : []),
                  { label: 'Date/heure', value: new Date(log.createdAt).toLocaleString('fr-FR') },
                ].map(row => (
                  <div key={row.label} className="flex items-start gap-2">
                    <span className="text-muted-foreground shrink-0 w-24">{row.label}</span>
                    <span className="font-semibold text-foreground">{row.value}</span>
                  </div>
                ))}
              </div>
              {log.metadata && (
                <div className="mt-2 p-2 rounded-lg text-[10px] font-mono text-muted-foreground"
                  style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
                  {JSON.stringify(log.metadata, null, 2)}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   COMPOSANT — Onglet Audit Trail
═══════════════════════════════════════════ */
function AuditTrailTab({ businessId }: { businessId: number | null }) {
  const [search, setSearch]       = useState('');
  const [actionFilter, setAction] = useState('');
  const [roleFilter, setRole]     = useState('');
  const [from, setFrom]           = useState('');
  const [to, setTo]               = useState('');
  const [showFilters, setFilters] = useState(false);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (businessId) p.set('businessId', String(businessId));
    if (search)      p.set('search', search);
    if (actionFilter) p.set('action', actionFilter);
    if (roleFilter)  p.set('userRole', roleFilter);
    if (from)        p.set('from', from);
    if (to)          p.set('to', to);
    p.set('limit', '100');
    return p.toString();
  }, [businessId, search, actionFilter, roleFilter, from, to]);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['audit-logs', params],
    queryFn: async () => {
      const res = await fetch(`/api/audit/logs?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Forbidden');
      return res.json() as Promise<{ logs: ActivityLog[]; total: number }>;
    },
    refetchInterval: 30000,
  });

  const { data: actions = [] } = useQuery({
    queryKey: ['audit-actions'],
    queryFn: async () => {
      const res = await fetch('/api/audit/actions', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json() as Promise<string[]>;
    },
  });

  const grouped = useMemo(() => groupByDay(data?.logs ?? []), [data?.logs]);
  const days    = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const activeFilters = [actionFilter, roleFilter, from, to].filter(Boolean).length;

  /* KPIs */
  const logs = data?.logs ?? [];
  const today = new Date().toISOString().split('T')[0];
  const logsToday     = logs.filter(l => l.createdAt.startsWith(today)).length;
  const criticalActions = ['ORDER_DELETED', 'DISCOUNT_APPLIED', 'ROLE_CHANGED', 'STOCK_ADJUSTED'];
  const criticalCount = logs.filter(l => criticalActions.includes(l.action)).length;
  const uniqueUsers   = new Set(logs.map(l => l.userId)).size;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Actions aujourd\'hui', value: logsToday,      color: '#60A5FA', icon: Activity    },
          { label: 'Total enregistrées',  value: data?.total ?? 0, color: 'hsl(38 90% 56%)', icon: Shield },
          { label: 'Actions critiques',   value: criticalCount,    color: '#EF4444', icon: AlertTriangle },
          { label: 'Utilisateurs actifs', value: uniqueUsers,      color: '#10B981', icon: Users       },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${kpi.color}18` }}>
              <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-lg font-extrabold text-foreground leading-none" style={{ color: kpi.color }}>{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Barre recherche + filtres */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl"
          style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}>
          <Search className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par description, utilisateur, action…"
            className="bg-transparent flex-1 text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {search && <button onClick={() => setSearch('')}><X className="w-3.5 h-3.5 text-muted-foreground" /></button>}
        </div>
        <button
          onClick={() => setFilters(f => !f)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0"
          style={{
            background: showFilters ? 'hsl(38 90% 56% / 0.15)' : 'hsl(var(--muted))',
            color: showFilters ? 'hsl(38 90% 56%)' : 'hsl(var(--muted-foreground))',
            border: showFilters ? '1px solid hsl(38 90% 56% / 0.3)' : '1px solid transparent',
          }}
        >
          <Filter className="w-3.5 h-3.5" strokeWidth={1.5} />
          Filtres
          {activeFilters > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: 'hsl(38 90% 56%)', color: '#000' }}>
              {activeFilters}
            </span>
          )}
        </button>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0"
          style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} strokeWidth={1.5} />
        </button>
      </div>

      {/* Panneau filtres avancés */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}
          >
            <div className="p-4 rounded-xl space-y-3"
              style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Filtres avancés</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* Action filter */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Type d&apos;action</label>
                  <select
                    value={actionFilter}
                    onChange={e => setAction(e.target.value)}
                    className="w-full text-xs rounded-lg px-2.5 py-2 outline-none"
                    style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                  >
                    <option value="">Toutes les actions</option>
                    {actions.map(a => (
                      <option key={a} value={a}>{ACTION_CFG[a]?.label ?? a}</option>
                    ))}
                  </select>
                </div>
                {/* Role filter */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Rôle utilisateur</label>
                  <select
                    value={roleFilter}
                    onChange={e => setRole(e.target.value)}
                    className="w-full text-xs rounded-lg px-2.5 py-2 outline-none"
                    style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                  >
                    <option value="">Tous les rôles</option>
                    {Object.entries(ROLE_CFG).filter(([k]) => k !== 'SUPER_ADMIN').map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                {/* From date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Du</label>
                  <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                    className="w-full text-xs rounded-lg px-2.5 py-2 outline-none"
                    style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))', colorScheme: 'dark' }}
                  />
                </div>
                {/* To date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Au</label>
                  <input type="date" value={to} onChange={e => setTo(e.target.value)}
                    className="w-full text-xs rounded-lg px-2.5 py-2 outline-none"
                    style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))', colorScheme: 'dark' }}
                  />
                </div>
              </div>
              {activeFilters > 0 && (
                <button
                  onClick={() => { setAction(''); setRole(''); setFrom(''); setTo(''); }}
                  className="text-[11px] font-semibold"
                  style={{ color: '#EF4444' }}
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline */}
      {isLoading ? (
        <div className="space-y-2">
          {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-[68px] rounded-xl" />)}
        </div>
      ) : days.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Shield className="w-12 h-12 text-muted-foreground/20" strokeWidth={1} />
          <p className="text-sm text-muted-foreground">Aucun log correspondant aux critères</p>
        </div>
      ) : (
        <div className="space-y-6">
          {days.map(day => (
            <div key={day} className="space-y-2">
              <div className="flex items-center gap-3 sticky top-0 z-10 py-1.5"
                style={{ background: 'hsl(var(--background))' }}>
                <div className="h-px flex-1" style={{ background: 'hsl(var(--border))' }} />
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
                  {fmtDate(day)}
                </span>
                <div className="h-px flex-1" style={{ background: 'hsl(var(--border))' }} />
              </div>
              <div className="space-y-2">
                {grouped[day].map(log => <LogRow key={log.id} log={log} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   COMPOSANT — Onglet Gestion des permissions
═══════════════════════════════════════════ */
function PermissionsTab({ businessId }: { businessId: number | null }) {
  const { user: currentUser } = useAuth();
  const { canManageRoles }    = usePermissions();
  const queryClient           = useQueryClient();
  const { toast }             = useToast();
  const [changingId, setChangingId] = useState<number | null>(null);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['audit-team', businessId],
    queryFn: async () => {
      const res = await fetch('/api/audit/team', { credentials: 'include' });
      if (!res.ok) throw new Error('Forbidden');
      return res.json() as Promise<TeamMember[]>;
    },
  });

  const { mutate: changeRole, isPending } = useMutation({
    mutationFn: async ({ id, role }: { id: number; role: string }) => {
      const res = await fetch(`/api/audit/team/${id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Erreur');
      }
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['audit-team'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      setChangingId(null);
      toast({ title: '✅ Rôle mis à jour', description: `Le rôle a été modifié avec succès` });
    },
    onError: (err: Error) => {
      setChangingId(null);
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    },
  });

  const MATRIX: Record<string, { read: boolean; write: boolean; financials: boolean; audit: boolean }> = {
    SUPER_ADMIN: { read: true,  write: true,  financials: true,  audit: true  },
    OWNER:       { read: true,  write: true,  financials: true,  audit: true  },
    MANAGER:     { read: true,  write: true,  financials: true,  audit: true  },
    STAFF:       { read: true,  write: true,  financials: false, audit: false },
  };

  function PermCell({ ok }: { ok: boolean }) {
    return ok
      ? <span className="flex items-center justify-center"><CheckCircle2 className="w-4 h-4" style={{ color: '#10B981' }} strokeWidth={2} /></span>
      : <span className="flex items-center justify-center"><X className="w-4 h-4" style={{ color: '#EF4444' }} strokeWidth={2} /></span>;
  }

  return (
    <div className="space-y-6">
      {/* Matrice des permissions */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid hsl(var(--border))' }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'hsl(var(--muted))' }}>
          <Lock className="w-4 h-4" style={{ color: 'hsl(38 90% 56%)' }} strokeWidth={1.5} />
          <p className="text-xs font-bold text-foreground">Matrice des permissions par rôle</p>
        </div>
        <div className="overflow-x-auto max-w-full">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-semibold">Rôle</th>
                {['Lecture', 'Écriture', 'Rapports financiers', 'Audit Trail'].map(h => (
                  <th key={h} className="text-center px-3 py-2.5 text-muted-foreground font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(MATRIX).map(([role, perms], i) => {
                const cfg = ROLE_CFG[role];
                const Icon = cfg?.icon ?? User;
                return (
                  <tr key={role} style={{ borderBottom: i < 3 ? '1px solid hsl(var(--border))' : 'none' }}>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-bold"
                        style={{ background: cfg?.bg, color: cfg?.color }}>
                        <Icon className="w-3 h-3" strokeWidth={2} />
                        {cfg?.label ?? role}
                      </span>
                    </td>
                    <td className="px-3 py-3"><PermCell ok={perms.read} /></td>
                    <td className="px-3 py-3"><PermCell ok={perms.write} /></td>
                    <td className="px-3 py-3"><PermCell ok={perms.financials} /></td>
                    <td className="px-3 py-3"><PermCell ok={perms.audit} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Membres de l'équipe */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Users className="w-3.5 h-3.5" strokeWidth={1.5} />
            Membres de l&apos;équipe ({members.length})
          </p>
          {!canManageRoles && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Lock className="w-3 h-3" /> Seul le patron peut modifier les rôles
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {members.map(member => {
              const cfg  = ROLE_CFG[member.role];
              const Icon = cfg?.icon ?? User;
              const isMe = member.id === currentUser?.id;
              const canChange = canManageRoles && !isMe && member.role !== 'SUPER_ADMIN';
              const isChanging = changingId === member.id;

              return (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: cfg?.bg ?? 'hsl(var(--muted))', color: cfg?.color ?? 'hsl(var(--foreground))' }}>
                    {member.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-foreground">{member.name}</p>
                      {isMe && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                          style={{ background: 'hsl(38 90% 56% / 0.15)', color: 'hsl(38 90% 56%)' }}>
                          Vous
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{member.email}</p>
                  </div>

                  {/* Rôle + sélecteur */}
                  {isChanging ? (
                    <div className="flex items-center gap-2">
                      {(['OWNER', 'MANAGER', 'STAFF'] as const).map(r => {
                        const rc = ROLE_CFG[r];
                        return (
                          <button
                            key={r}
                            onClick={() => { changeRole({ id: member.id, role: r }); }}
                            disabled={isPending}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
                            style={{ background: rc.bg, color: rc.color, border: `1px solid ${rc.color}40` }}
                          >
                            {rc.label}
                          </button>
                        );
                      })}
                      <button onClick={() => setChangingId(null)} className="p-1.5 rounded-lg hover:bg-muted">
                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <RoleBadge role={member.role} />
                      {canChange && (
                        <button
                          onClick={() => setChangingId(member.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all"
                          style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
                          title="Changer le rôle"
                        >
                          <Settings className="w-3 h-3" strokeWidth={1.5} />
                          Modifier
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   PAGE PRINCIPALE
═══════════════════════════════════════════ */
export default function AuditPage() {
  const { user, business } = useAuth();
  const { canViewAudit }   = usePermissions();
  const [tab, setTab]      = useState<'trail' | 'permissions'>('trail');

  if (!canViewAudit) return <AccessDeniedPage />;

  const businessId = user?.role === 'SUPER_ADMIN' ? null : (business?.id ?? null);

  return (
    <div className="p-6 md:p-8 space-y-6 page-enter">
      <DashboardHero
        title="Sécurité & Audit Trail"
        subtitle="Surveillance des actions critiques · Gestion des accès et permissions"
        gradient="linear-gradient(135deg,#7C3AED,#A78BFA)"
        color="#A78BFA"
        bg="rgba(167,139,250,0.08)"
        icon={Shield}
        badge="SÉCURITÉ"
      />

      {/* Onglets */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'hsl(var(--muted))' }}>
        {([
          { key: 'trail',       label: 'Journal d\'activité', icon: Activity },
          { key: 'permissions', label: 'Permissions & Équipe', icon: Lock     },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: tab === t.key ? 'hsl(var(--card))' : 'transparent',
              color: tab === t.key ? '#A78BFA' : 'hsl(var(--muted-foreground))',
              border: tab === t.key ? '1px solid hsl(var(--border))' : '1px solid transparent',
              boxShadow: tab === t.key ? '0 1px 3px hsl(0 0% 0% / 0.12)' : 'none',
            }}
          >
            <t.icon className="w-3.5 h-3.5" strokeWidth={1.5} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {tab === 'trail'
            ? <AuditTrailTab businessId={businessId} />
            : <PermissionsTab businessId={businessId} />
          }
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
