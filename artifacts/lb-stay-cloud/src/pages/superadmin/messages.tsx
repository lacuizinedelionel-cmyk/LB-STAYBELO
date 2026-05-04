import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Send, MessageSquare, Mail, MailOpen, Trash2,
  Users, Building2, RefreshCw, Radio, ChevronLeft,
  AlertTriangle, Sparkles, Info, X, Check,
} from 'lucide-react';

/* ──────────────────────────────────────────────────────── */
type Message = {
  id: number;
  fromBusinessId: number | null;
  toBusinessId: number | null;
  fromName: string;
  senderRole: string;
  subject: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  businessName?: string | null;
  sector?: string | null;
};

type Business = { id: number; name: string; sector: string };

function fmtDate(d: string) {
  const now  = new Date();
  const dt   = new Date(d);
  const diff = (now.getTime() - dt.getTime()) / 1000;
  if (diff < 60)    return 'À l\'instant';
  if (diff < 3600)  return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
  return dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

const SECTOR_COLOR: Record<string, string> = {
  RESTAURANT: '#F97316', HOTEL: '#818CF8', BEAUTY: '#A78BFA',
  GROCERY: '#34D399', PHARMACY: '#F472B6', GARAGE: '#94A3B8',
  FITNESS: '#FBBF24', EDUCATION: '#60A5FA',
};

function SubjectIcon({ subject }: { subject: string }) {
  const s = subject.toLowerCase();
  if (s.includes('alerte') || s.includes('stock') || s.includes('rupture'))
    return <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: '#F97316' }} />;
  if (s.includes('bienvenue'))
    return <Sparkles className="w-4 h-4 shrink-0" style={{ color: 'hsl(38 90% 56%)' }} />;
  return <Info className="w-4 h-4 shrink-0" style={{ color: '#60A5FA' }} />;
}

/* ──────────────────────────────────────────────────────── */
export default function SuperAdminMessagesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const QK = ['superadmin-messages'];

  const { data: messages = [], isLoading, refetch } = useQuery<Message[]>({
    queryKey: QK,
    queryFn: async () => {
      const r = await fetch('/api/messages/all', { credentials: 'include' });
      if (!r.ok) throw new Error();
      return r.json();
    },
    refetchInterval: 30_000,
  });

  const { data: businesses = [] } = useQuery<Business[]>({
    queryKey: ['businesses-list'],
    queryFn: async () => {
      const r = await fetch('/api/businesses', { credentials: 'include' });
      if (!r.ok) throw new Error();
      return r.json();
    },
  });

  const [selected, setSelected] = useState<Message | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [composeTarget, setComposeTarget] = useState<number | 'ALL'>(0);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/messages/${id}`, { method: 'DELETE', credentials: 'include' });
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: QK });
      if (selected?.id === id) setSelected(null);
      toast({ title: 'Message supprimé' });
    },
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      toast({ title: 'Sujet et message requis', variant: 'destructive' }); return;
    }
    if (composeTarget === 0) {
      toast({ title: 'Sélectionnez un destinataire', variant: 'destructive' }); return;
    }
    setSending(true);
    try {
      const isBroadcast = composeTarget === 'ALL';
      const url = isBroadcast ? '/api/messages/broadcast' : '/api/messages';
      const bodyPayload = isBroadcast
        ? { subject: subject.trim(), body: body.trim() }
        : { toBusinessId: composeTarget, subject: subject.trim(), body: body.trim() };
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(bodyPayload),
      });
      if (!r.ok) throw new Error();
      qc.invalidateQueries({ queryKey: QK });
      setSubject(''); setBody(''); setComposeTarget(0); setShowCompose(false);
      toast({ title: isBroadcast ? `✓ Broadcast envoyé à ${businesses.length} enseignes` : '✓ Message envoyé' });
    } catch {
      toast({ title: 'Erreur', description: 'Envoi impossible.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  /* Group messages by business */
  const grouped = businesses.map(biz => ({
    biz,
    msgs: messages.filter(m => m.toBusinessId === biz.id),
    unread: messages.filter(m => m.toBusinessId === biz.id && !m.isRead).length,
  }));
  const totalUnread = messages.filter(m => !m.isRead).length;

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'hsl(38 90% 56% / 0.12)' }}>
            <MessageSquare className="w-5 h-5" style={{ color: 'hsl(38 90% 56%)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">Messagerie Super Admin</h1>
            <p className="text-sm text-muted-foreground">
              {messages.length} messages · {totalUnread > 0
                ? <span className="font-bold" style={{ color: 'hsl(38 90% 56%)' }}>{totalUnread} non lu{totalUnread > 1 ? 's' : ''}</span>
                : <span className="text-green-400 font-semibold">Tout lu</span>
              }
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 text-xs border-border/60">
            <RefreshCw className="w-3.5 h-3.5" />
            Actualiser
          </Button>
          <Button size="sm" onClick={() => setShowCompose(v => !v)}
            className="gap-1.5 text-xs font-bold"
            style={{ background: 'hsl(38 90% 56%)', color: '#000' }}>
            {showCompose ? <X className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
            {showCompose ? 'Fermer' : 'Nouveau message'}
          </Button>
        </div>
      </div>

      {/* Compose form */}
      <AnimatePresence>
        {showCompose && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSend} className="rounded-xl p-5 space-y-4"
              style={{ background: 'hsl(var(--card))', border: '1px solid hsl(38 90% 56% / 0.3)' }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: 'hsl(38 90% 56% / 0.12)' }}>
                  <Send className="w-3 h-3" style={{ color: 'hsl(38 90% 56%)' }} />
                </div>
                <h3 className="text-sm font-extrabold text-foreground">Nouveau message</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Destinataire */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                    Destinataire *
                  </label>
                  <select
                    value={composeTarget === 'ALL' ? 'ALL' : String(composeTarget)}
                    onChange={e => setComposeTarget(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value, 10))}
                    className="w-full h-9 rounded-lg px-3 text-sm bg-background border border-border/60 text-foreground focus:outline-none focus:ring-1 focus:ring-[hsl(38_90%_56%)]"
                  >
                    <option value={0} disabled>Sélectionner un destinataire...</option>
                    <option value="ALL">📢 Toutes les enseignes (broadcast)</option>
                    {businesses.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                {/* Sujet */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                    Sujet *
                  </label>
                  <Input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Ex: Alerte stock critique"
                    className="bg-background/60 border-border/60 h-9 text-sm"
                  />
                </div>
              </div>

              {/* Raccourcis sujet */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '⚠️ Alerte stock', text: 'Alerte stock critique détectée' },
                  { label: '📊 Rapport mensuel', text: 'Rapport mensuel disponible' },
                  { label: '✨ Nouvelle fonctionnalité', text: 'Nouvelle fonctionnalité disponible' },
                  { label: '📢 Annonce', text: 'Annonce importante de LB Stay Cloud' },
                ].map(s => (
                  <button key={s.text} type="button" onClick={() => setSubject(s.text)}
                    className="text-[10px] font-semibold px-2 py-1 rounded-lg transition-all hover:opacity-90"
                    style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}>
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Corps */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  Message *
                </label>
                <Textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Rédigez votre message ici..."
                  rows={5}
                  className="bg-background/60 border-border/60 text-sm resize-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={sending} size="sm"
                  className="gap-1.5 font-bold"
                  style={{ background: 'hsl(38 90% 56%)', color: '#000' }}>
                  {composeTarget === 'ALL'
                    ? <><Radio className="w-3.5 h-3.5" />Broadcast</>
                    : <><Send className="w-3.5 h-3.5" />Envoyer</>
                  }
                  {sending && '...'}
                </Button>
                <button type="button" onClick={() => setShowCompose(false)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Annuler
                </button>
                {composeTarget === 'ALL' && (
                  <span className="flex items-center gap-1 text-xs font-bold ml-auto"
                    style={{ color: 'hsl(38 90% 56%)' }}>
                    <Radio className="w-3 h-3" />
                    Envoi à {businesses.length} enseignes
                  </span>
                )}
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages par enseigne */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)
        ) : (
          grouped.map(({ biz, msgs, unread }) => {
            const color = SECTOR_COLOR[biz.sector] ?? '#6B7280';
            return (
              <motion.div
                key={biz.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl overflow-hidden"
                style={{ background: 'hsl(var(--card))', border: `1px solid ${unread > 0 ? color + '40' : 'hsl(var(--border))'}` }}
              >
                {/* Card header */}
                <div className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: '1px solid hsl(var(--border))', background: unread > 0 ? color + '08' : 'transparent' }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: color + '20' }}>
                      <Building2 className="w-3 h-3" style={{ color }} />
                    </div>
                    <p className="text-xs font-bold text-foreground truncate">{biz.name}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {unread > 0 && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full"
                        style={{ background: color + '20', color }}>
                        {unread} NL
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">{msgs.length} msg</span>
                  </div>
                </div>

                {/* Messages list */}
                <div className="divide-y" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
                  {msgs.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">Aucun message</div>
                  ) : msgs.slice(0, 3).map(msg => (
                    <button
                      key={msg.id}
                      onClick={() => setSelected(msg)}
                      className="w-full text-left px-4 py-2.5 hover:bg-muted/30 transition-colors group relative"
                    >
                      <div className="flex items-center gap-2">
                        {!msg.isRead && (
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                        )}
                        <SubjectIcon subject={msg.subject} />
                        <p className={`text-xs truncate flex-1 ${msg.isRead ? 'text-muted-foreground' : 'font-bold text-foreground'}`}>
                          {msg.subject}
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0">{fmtDate(msg.createdAt)}</span>
                      </div>
                    </button>
                  ))}
                  {msgs.length > 3 && (
                    <div className="px-4 py-2 text-[10px] text-muted-foreground text-center">
                      +{msgs.length - 3} autres messages
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Message detail modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'hsl(0 0% 0% / 0.6)' }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.93, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 16 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl overflow-hidden"
              style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
            >
              <div className="flex items-start justify-between gap-3 px-6 py-4"
                style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <SubjectIcon subject={selected.subject} />
                  <div>
                    <h2 className="text-sm font-extrabold text-foreground">{selected.subject}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Pour <span className="font-semibold">{selected.businessName ?? 'Enseigne'}</span>
                      {' · '}{fmtDate(selected.createdAt)}
                      {' · '}{selected.isRead
                        ? <span className="text-green-400">Lu</span>
                        : <span style={{ color: 'hsl(38 90% 56%)' }}>Non lu</span>
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => deleteMut.mutate(selected.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                  <button onClick={() => setSelected(null)}
                    className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
              <div className="p-6 max-h-96 overflow-y-auto">
                <div className="rounded-xl p-4"
                  style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}>
                  <pre className="text-sm text-foreground/90 leading-relaxed font-sans whitespace-pre-wrap">
                    {selected.body}
                  </pre>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
