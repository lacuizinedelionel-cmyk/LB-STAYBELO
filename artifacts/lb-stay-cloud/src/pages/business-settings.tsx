import { useEffect, useMemo, useRef, useState } from 'react';
import { Redirect, useParams } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { BadgeDollarSign, CheckCircle2, Globe, ImagePlus, Loader2, Upload, X } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl p-5 space-y-4" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-lg text-sm text-foreground outline-none transition-all"
      style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}
    />
  );
}

function LogoPicker({ businessId, logoUrl, onChange }: { businessId: number; logoUrl: string; onChange: (value: string) => void }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadLogo = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Fichier invalide', description: 'PNG, JPG ou SVG uniquement', variant: 'destructive' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Fichier trop lourd', description: 'Maximum 2 Mo', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="relative shrink-0">
          <div className="w-24 h-24 rounded-2xl flex items-center justify-center overflow-hidden" style={{ background: logoUrl ? 'white' : 'hsl(var(--muted))', border: '1px dashed hsl(var(--border))' }}>
            {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1.5" /> : <ImagePlus className="w-8 h-8 text-muted-foreground/40" strokeWidth={1} />}
          </div>
          {logoUrl && (
            <button type="button" onClick={() => onChange('')} className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#EF4444', border: '2px solid hsl(var(--background))' }}>
              <X className="w-2.5 h-2.5 text-white" strokeWidth={3} />
            </button>
          )}
        </div>
        <div className="flex-1 space-y-3">
          <button type="button" onClick={() => fileRef.current?.click()} className="w-full rounded-xl p-4 flex items-center justify-center gap-2" style={{ border: '1px dashed hsl(var(--border))', background: 'hsl(var(--muted) / 0.35)' }}>
            <Upload className="w-4 h-4" />
            Télécharger un logo
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
        </div>
      </div>
      <input type="hidden" value={logoUrl} />
    </div>
  );
}

export default function BusinessSettingsPage() {
  const { id } = useParams();
  const { business } = useAuth();
  const { isSuperAdmin, hasMinRole } = usePermissions();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canAccess = useMemo(() => {
    if (isSuperAdmin) return true;
    if (!business) return false;
    return hasMinRole('OWNER') && String(business.id) === String(id);
  }, [business, hasMinRole, id, isSuperAdmin]);
  const businessId = business?.id ?? 0;
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [currency, setCurrency] = useState('XAF');
  const [logoUrl, setLogoUrl] = useState('');

  const { data, refetch } = useQuery({
    queryKey: ['business-settings', businessId],
    queryFn: async () => {
      const res = await fetch(`/api/billing/settings?businessId=${businessId}`, { credentials: 'include' });
      if (!res.ok) return null;
      return res.json() as Promise<{ logoUrl?: string | null; address?: string | null; phone?: string | null; currency?: string | null; businessName?: string | null }>;
    },
    enabled: !!businessId,
  });

  useEffect(() => {
    setName(business?.name ?? '');
    setLogoUrl((data?.logoUrl ?? (business as any)?.logoUrl ?? '') as string);
    setAddress((data?.address ?? (business as any)?.address ?? '') as string);
    setPhone((data?.phone ?? (business as any)?.phone ?? '') as string);
    setCurrency((data?.currency ?? 'XAF') as string);
  }, [business, data]);

  const { mutate: saveSettings, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/billing/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ businessId, logoUrl, address, phone, currency, businessName: name }),
      });
      if (!res.ok) throw new Error('Erreur serveur');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-settings', businessId] });
      refetch();
      toast({ title: '✅ ' + t.settings.savedOk });
    },
    onError: () => toast({ title: t.common.error, variant: 'destructive' }),
  });

  if (!business && !isSuperAdmin) return <Redirect to="/login" />;
  if (!canAccess) return <Redirect to="/settings" />;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">{t.settings.title}</h1>
        <p className="text-xs text-muted-foreground mt-1">{t.settings.subtitle}</p>
      </div>

      <Card>
        <Field label="Nom de l'établissement">
          <Input value={name} onChange={setName} placeholder="Nom de l'établissement" />
        </Field>
        <Field label="Logo">
          <LogoPicker businessId={businessId} logoUrl={logoUrl} onChange={setLogoUrl} />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Adresse physique">
            <Input value={address} onChange={setAddress} placeholder="Adresse de l'établissement" />
          </Field>
          <Field label="Numéro de téléphone">
            <Input value={phone} onChange={setPhone} placeholder="+237..." />
          </Field>
        </div>
        <Field label="Devise">
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm" style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}>
            <BadgeDollarSign className="w-4 h-4" />
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full bg-transparent outline-none">
              <option value="XAF">XAF</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </Field>
        <button
          type="button"
          onClick={() => saveSettings()}
          disabled={isPending}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #D97706, #F5A623)', color: '#000' }}
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {t.actions.save}
        </button>
      </Card>
    </div>
  );
}