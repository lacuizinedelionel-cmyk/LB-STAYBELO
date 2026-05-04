import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Mail, MailOpen, Trash2, RefreshCw, CheckCheck,
  MessageSquare, AlertTriangle, Info, Sparkles, X,
  ChevronLeft,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { motion as m } from 'framer-motion';

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
};

function fmtDate(d: string) {
  const now = new Date();
  const dt  = new Date(d);
  const diff = (now.getTime() - dt.getTime()) / 1000;
  if (diff < 60)   return 'À l\'instant';
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
  return dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ── Icône sujet ── */
function SubjectIcon({ subject }: { subject: string }) {
  const s = subject.toLowerCase();
  if (s.includes('alerte') || s.includes('stock') || s.includes('rupture'))
    return <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: '#F97316' }} />;
  if (s.includes('bienvenue'))
    return <Sparkles className="w-4 h-4 shrink-0" style={{ color: 'hsl(38 90% 56%)' }} />;
  return <Info className="w-4 h-4 shrink-0" style={{ color: '#60A5FA' }} />;
}

/* ──────────────────────────────────────────────────────── */
export default function MessagesPage() {
  const { business } = useAuth();
  const { toast }    = useToast();
  const qc           = useQueryClient();
  const QK           = ['messages', business?.id];

  const { data: messages = [], isLoading, refetch } = useQuery<Message[]>({
    queryKey: QK,
    queryFn: async () => {
      const r = await fetch(`/api/messages?businessId=${business?.id}`, { credentials: 'include' });
      if (!r.ok) throw new Error();
      return r.json();
    },
    enabled: !!business?.id,
    refetchInterval: 30_000,
  });

  const [selected, setSelected] = useState<Message | null>(null);

  const markReadMut = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/messages/${id}/read`, { method: 'PATCH', credentials: 'include' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });

  const markAllMut = useMutation({
    mutationFn: async () => {
      await fetch(`/api/messages/read-all?businessId=${business?.id}`, { method: 'PATCH', credentials: 'include' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK });
      toast({ title: '✓ Tous les messages marqués comme lus' });
    },
  });

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

  const openMessage = (msg: Message) => {
    setSelected(msg);
    if (!msg.isRead) markReadMut.mutate(msg.id);
  };

  const unreadCount = messages.filter(m => !m.isRead).length;

  return (
    <div className="h-full flex flex-col p-6 md:p-8 gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'hsl(38 90% 56% / 0.12)' }}>
            <MessageSquare className="w-5 h-5" style={{ color: 'hsl(38 90% 56%)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">Messagerie</h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0
                ? <span className="font-bold" style={{ color: 'hsl(38 90% 56%)' }}>{unreadCount} non lu{unreadCount > 1 ? 's' : ''}</span>
                : 'Tous les messages lus'
              }
              {' '}· {messages.length} message{messages.length > 1 ? 's' : ''} au total
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => markAllMut.mutate()}
              disabled={markAllMut.isPending}
              className="text-xs gap-1.5 border-border/60">
              <CheckCheck className="w-3.5 h-3.5" />
              Tout marquer lu
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs gap-1.5 border-border/60">
            <RefreshCw className="w-3.5 h-3.5" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Main layout : list + detail */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-0">

        {/* ── Liste messages ── */}
        <div className={`lg:col-span-2 flex flex-col rounded-xl overflow-hidden ${selected ? 'hidden lg:flex' : 'flex'}`}
          style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>

          <div className="px-4 py-3 shrink-0" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Boîte de réception</p>
          </div>

          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <MailOpen className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-sm font-semibold">Aucun message</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                <AnimatePresence>
                  {messages.map((msg, i) => (
                    <motion.button
                      key={msg.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => openMessage(msg)}
                      className="w-full text-left rounded-xl p-3 transition-all group relative"
                      style={{
                        background: selected?.id === msg.id
                          ? 'hsl(38 90% 56% / 0.1)'
                          : msg.isRead ? 'transparent' : 'hsl(38 90% 56% / 0.05)',
                        border: selected?.id === msg.id
                          ? '1px solid hsl(38 90% 56% / 0.35)'
                          : '1px solid transparent',
                      }}
                    >
                      {/* Unread dot */}
                      {!msg.isRead && (
                        <div className="absolute top-3 right-3 w-2 h-2 rounded-full"
                          style={{ background: 'hsl(38 90% 56%)' }} />
                      )}
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5">
                          {msg.isRead
                            ? <MailOpen className="w-4 h-4 text-muted-foreground/50" />
                            : <Mail className="w-4 h-4" style={{ color: 'hsl(38 90% 56%)' }} />
                          }
                        </div>
                        <div className="flex-1 min-w-0 pr-3">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className={`text-xs truncate ${msg.isRead ? 'font-medium text-muted-foreground' : 'font-bold text-foreground'}`}>
                              {msg.fromName}
                            </p>
                            <span className="text-[10px] text-muted-foreground shrink-0 ml-1">{fmtDate(msg.createdAt)}</span>
                          </div>
                          <p className={`text-xs truncate mb-1 ${msg.isRead ? 'text-muted-foreground' : 'font-semibold text-foreground'}`}>
                            {msg.subject}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate leading-relaxed">
                            {msg.body.split('\n')[0]}
                          </p>
                        </div>
                      </div>

                      {/* Delete on hover */}
                      <button
                        onClick={e => { e.stopPropagation(); deleteMut.mutate(msg.id); }}
                        className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* ── Détail message ── */}
        <div className={`lg:col-span-3 rounded-xl overflow-hidden flex flex-col ${selected ? 'flex' : 'hidden lg:flex'}`}
          style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>

          {selected ? (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {/* Detail header */}
              <div className="flex items-start justify-between gap-3 px-6 py-4 shrink-0"
                style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <button onClick={() => setSelected(null)}
                    className="lg:hidden p-1.5 rounded-lg hover:bg-muted/60 transition-colors shrink-0">
                    <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <SubjectIcon subject={selected.subject} />
                  <div className="min-w-0">
                    <h2 className="text-sm font-extrabold text-foreground leading-tight truncate">
                      {selected.subject}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      De <span className="font-semibold">{selected.fromName}</span>
                      {' · '}{fmtDate(selected.createdAt)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => deleteMut.mutate(selected.id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors shrink-0"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl">
                  <div className="rounded-xl p-5 mb-4"
                    style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}>
                    <pre className="text-sm text-foreground/90 leading-relaxed font-sans whitespace-pre-wrap">
                      {selected.body}
                    </pre>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Message envoyé par <span className="font-bold">{selected.fromName}</span>
                    {' — '}Plateforme LB Stay Cloud
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MailOpen className="w-12 h-12 mb-3 opacity-15" />
              <p className="text-sm font-semibold">Sélectionnez un message</p>
              <p className="text-xs mt-1">Cliquez sur un message pour le lire</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
