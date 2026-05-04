import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  useListClients, 
  getListClientsQueryKey,
  ClientLoyaltyLevel
} from '@workspace/api-client-react';
import { formatXAF } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Search, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { ReviewsSection } from '@/components/reviews-section';

/* ──────────────────────────────────────────────────────── */
type Client = {
  id: number; name: string; phone: string | null; email: string | null;
  city: string | null; loyaltyLevel: ClientLoyaltyLevel;
  visitCount: number; loyaltyPoints: number; totalSpent: number;
  createdAt: string;
};

const LOYALTY_COLOR: Record<ClientLoyaltyLevel, string> = {
  BRONZE:   'bg-[#CD7F32]/10 text-[#CD7F32] border-[#CD7F32]/30',
  SILVER:   'bg-gray-400/10 text-gray-400 border-gray-400/30',
  GOLD:     'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/30',
  PLATINUM: 'bg-[#E5E4E2]/10 text-[#E5E4E2] border-[#E5E4E2]/30',
};

const AVATAR_COLORS = [
  '#818CF8','#F472B6','#34D399','#FBBF24','#F97316','#60A5FA','#94A3B8','#10B981',
];

/* ── Modal Ajouter / Modifier ── */
function ClientModal({ client, onClose, businessId }: {
  client: Client | null;
  onClose: () => void;
  businessId: number;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [name, setName]   = useState(client?.name ?? '');
  const [phone, setPhone] = useState(client?.phone ?? '');
  const [email, setEmail] = useState(client?.email ?? '');
  const [city, setCity]   = useState(client?.city ?? '');
  const [saving, setSaving] = useState(false);

  const isEdit = !!client;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast({ title: 'Nom requis', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const url = isEdit ? `/api/clients/${client.id}` : '/api/clients';
      const method = isEdit ? 'PUT' : 'POST';
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ businessId, name: name.trim(), phone: phone.trim() || null, email: email.trim() || null, city: city.trim() || null }),
      });
      if (!r.ok) throw new Error();
      qc.invalidateQueries({ queryKey: getListClientsQueryKey({ businessId }) });
      toast({ title: isEdit ? '✓ Client modifié' : '✓ Client ajouté', description: name });
      onClose();
    } catch {
      toast({ title: 'Erreur', description: 'Impossible d\'enregistrer.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'hsl(0 0% 0% / 0.6)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.93, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 16 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
      >
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <h3 className="font-extrabold text-foreground">{isEdit ? 'Modifier le client' : 'Nouveau client'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Nom complet *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: M. Kamdem Jean-Pierre" className="bg-background/60 h-9" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Téléphone</label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="6XX XXX XXX" className="bg-background/60 h-9" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Ville</label>
              <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Yaoundé" className="bg-background/60 h-9" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Email</label>
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="client@email.com" className="bg-background/60 h-9" />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={saving} className="flex-1 font-bold"
              style={{ background: 'hsl(38 90% 56%)', color: '#000' }}>
              <Check className="w-3.5 h-3.5 mr-1.5" />
              {saving ? 'Enregistrement...' : (isEdit ? 'Modifier' : 'Créer le client')}
            </Button>
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              style={{ border: '1px solid hsl(var(--border))' }}>
              Annuler
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

/* ── Modal Supprimer ── */
function DeleteModal({ client, onConfirm, onClose, isPending }: {
  client: Client; onConfirm: () => void; onClose: () => void; isPending: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'hsl(0 0% 0% / 0.6)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.93, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 16 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl p-6 space-y-5"
        style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'hsl(0 72% 51% / 0.12)' }}>
            <Trash2 className="w-5 h-5" style={{ color: '#EF4444' }} />
          </div>
          <div>
            <h3 className="font-extrabold text-foreground">Supprimer ce client ?</h3>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-bold text-foreground">{client.name}</span> sera définitivement supprimé.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onConfirm} disabled={isPending}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: '#EF4444' }}>
            {isPending ? 'Suppression...' : 'Supprimer'}
          </button>
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground transition-all hover:text-foreground"
            style={{ border: '1px solid hsl(var(--border))' }}>
            Annuler
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ──────────────────────────────────────────────────────── */
export default function ClientsPage() {
  const { business } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: clients = [], isLoading } = useListClients(
    { businessId: business?.id ?? 0 },
    { query: { enabled: !!business?.id, queryKey: getListClientsQueryKey({ businessId: business?.id ?? 0 }) } }
  );

  const [search, setSearch] = useState('');
  const [modalClient, setModalClient] = useState<Client | null | 'new'>('new' as unknown as null);
  const [showModal, setShowModal] = useState<'edit' | 'add' | 'delete' | null>(null);
  const [targetClient, setTargetClient] = useState<Client | null>(null);

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? '').includes(search) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/clients/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!r.ok) throw new Error();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getListClientsQueryKey({ businessId: business?.id ?? 0 }) });
      toast({ title: '✓ Client supprimé' });
      setShowModal(null); setTargetClient(null);
    },
    onError: () => toast({ title: 'Erreur', description: 'Suppression impossible.', variant: 'destructive' }),
  });

  const openEdit = (c: Client) => { setTargetClient(c); setShowModal('edit'); };
  const openDelete = (c: Client) => { setTargetClient(c); setShowModal('delete'); };

  return (
    <div className="p-6 md:p-8 space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clients (CRM)</h1>
          <p className="text-muted-foreground mt-1">Gérez votre base de clients et leur fidélité</p>
        </div>
        <Button
          onClick={() => { setTargetClient(null); setShowModal('add'); }}
          className="font-bold"
          style={{ background: 'hsl(38 90% 56%)', color: '#000' }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un client
        </Button>
      </div>

      {/* Table */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un client..."
              className="pl-9 bg-background/50 border-border/50"
            />
          </div>
          <p className="text-xs text-muted-foreground ml-3 shrink-0">
            {filtered.length} client{filtered.length > 1 ? 's' : ''}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="pl-6">Nom</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Fidélité</TableHead>
                    <TableHead className="text-right">Visites</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    <TableHead className="text-right">Total Dépensé</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((client, i) => {
                    const color = AVATAR_COLORS[client.id % AVATAR_COLORS.length];
                    return (
                      <TableRow key={client.id} className="border-border/50 group hover:bg-muted/20 transition-colors">
                        <TableCell className="font-medium pl-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                              style={{ background: color }}>
                              {client.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{client.name}</p>
                              {client.city && <p className="text-[11px] text-muted-foreground">{client.city}</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{client.phone || '—'}</div>
                          <div className="text-xs text-muted-foreground">{client.email || '—'}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={LOYALTY_COLOR[client.loyaltyLevel]}>
                            {client.loyaltyLevel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{client.visitCount}</TableCell>
                        <TableCell className="text-right font-medium">{client.loyaltyPoints}</TableCell>
                        <TableCell className="text-right font-bold">{formatXAF(client.totalSpent)}</TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(client as unknown as Client)}
                              className="p-1.5 rounded-lg hover:bg-blue-500/10 transition-colors opacity-0 group-hover:opacity-100"
                              title="Modifier"
                            >
                              <Pencil className="w-3.5 h-3.5 text-blue-400" />
                            </button>
                            <button
                              onClick={() => openDelete(client as unknown as Client)}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
              <Users className="w-12 h-12 mb-4 opacity-20" />
              <p>{search ? 'Aucun client trouvé pour cette recherche' : 'Aucun client enregistré'}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reviews Section */}
      {business && (
        <ReviewsSection businessId={business.id} sector={business.sector ?? 'OTHER'} />
      )}

      {/* Modals */}
      <AnimatePresence>
        {(showModal === 'add' || showModal === 'edit') && (
          <ClientModal
            client={showModal === 'edit' ? targetClient : null}
            onClose={() => { setShowModal(null); setTargetClient(null); }}
            businessId={business?.id ?? 0}
          />
        )}
        {showModal === 'delete' && targetClient && (
          <DeleteModal
            client={targetClient}
            onConfirm={() => deleteMutation.mutate(targetClient.id)}
            onClose={() => { setShowModal(null); setTargetClient(null); }}
            isPending={deleteMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
