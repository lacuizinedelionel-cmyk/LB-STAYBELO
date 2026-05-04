import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useAuth, simpleHash } from '@/context/AuthContext';
import {
  Zap, Building2, Mail, Phone, MapPin, ChevronDown,
  ArrowRight, CheckCircle2, Loader2, ArrowLeft, Briefcase,
} from 'lucide-react';

const SECTORS = [
  { value: 'HOTEL',      label: '🏨  Hôtellerie'             },
  { value: 'RESTAURANT', label: '🍽️  Restauration'           },
  { value: 'GROCERY',    label: '🛒  Supermarché / Épicerie'  },
  { value: 'PHARMACY',   label: '💊  Pharmacie'               },
  { value: 'BEAUTY',     label: '💅  Beauté & Bien-être'      },
  { value: 'GARAGE',     label: '🔧  Garage Automobile'       },
  { value: 'FITNESS',    label: '🏋️  Fitness & Sport'         },
  { value: 'EDUCATION',  label: '📚  Formation & Éducation'   },
];

const CITIES = [
  'Douala', 'Yaoundé', 'Bafoussam', 'Bamenda',
  'Garoua', 'Maroua', 'Ngaoundéré', 'Bertoua',
  'Ebolowa', 'Kribi',
];

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '15 000 XAF',
    period: '/mois',
    features: ['1 enseigne', 'Jusqu\'à 3 utilisateurs', 'Support email'],
    color: '#60A5FA',
    bg: 'hsl(213 93% 68% / 0.08)',
    border: 'hsl(213 93% 68% / 0.25)',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '35 000 XAF',
    period: '/mois',
    features: ['3 enseignes', 'Utilisateurs illimités', 'Support prioritaire', 'Analytics avancées'],
    color: 'hsl(38 90% 56%)',
    bg: 'hsl(38 90% 56% / 0.08)',
    border: 'hsl(38 90% 56% / 0.3)',
    recommended: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Sur devis',
    period: '',
    features: ['Enseignes illimitées', 'API dédiée', 'SLA garanti', 'Onboarding personnalisé'],
    color: '#A78BFA',
    bg: 'hsl(262 83% 58% / 0.08)',
    border: 'hsl(262 83% 58% / 0.25)',
  },
];

export default function SignupPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { saveLocalAccount } = useAuth();
  const [step, setStep]       = useState<'form' | 'plan' | 'success'>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [form, setForm] = useState({
    businessName: '',
    sector: '',
    city: '',
    email: '',
    phone: '',
    contactName: '',
  });
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountConfirmPassword, setAccountConfirmPassword] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const step1Valid = form.businessName && form.sector && form.city && form.email.includes('@') && form.phone;
  const signupValid = accountEmail.includes('@') && accountPassword.length >= 8 && accountPassword === accountConfirmPassword;

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!step1Valid) return;
    setStep('plan');
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    const accountName = form.contactName || form.businessName;

    saveLocalAccount({
      email: accountEmail,
      passwordHash: simpleHash(accountPassword),
      name: accountName,
      businessName: form.businessName,
      businessSector: form.sector,
      city: form.city,
      plan: selectedPlan,
      active: true,
    });

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: accountEmail,
          password: accountPassword,
          name: accountName,
          businessName: form.businessName,
        }),
      });

      if (!response.ok) throw new Error(await response.text());
    } catch {
    }

    setIsLoading(false);
    setStep('success');
    toast({
      title: 'Compte créé !',
      description: 'Vous pouvez maintenant vous connecter avec votre email et mot de passe.',
    });
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'hsl(var(--background))' }}>
      {/* Left panel */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex flex-col justify-between w-2/5 p-12 relative overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, hsl(222 50% 7%) 0%, hsl(222 50% 4%) 100%)',
          borderRight: '1px solid hsl(var(--border))',
        }}
      >
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, hsl(38 90% 56%), transparent 70%)' }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-9 h-9 rounded-xl gradient-gold flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-white font-extrabold text-lg" style={{ letterSpacing: '-0.02em' }}>LB Stay Cloud</span>
          </div>

          <h2 className="text-4xl font-extrabold text-white leading-tight mb-4" style={{ letterSpacing: '-0.03em' }}>
            Lancez votre<br />
            <span className="text-gradient-gold">business digital.</span>
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed">
            Rejoignez des centaines d'entreprises camerounaises qui gèrent leur activité avec LB Stay Cloud.
          </p>

          <div className="mt-10 space-y-3">
            {[
              { icon: '⚡', text: 'Mise en route en moins de 10 minutes' },
              { icon: '🔒', text: 'Données hébergées en sécurité au Cameroun' },
              { icon: '📱', text: 'Accessible depuis n\'importe quel appareil' },
              { icon: '🤝', text: 'Support local en français' },
            ].map(f => (
              <div key={f.text} className="flex items-center gap-3">
                <span className="text-lg">{f.icon}</span>
                <p className="text-sm text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-4">
          {[
            { label: 'Enseignes actives', value: '500+' },
            { label: 'Satisfaction client', value: '98%' },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-xl" style={{ background: 'hsl(var(--muted) / 0.5)' }}>
              <p className="text-2xl font-extrabold text-primary">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg gradient-gold flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-extrabold text-base text-foreground" style={{ letterSpacing: '-0.02em' }}>LB Stay Cloud</span>
          </div>

          {/* Stepper */}
          {step !== 'success' && (
            <div className="flex items-center gap-2 mb-8">
              {['Votre enseigne', 'Choisir un plan'].map((s, i) => {
                const cur = step === 'form' ? 0 : 1;
                const done = i < cur;
                const active = i === cur;
                return (
                  <div key={s} className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{
                          background: done ? '#10B981' : active ? 'hsl(38 90% 56%)' : 'hsl(var(--muted))',
                          color: done || active ? '#000' : 'hsl(var(--muted-foreground))',
                        }}
                      >
                        {done ? '✓' : i + 1}
                      </div>
                      <span className="text-xs font-medium" style={{ color: active ? 'hsl(38 90% 56%)' : 'hsl(var(--muted-foreground))' }}>
                        {s}
                      </span>
                    </div>
                    {i < 1 && <div className="w-8 h-px" style={{ background: 'hsl(var(--border))' }} />}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── ÉTAPE 1 : Informations enseigne ── */}
          {step === 'form' && (
            <>
              <Link href="/login" className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6 hover:text-foreground transition-colors w-fit">
                <ArrowLeft className="w-3.5 h-3.5" /> Retour à la connexion
              </Link>

              <h1 className="text-3xl font-extrabold text-foreground mb-1" style={{ letterSpacing: '-0.03em' }}>
                Créer un compte
              </h1>
              <p className="text-muted-foreground text-sm mb-7">
                Renseignez les informations de votre enseigne pour démarrer.
              </p>

              <form onSubmit={handleStep1} className="space-y-4">
                {/* Nom enseigne */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Nom de l'enseigne <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div className="flex items-center gap-2 px-3 h-11 rounded-xl"
                    style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
                    <Building2 className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                    <input
                      value={form.businessName}
                      onChange={set('businessName')}
                      placeholder="Ex : Hôtel Le Prestige, Chez Mama..."
                      required
                      className="bg-transparent flex-1 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                    />
                  </div>
                </div>

                {/* Nom contact */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Votre nom complet
                  </label>
                  <div className="flex items-center gap-2 px-3 h-11 rounded-xl"
                    style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
                    <Briefcase className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                    <input
                      value={form.contactName}
                      onChange={set('contactName')}
                      placeholder="Ex : Jean-Pierre Kamdem"
                      className="bg-transparent flex-1 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                    />
                  </div>
                </div>

                {/* Secteur + Ville */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Secteur <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={form.sector}
                        onChange={set('sector')}
                        required
                        className="w-full h-11 pl-3 pr-8 rounded-xl text-sm outline-none appearance-none"
                        style={{
                          background: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          color: form.sector ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                          colorScheme: 'dark',
                        }}
                      >
                        <option value="">Choisir...</option>
                        {SECTORS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Ville <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={form.city}
                        onChange={set('city')}
                        required
                        className="w-full h-11 pl-3 pr-8 rounded-xl text-sm outline-none appearance-none"
                        style={{
                          background: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          color: form.city ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                          colorScheme: 'dark',
                        }}
                      >
                        <option value="">Choisir...</option>
                        {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Email du compte <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div className="flex items-center gap-2 px-3 h-11 rounded-xl"
                    style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                    <input
                      type="email"
                      value={accountEmail}
                      onChange={e => setAccountEmail(e.target.value)}
                      placeholder="moncompte@email.com"
                      required
                      className="bg-transparent flex-1 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Mot de passe <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div className="flex items-center gap-2 px-3 h-11 rounded-xl"
                    style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
                    <input
                      type="password"
                      value={accountPassword}
                      onChange={e => setAccountPassword(e.target.value)}
                      placeholder="Minimum 8 caractères"
                      required
                      className="bg-transparent flex-1 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Confirmer le mot de passe <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div className="flex items-center gap-2 px-3 h-11 rounded-xl"
                    style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
                    <input
                      type="password"
                      value={accountConfirmPassword}
                      onChange={e => setAccountConfirmPassword(e.target.value)}
                      placeholder="Répétez le mot de passe"
                      required
                      className="bg-transparent flex-1 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                    />
                  </div>
                </div>

                {/* Téléphone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Téléphone <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div className="flex items-center gap-2 px-3 h-11 rounded-xl"
                    style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
                    <Phone className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={set('phone')}
                      placeholder="+237 6XX XXX XXX"
                      required
                      className="bg-transparent flex-1 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!step1Valid || !signupValid}
                  className="w-full h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 mt-2"
                  style={{ background: 'hsl(38 90% 56%)', color: '#000' }}
                >
                  Continuer <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <p className="text-center text-xs text-muted-foreground mt-6">
                Déjà un code d'activation ?{' '}
                <Link href="/activate" className="font-semibold transition-colors" style={{ color: 'hsl(38 90% 56%)' }}>
                  Activer mon compte
                </Link>
              </p>
            </>
          )}

          {/* ── ÉTAPE 2 : Choix du plan ── */}
          {step === 'plan' && (
            <>
              <button
                onClick={() => setStep('form')}
                className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6 hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Modifier mes informations
              </button>

              <h1 className="text-2xl font-extrabold text-foreground mb-1" style={{ letterSpacing: '-0.02em' }}>
                Choisissez votre offre
              </h1>
              <p className="text-muted-foreground text-sm mb-6">
                Pour <strong className="text-foreground">{form.businessName}</strong> · {form.city}
              </p>

              <div className="space-y-3 mb-6">
                {PLANS.map(plan => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className="w-full p-4 rounded-xl text-left transition-all relative"
                    style={{
                      background: selectedPlan === plan.id ? plan.bg : 'hsl(var(--card))',
                      border: `1.5px solid ${selectedPlan === plan.id ? plan.border : 'hsl(var(--border))'}`,
                    }}
                  >
                    {plan.recommended && (
                      <span
                        className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: plan.bg, color: plan.color, border: `1px solid ${plan.border}` }}
                      >
                        RECOMMANDÉ
                      </span>
                    )}
                    <div className="flex items-start justify-between pr-20">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ background: selectedPlan === plan.id ? plan.color : 'hsl(var(--muted))' }}
                          />
                          <span className="text-sm font-bold text-foreground">{plan.name}</span>
                        </div>
                        <div className="flex items-baseline gap-1 mb-2">
                          <span className="text-xl font-extrabold" style={{ color: plan.color, letterSpacing: '-0.02em' }}>
                            {plan.price}
                          </span>
                          <span className="text-xs text-muted-foreground">{plan.period}</span>
                        </div>
                        <ul className="space-y-1">
                          {plan.features.map(f => (
                            <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span style={{ color: plan.color }}>✓</span> {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className="w-full h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                style={{ background: 'hsl(38 90% 56%)', color: '#000' }}
              >
                {isLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…</>
                  : <>Confirmer ma demande <ArrowRight className="w-4 h-4" /></>
                }
              </button>

              <p className="text-center text-[11px] text-muted-foreground mt-4">
                En confirmant, vous acceptez les{' '}
                <span className="font-medium" style={{ color: 'hsl(38 90% 56%)' }}>conditions d'utilisation</span>
                {' '}de LB Stay Cloud.
              </p>
            </>
          )}

          {/* ── SUCCÈS ── */}
          {step === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
                style={{ background: 'hsl(38 90% 56% / 0.12)' }}>
                <CheckCircle2 className="w-10 h-10" style={{ color: 'hsl(38 90% 56%)' }} />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-foreground mb-2" style={{ letterSpacing: '-0.02em' }}>
                  Demande envoyée !
                </h2>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Notre équipe va étudier votre demande et vous envoyer votre code d'activation sous <strong className="text-foreground">24 à 48h</strong>.
                </p>
              </div>
              <div className="p-4 rounded-xl text-left space-y-1"
                style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}>
                <p className="text-xs text-muted-foreground">Enseigne : <span className="font-semibold text-foreground">{form.businessName}</span></p>
                <p className="text-xs text-muted-foreground">Email : <span className="font-semibold text-foreground">{form.email}</span></p>
                <p className="text-xs text-muted-foreground">Ville : <span className="font-semibold text-foreground">{form.city}</span></p>
              </div>
              <button
                onClick={() => setLocation('/login')}
                className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                style={{ background: 'hsl(38 90% 56%)', color: '#000' }}
              >
                Retour à la connexion <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
