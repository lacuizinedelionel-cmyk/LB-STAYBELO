import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import {
  LayoutDashboard, Users, Settings, Bell, LogOut,
  UtensilsCrossed, Building2, Scissors, ShoppingBag,
  Pill, Wrench, Dumbbell, GraduationCap, BarChart2,
  Calendar, Package, ClipboardList, Zap, ChevronDown,
  BedDouble, CreditCard, TrendingUp, Star, ShoppingCart,
  UserCheck, BookOpen, Activity, Wallet, Shield, MessageSquare,
  BarChart3, Receipt, Menu, X,
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useLanguage } from '@/context/LanguageContext';
import { useQuery } from '@tanstack/react-query';

function useUnreadCount(businessId?: number) {
  const { data } = useQuery<{ count: number }>({
    queryKey: ['unread-count', businessId],
    queryFn: async () => {
      const r = await fetch(`/api/messages/unread-count?businessId=${businessId}`, { credentials: 'include' });
      if (!r.ok) return { count: 0 };
      return r.json();
    },
    enabled: !!businessId,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
  return data?.count ?? 0;
}

type Sector = 'HOTEL' | 'RESTAURANT' | 'GROCERY' | 'PHARMACY' | 'BEAUTY' | 'GARAGE' | 'FITNESS' | 'EDUCATION';
interface SubItem { label: string; href: string; icon: React.ElementType }
interface Enseigne { id: string; name: string; sector: Sector; badge?: string }

const SECTOR_CFG: Record<Sector, { label: string; icon: React.ElementType; color: string; bg: string; gradient: string; }> = {
  HOTEL: { label: 'Hôtellerie', icon: Building2, color: '#818CF8', bg: 'hsl(239 84% 67% / 0.12)', gradient: 'linear-gradient(135deg,#4F46E5,#818CF8)' },
  RESTAURANT: { label: 'Restauration', icon: UtensilsCrossed, color: '#F97316', bg: 'hsl(25 95% 53% / 0.12)', gradient: 'linear-gradient(135deg,#EA580C,#F97316)' },
  GROCERY: { label: 'Supermarché', icon: ShoppingBag, color: '#34D399', bg: 'hsl(160 84% 39% / 0.12)', gradient: 'linear-gradient(135deg,#059669,#34D399)' },
  PHARMACY: { label: 'Pharmacie', icon: Pill, color: '#F472B6', bg: 'hsl(330 81% 60% / 0.12)', gradient: 'linear-gradient(135deg,#DB2777,#F472B6)' },
  BEAUTY: { label: 'Beauté', icon: Scissors, color: '#A78BFA', bg: 'hsl(262 83% 58% / 0.12)', gradient: 'linear-gradient(135deg,#7C3AED,#A78BFA)' },
  GARAGE: { label: 'Garage Auto', icon: Wrench, color: '#94A3B8', bg: 'hsl(215 20% 65% / 0.12)', gradient: 'linear-gradient(135deg,#64748B,#94A3B8)' },
  FITNESS: { label: 'Fitness', icon: Dumbbell, color: '#FBBF24', bg: 'hsl(38 92% 50% / 0.12)', gradient: 'linear-gradient(135deg,#D97706,#FBBF24)' },
  EDUCATION: { label: 'Formation', icon: GraduationCap, color: '#60A5FA', bg: 'hsl(213 93% 68% / 0.12)', gradient: 'linear-gradient(135deg,#2563EB,#60A5FA)' },
};

const SUB_MENUS: Record<Sector, SubItem[]> = {
  HOTEL: [
    { label: 'Tableau de bord', href: '/hotel/dashboard', icon: LayoutDashboard },
    { label: 'Chambres', href: '/hotel/rooms', icon: BedDouble },
    { label: 'Réservations', href: '/hotel/reservations', icon: Calendar },
    { label: 'Analyses', href: '/analytics', icon: TrendingUp },
  ],
  RESTAURANT: [
    { label: 'Tableau de bord', href: '/restaurant/dashboard', icon: LayoutDashboard },
    { label: 'Caisse (POS)', href: '/restaurant/pos', icon: CreditCard },
    { label: 'Journal de Caisse', href: '/restaurant/caisse', icon: Wallet },
    { label: 'Commandes', href: '/restaurant/orders', icon: Package },
    { label: 'Menu & Carte', href: '/restaurant/menu', icon: ClipboardList },
    { label: 'Analyses', href: '/analytics', icon: TrendingUp },
  ],
  GROCERY: [
    { label: 'Tableau de bord', href: '/grocery/dashboard', icon: LayoutDashboard },
    { label: 'Catalogue', href: '/grocery/products', icon: ShoppingCart },
    { label: 'Stock & Inventaire', href: '/grocery/stock', icon: Package },
    { label: 'L\'Ardoise', href: '/grocery/credits', icon: CreditCard },
    { label: 'Analyses', href: '/analytics', icon: TrendingUp },
  ],
  PHARMACY: [
    { label: 'Tableau de bord', href: '/pharmacy/dashboard', icon: LayoutDashboard },
    { label: 'Médicaments', href: '/pharmacy/medications', icon: Pill },
    { label: 'Ordonnances', href: '/pharmacy/prescriptions', icon: ClipboardList },
    { label: 'Analyses', href: '/analytics', icon: TrendingUp },
  ],
  BEAUTY: [
    { label: 'Tableau de bord', href: '/beauty/dashboard', icon: LayoutDashboard },
    { label: 'Rendez-vous', href: '/beauty/appointments', icon: Calendar },
    { label: 'Prestations', href: '/beauty/services', icon: Star },
    { label: 'Personnel', href: '/beauty/staff', icon: Users },
  ],
  GARAGE: [
    { label: 'Tableau de bord', href: '/garage/dashboard', icon: LayoutDashboard },
    { label: 'Véhicules', href: '/garage/vehicles', icon: Wrench },
    { label: 'Devis', href: '/garage/quotes', icon: ClipboardList },
  ],
  FITNESS: [
    { label: 'Tableau de bord', href: '/fitness/dashboard', icon: LayoutDashboard },
    { label: 'Membres', href: '/fitness/members', icon: UserCheck },
    { label: 'Cours', href: '/fitness/classes', icon: Activity },
  ],
  EDUCATION: [
    { label: 'Tableau de bord', href: '/education/dashboard', icon: LayoutDashboard },
    { label: 'Cours', href: '/education/courses', icon: BookOpen },
    { label: 'Apprenants', href: '/education/students', icon: Users },
  ],
};

const DEMO_ENSEIGNES: Enseigne[] = [
  { id: 'h1', name: 'Hôtel Le Prestige', sector: 'HOTEL', badge: 'PRO' },
  { id: 'h2', name: 'Hôtel Akwa Palace', sector: 'HOTEL' },
  { id: 'h3', name: 'Hôtel Mont Fébé', sector: 'HOTEL' },
  { id: 'r1', name: 'Restaurant Chez Mama', sector: 'RESTAURANT', badge: 'PRO' },
  { id: 'r2', name: 'La Table Royale', sector: 'RESTAURANT' },
  { id: 'r3', name: 'Maquis du Centre', sector: 'RESTAURANT' },
  { id: 'g1', name: 'Super Marché Central', sector: 'GROCERY', badge: 'PRO' },
  { id: 'g2', name: 'Economat du Quartier', sector: 'GROCERY' },
  { id: 'g3', name: 'Marché des Familles', sector: 'GROCERY' },
  { id: 'p1', name: 'Pharmacie Centrale Plus', sector: 'PHARMACY', badge: 'NEW' },
];

function AccordionEnsigne({ enseigne, defaultOpen = false }: { enseigne: Enseigne; defaultOpen?: boolean; }) {
  const [open, setOpen] = useState(defaultOpen);
  const [location] = useLocation();
  const cfg = SECTOR_CFG[enseigne.sector];
  const Icon = cfg.icon;
  const items = SUB_MENUS[enseigne.sector];
  const isAnyActive = items.some(it => location === it.href || location.startsWith(it.href + '/'));

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${isAnyActive ? cfg.color + '40' : 'hsl(var(--border))'}` }}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-all group" style={{ background: isAnyActive ? cfg.bg : open ? 'hsl(var(--muted) / 0.5)' : 'transparent' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all" style={{ background: open || isAnyActive ? cfg.gradient : 'hsl(var(--muted))' }}>
          <Icon className="w-3.5 h-3.5 text-white" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate leading-tight" style={{ color: isAnyActive ? cfg.color : 'hsl(var(--foreground))' }}>{enseigne.name}</p>
          <p className="text-[10px] text-muted-foreground">{cfg.label}</p>
        </div>
        {enseigne.badge && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: cfg.bg, color: cfg.color }}>{enseigne.badge}</span>}
        <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground transition-transform duration-200" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="sub" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: 'easeInOut' }} style={{ overflow: 'hidden' }}>
            <div className="px-2 pb-2 pt-1 space-y-0.5" style={{ borderTop: '1px solid hsl(var(--border))' }}>
              {items.map(item => {
                const isActive = location === item.href || location.startsWith(item.href + '/');
                const ItemIcon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all group" style={{ background: isActive ? cfg.bg : 'transparent', color: isActive ? cfg.color : 'hsl(var(--muted-foreground))' }}>
                    <div className="w-1 h-1 rounded-full shrink-0 transition-all" style={{ background: isActive ? cfg.color : 'hsl(var(--muted-foreground) / 0.4)' }} />
                    <ItemIcon className="w-3.5 h-3.5 shrink-0" strokeWidth={isActive ? 2 : 1.5} />
                    <span style={{ fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
                    {isActive && <div className="ml-auto w-1 h-4 rounded-full" style={{ background: cfg.color }} />}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SuperAdminSidebar({ user, logout }: { user: any; logout: () => void }) {
  const [location] = useLocation();
  const grouped = DEMO_ENSEIGNES.reduce<Record<string, Enseigne[]>>((acc, e) => ((acc[e.sector] = acc[e.sector] ?? []).push(e), acc), {});
  return (
    <div className="fixed inset-y-0 left-0 z-50 flex flex-col w-64" style={{ background: 'hsl(var(--sidebar))', borderRight: '1px solid hsl(var(--border))' }}>
      <SidebarLogo />
      <div className="flex-1 overflow-y-auto custom-scrollbar py-3 px-3 space-y-1">
        <Link href="/superadmin" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all mb-1" style={{ background: location === '/superadmin' ? 'hsl(38 90% 56% / 0.15)' : 'hsl(var(--muted))', color: location === '/superadmin' ? 'hsl(38 90% 56%)' : 'hsl(var(--foreground))', border: location === '/superadmin' ? '1px solid hsl(38 90% 56% / 0.3)' : '1px solid transparent' }}><div className="w-7 h-7 rounded-lg flex items-center justify-center gradient-gold shrink-0"><LayoutDashboard className="w-3.5 h-3.5 text-white" strokeWidth={2} /></div>Vue Globale</Link>
        <Link href="/superadmin/subscriptions" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all mb-1" style={{ background: location === '/superadmin/subscriptions' ? 'hsl(38 90% 56% / 0.15)' : 'transparent', color: location === '/superadmin/subscriptions' ? 'hsl(38 90% 56%)' : 'hsl(var(--muted-foreground))', border: location === '/superadmin/subscriptions' ? '1px solid hsl(38 90% 56% / 0.3)' : '1px solid transparent' }}><div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: location === '/superadmin/subscriptions' ? 'hsl(38 90% 56%)' : 'hsl(var(--muted))' }}><Receipt className="w-3.5 h-3.5" style={{ color: location === '/superadmin/subscriptions' ? '#000' : 'hsl(var(--muted-foreground))' }} strokeWidth={2} /></div><span className="flex-1">Gestion des Abonnements</span></Link>
        <Link href="/superadmin/analytics" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all mb-1" style={{ background: location === '/superadmin/analytics' ? 'hsl(38 90% 56% / 0.15)' : 'transparent', color: location === '/superadmin/analytics' ? 'hsl(38 90% 56%)' : 'hsl(var(--muted-foreground))', border: location === '/superadmin/analytics' ? '1px solid hsl(38 90% 56% / 0.3)' : '1px solid transparent' }}><div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: location === '/superadmin/analytics' ? 'hsl(38 90% 56%)' : 'hsl(var(--muted))' }}><BarChart3 className="w-3.5 h-3.5" style={{ color: location === '/superadmin/analytics' ? '#000' : 'hsl(var(--muted-foreground))' }} strokeWidth={2} /></div><span className="flex-1">Analytique</span></Link>
        <Link href="/superadmin/messages" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all mb-3" style={{ background: location === '/superadmin/messages' ? 'hsl(38 90% 56% / 0.15)' : 'transparent', color: location === '/superadmin/messages' ? 'hsl(38 90% 56%)' : 'hsl(var(--muted-foreground))', border: location === '/superadmin/messages' ? '1px solid hsl(38 90% 56% / 0.3)' : '1px solid transparent' }}><div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: location === '/superadmin/messages' ? 'hsl(38 90% 56%)' : 'hsl(var(--muted))' }}><MessageSquare className="w-3.5 h-3.5" style={{ color: location === '/superadmin/messages' ? '#000' : 'hsl(var(--muted-foreground))' }} strokeWidth={2} /></div><span className="flex-1">Messagerie</span></Link>
        <div className="mb-2"><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1 mb-2">Mes Enseignes</p><div className="space-y-1.5">{Object.entries(grouped).map(([sector, enseignes]) => (<div key={sector}><div className="flex items-center gap-2 px-1 mb-1 mt-2"><span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: SECTOR_CFG[sector as Sector].color }}>{SECTOR_CFG[sector as Sector].label}</span><div className="flex-1 h-px" style={{ background: SECTOR_CFG[sector as Sector].color + '30' }} /></div><div className="space-y-1">{enseignes.map((e, i) => <AccordionEnsigne key={e.id} enseigne={e} defaultOpen={i === 0 && sector === 'HOTEL'} />)}</div></div>))}</div></div>
      </div>
      <SidebarFooter user={user} logout={logout} role="Super Administrateur" />
    </div>
  );
}

function BusinessSidebar({ user, business, logout }: { user: any; business: any; logout: () => void }) {
  const [location] = useLocation();
  const sector = business?.sector as Sector | undefined;
  const cfg = sector ? SECTOR_CFG[sector] : null;
  const Icon = cfg?.icon ?? LayoutDashboard;
  const enseigne: Enseigne | null = sector ? { id: String(business.id), name: business.name, sector, badge: 'PRO' } : null;
  const { canViewAudit, canViewBilling } = usePermissions();
  const { isSuperAdmin, hasMinRole } = usePermissions();
  const { t } = useLanguage();
  const unread = useUnreadCount(business?.id);
  const settingsHref = business ? `/settings/${business.id}` : '/settings';
  const sharedItems = [
    { href: '/clients', label: t.nav.clients, icon: Users, always: true, badge: 0 },
    { href: '/analytics', label: t.nav.analytics, icon: BarChart2, always: true, badge: 0 },
    { href: '/messages', label: 'Messagerie', icon: MessageSquare, always: true, badge: unread },
    { href: '/audit', label: t.nav.audit, icon: Shield, always: canViewAudit, badge: 0 },
    { href: '/billing', label: t.nav.billing, icon: Wallet, always: canViewBilling, badge: 0 },
    { href: '/notifications', label: t.nav.notifications, icon: Bell, always: true, badge: 0 },
    { href: settingsHref, label: t.nav.settings, icon: Settings, always: isSuperAdmin || (business && hasMinRole('OWNER')), badge: 0 },
  ].filter(i => i.always);

  return (
    <div className="fixed inset-y-0 left-0 z-50 flex flex-col w-64" style={{ background: 'hsl(var(--sidebar))', borderRight: '1px solid hsl(var(--border))' }}>
      <SidebarLogo />
      <div className="flex-1 overflow-y-auto custom-scrollbar py-3 px-3 space-y-1">
        {cfg && enseigne && (<div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-3" style={{ background: cfg.bg, border: `1px solid ${cfg.color}30` }}><div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: cfg.gradient }}><Icon className="w-4 h-4 text-white" strokeWidth={2} /></div><div className="flex-1 min-w-0"><p className="text-xs font-bold truncate" style={{ color: cfg.color }}>{business.name}</p><p className="text-[10px] text-muted-foreground">{cfg.label}</p></div><span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: cfg.color + '20', color: cfg.color }}>PRO</span></div>)}
        {enseigne && (<div className="mb-2"><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1 mb-2">Mon Enseigne</p><AccordionEnsigne enseigne={enseigne} defaultOpen /></div>)}
        <div><div className="my-2 border-t" style={{ borderColor: 'hsl(var(--border))' }} /><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1 mb-2">Général</p><div className="space-y-0.5">{sharedItems.map(item => { const isActive = location === item.href; const ItemIcon = item.icon; return (<Link key={item.href} href={item.href} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all" style={{ background: isActive ? 'hsl(38 90% 56% / 0.12)' : 'transparent', color: isActive ? 'hsl(38 90% 56%)' : 'hsl(var(--muted-foreground))', border: isActive ? '1px solid hsl(38 90% 56% / 0.25)' : '1px solid transparent' }}><ItemIcon className="w-4 h-4 shrink-0" strokeWidth={isActive ? 2 : 1.5} /><span className="flex-1">{item.label}</span>{item.badge > 0 && <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0 min-w-[18px] text-center" style={{ background: 'hsl(38 90% 56%)', color: '#000' }}>{item.badge}</span>}{isActive && item.badge === 0 && <div className="ml-auto w-1 h-4 rounded-full" style={{ background: 'hsl(38 90% 56%)' }} />}</Link>); })}</div></div>
      </div>
      <SidebarFooter user={user} logout={logout} role={cfg?.label} />
    </div>
  );
}

function SidebarLogo() {
  return (<div className="flex items-center gap-3 h-16 px-5 shrink-0" style={{ borderBottom: '1px solid hsl(var(--border))' }}><div className="flex items-center justify-center w-8 h-8 rounded-lg gradient-gold shrink-0"><Zap className="w-4 h-4 text-white" strokeWidth={2.5} /></div><div className="flex flex-col leading-tight"><span className="text-sm font-extrabold tracking-tight text-foreground" style={{ letterSpacing: '-0.02em' }}>LB Stay Cloud</span><span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Platform SaaS</span></div></div>);
}

function SidebarFooter({ user, logout, role }: { user: any; logout: () => void; role?: string }) {
  const { lang, toggle } = useLanguage();
  const { profileData } = useAuth();
  const displayName = profileData.fullName || user?.name || user?.email || 'Utilisateur';
  const avatarText = displayName.charAt(0).toUpperCase();
  return (
    <div className="p-3 shrink-0 space-y-1" style={{ borderTop: '1px solid hsl(var(--border))' }}>
      <button onClick={toggle} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all" style={{ background: 'hsl(var(--muted) / 0.5)', color: 'hsl(var(--muted-foreground))' }} title={lang === 'fr' ? 'Switch to English' : 'Passer en français'}>
        <span className="text-base leading-none">{lang === 'fr' ? '🇫🇷' : '🇬🇧'}</span><span className="flex-1 text-left">{lang === 'fr' ? 'Français' : 'English'}</span><span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'hsl(38 90% 56% / 0.12)', color: 'hsl(38 90% 56%)' }}>{lang.toUpperCase()}</span>
      </button>
      <Link href="/settings" className="block"><div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all" style={{ background: 'hsl(var(--muted) / 0.5)' }}><div className="w-8 h-8 rounded-full overflow-hidden gradient-gold flex items-center justify-center shrink-0">{profileData.avatarUrl ? <img src={profileData.avatarUrl} alt={displayName} className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-white">{avatarText}</span>}</div><div className="flex-1 min-w-0"><p className="text-xs font-semibold text-foreground truncate">{displayName}</p><p className="text-[10px] text-muted-foreground truncate">{role && role !== 'Super Administrateur' ? role : 'Mon Profil'}</p></div></div></Link>
      <button type="button" onClick={logout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground transition-all" onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'hsl(0 72% 51% / 0.08)'; (e.currentTarget as HTMLElement).style.color = '#EF4444'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = ''; }}><LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />{lang === 'fr' ? 'Déconnexion' : 'Sign out'}</button>
    </div>
  );
}

function MobileSidebarShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  useEffect(() => { setOpen(false); }, [location]);
  return (<><div className="md:hidden fixed top-3 left-3 z-[60]"><button onClick={() => setOpen(true)} className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} aria-label="Ouvrir le menu"><Menu className="w-5 h-5 text-foreground" /></button></div><AnimatePresence>{open && (<><motion.button aria-label="Fermer le menu" className="md:hidden fixed inset-0 z-40" style={{ background: 'hsl(0 0% 0% / 0.55)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} /><motion.div className="md:hidden fixed inset-y-0 left-0 z-50 w-[86vw] max-w-sm" initial={{ x: -360 }} animate={{ x: 0 }} exit={{ x: -360 }} transition={{ type: 'spring', stiffness: 280, damping: 30 }}><div className="h-full shadow-2xl"><button onClick={() => setOpen(false)} className="absolute top-3 right-3 w-9 h-9 rounded-lg flex items-center justify-center z-10" style={{ background: 'hsl(var(--muted))' }} aria-label="Fermer le menu"><X className="w-4 h-4 text-foreground" /></button>{children}</div></motion.div></>)}</AnimatePresence><div className="hidden md:block">{children}</div></>);
}

export function Sidebar() {
  const { user, business, logout } = useAuth();
  if (!user) return null;
  if (user.role === 'SUPER_ADMIN') return <MobileSidebarShell><SuperAdminSidebar user={user} logout={logout} /></MobileSidebarShell>;
  return <MobileSidebarShell><BusinessSidebar user={user} business={business} logout={logout} /></MobileSidebarShell>;
}
