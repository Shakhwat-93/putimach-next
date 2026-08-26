'use client';
// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import {
  Save, Loader2, CheckCircle2, Eye, EyeOff,
  BarChart2, ExternalLink, Wifi, WifiOff, Copy, 
  AlertTriangle, ShieldCheck, Zap, Activity, Info, 
  Check, Sparkles, RefreshCw, Play
} from 'lucide-react';
import { cn } from '../lib/utils';
import Swal from 'sweetalert2';

const SETTINGS_ID = 'default';

const EMPTY_SETTINGS = {
  // Google
  gtm_enabled: false,
  gtm_container_id: '',
  ga4_enabled: false,
  ga4_measurement_id: '',
  google_ads_enabled: false,
  google_ads_conversion_id: '',
  google_ads_purchase_label: '',
  google_ads_cart_label: '',
  google_ads_begin_checkout_label: '',

  // Meta
  meta_enabled: true,
  meta_pixel_id: '',
  meta_capi_enabled: true,
  meta_capi_token: '',
  meta_capi_test_code: '',

  // TikTok
  tiktok_enabled: false,
  tiktok_pixel_id: '',
  tiktok_events_api_enabled: false,
  tiktok_access_token: '',
  tiktok_test_code: '',

  // General
  ecommerce_tracking_enabled: true,
  debug_mode: false,
  consent_mode_enabled: false,
  advanced_matching_enabled: true,
};

// ── Form Input Field ────────────────────────────────────────────────────────
function FormField({ 
  label, 
  hint, 
  value, 
  onChange, 
  placeholder, 
  masked = false, 
  badge = null, 
  monospace = false 
}) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-foreground uppercase tracking-wider">{label}</label>
          {badge && (
            <span className={cn(
              "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full",
              badge === 'required' ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
              : badge === 'optional' ? "bg-muted text-muted-foreground"
              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
            )}>{badge}</span>
          )}
        </div>
      </div>
      <div className="relative flex">
        <input
          type={masked && !show ? 'password' : 'text'}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "flex-1 rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground outline-none transition-all",
            "focus:ring-2 focus:ring-primary/20 focus:border-primary",
            "placeholder:text-muted-foreground/40",
            monospace && "font-mono tracking-tight"
          )}
          autoComplete="off"
          spellCheck={false}
        />
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {value && (
            <button
              type="button"
              onClick={copy}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Copy"
            >
              {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            </button>
          )}
          {masked && (
            <button
              type="button"
              onClick={() => setShow(s => !s)}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              {show ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          )}
        </div>
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ── Toggle Switch Component ──────────────────────────────────────────────────
function SwitchToggle({ label, desc, checked, onChange, disabled }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="space-y-0.5">
        <p className="text-xs font-bold text-foreground">{label}</p>
        {desc && <p className="text-[11px] text-muted-foreground">{desc}</p>}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none",
          checked ? "bg-primary" : "bg-muted",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}

export default function TrackingSection({ supabase }) {
  const [cfg, setCfg] = useState(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState(null);

  // Load from Supabase tracking_settings
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tracking_settings')
        .select('*')
        .eq('id', SETTINGS_ID)
        .maybeSingle();

      if (data) {
        setCfg({ ...EMPTY_SETTINGS, ...data });
      }
    } catch (e) {
      console.error('Failed to load tracking settings:', e);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  // Save to Supabase tracking_settings
  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        id: SETTINGS_ID,
        ...cfg,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('tracking_settings')
        .upsert(payload, { onConflict: 'id' });

      if (error) throw error;

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      Swal.fire({
        title: 'Settings Saved',
        text: 'Marketing & Analytics tracking configuration has been updated.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err: any) {
      console.error('Failed to save tracking settings:', err);
      Swal.fire({
        title: 'Save Failed',
        text: err?.message || 'Could not update tracking settings in database.',
        icon: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  // Run Live Diagnostic Test
  const handleRunDiagnostic = async () => {
    setTesting(true);
    setTestResults(null);
    try {
      // First save current state so test runs against latest credentials
      await save();

      const res = await fetch('/api/tracking/test', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setTestResults(json.report);
      } else {
        throw new Error(json.error || 'Diagnostic test failed.');
      }
    } catch (err: any) {
      Swal.fire({ title: 'Test Failed', text: err.message, icon: 'error' });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-xs gap-2">
        <Loader2 size={16} className="animate-spin text-primary" />
        <span>Loading marketing tracking configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl min-w-0">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <BarChart2 size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight font-display">
                Marketing Tracking & Analytics
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Centralized conversion tracking for Google Tag Manager, GA4, Meta Pixel, Meta CAPI, and TikTok.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleRunDiagnostic}
            disabled={testing || saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-secondary text-xs font-bold text-foreground transition-all cursor-pointer shadow-2xs"
          >
            {testing ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} className="text-primary fill-primary" />}
            <span>Test Configuration</span>
          </button>

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <CheckCircle2 size={14} /> : <Save size={14} />}
            <span>{saved ? 'Saved' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* ── Diagnostic Results Card if Tested ── */}
      {testResults && (
        <div className="p-4 sm:p-5 rounded-2xl border border-primary/20 bg-primary/5 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Sparkles size={14} />
              <span>Live Diagnostic Report</span>
            </h3>
            <button
              type="button"
              onClick={() => setTestResults(null)}
              className="text-[11px] text-muted-foreground hover:text-foreground font-semibold"
            >
              Dismiss
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* GTM */}
            <div className="p-3 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">Google Tag Manager</span>
                <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase", 
                  testResults.gtm?.status === 'valid' ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>
                  {testResults.gtm?.status}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{testResults.gtm?.message || 'Not enabled'}</p>
            </div>

            {/* GA4 */}
            <div className="p-3 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">Google Analytics 4</span>
                <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase", 
                  testResults.ga4?.status === 'valid' ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>
                  {testResults.ga4?.status}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{testResults.ga4?.message || 'Not enabled'}</p>
            </div>

            {/* Meta CAPI */}
            <div className="p-3 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">Meta Conversions API</span>
                <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase", 
                  testResults.metaCapi?.status === 'connected' ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300")}>
                  {testResults.metaCapi?.status}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{testResults.metaCapi?.message || 'Not enabled'}</p>
            </div>

            {/* TikTok Events API */}
            <div className="p-3 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">TikTok Events API</span>
                <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase", 
                  testResults.tiktokEventsApi?.status === 'connected' ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>
                  {testResults.tiktokEventsApi?.status}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{testResults.tiktokEventsApi?.message || 'Not enabled'}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Section 1: Google (GTM, GA4, Google Ads) ── */}
      <div className="p-5 sm:p-6 rounded-2xl border border-border bg-card shadow-2xs space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold">
              <Zap size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Google Suite (GTM & GA4)</h3>
              <p className="text-[11px] text-muted-foreground">Standardized dataLayer integration with zero duplicate events.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <SwitchToggle
            label="Enable Google Tag Manager (GTM)"
            desc="Loads GTM container script and dispatches all ecommerce events to window.dataLayer."
            checked={cfg.gtm_enabled}
            onChange={v => setCfg(c => ({ ...c, gtm_enabled: v }))}
          />

          {cfg.gtm_enabled && (
            <FormField
              label="GTM Container ID"
              placeholder="e.g. GTM-XXXXXXX"
              value={cfg.gtm_container_id}
              onChange={v => setCfg(c => ({ ...c, gtm_container_id: v }))}
              badge="required"
              monospace
              hint="Found in your Google Tag Manager container overview."
            />
          )}

          <div className="pt-2 border-t border-border/50">
            <SwitchToggle
              label="Enable Direct GA4 Measurement"
              desc="Only active when GTM is disabled to prevent duplicate GA4 pageviews."
              checked={cfg.ga4_enabled}
              onChange={v => setCfg(c => ({ ...c, ga4_enabled: v }))}
            />

            {cfg.ga4_enabled && (
              <div className="pt-2">
                <FormField
                  label="GA4 Measurement ID"
                  placeholder="e.g. G-XXXXXXXXXX"
                  value={cfg.ga4_measurement_id}
                  onChange={v => setCfg(c => ({ ...c, ga4_measurement_id: v }))}
                  badge="required"
                  monospace
                  hint="Found under Google Analytics Admin → Data Streams."
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 2: Meta (Pixel + Conversions API) ── */}
      <div className="p-5 sm:p-6 rounded-2xl border border-border bg-card shadow-2xs space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <ShieldCheck size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Meta (Facebook & Instagram)</h3>
              <p className="text-[11px] text-muted-foreground">Browser Meta Pixel and server-side Conversions API with SHA-256 matching.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <SwitchToggle
            label="Enable Meta Pixel"
            desc="Fires client-side fbq() standard ecommerce events (ViewContent, AddToCart, Purchase)."
            checked={cfg.meta_enabled}
            onChange={v => setCfg(c => ({ ...c, meta_enabled: v }))}
          />

          {cfg.meta_enabled && (
            <FormField
              label="Meta Dataset / Pixel ID"
              placeholder="e.g. 1295101048421113"
              value={cfg.meta_pixel_id}
              onChange={v => setCfg(c => ({ ...c, meta_pixel_id: v }))}
              badge="required"
              monospace
              hint="Found in Meta Events Manager under Dataset Settings."
            />
          )}

          <div className="pt-2 border-t border-border/50 space-y-4">
            <SwitchToggle
              label="Enable Meta Conversions API (CAPI)"
              desc="Dispatches server-side events asynchronously sharing the exact same event_id for 100% deduplication."
              checked={cfg.meta_capi_enabled}
              onChange={v => setCfg(c => ({ ...c, meta_capi_enabled: v }))}
            />

            {cfg.meta_capi_enabled && (
              <div className="space-y-4 pt-1">
                <FormField
                  label="Conversions API Access Token"
                  placeholder="EAAG..."
                  value={cfg.meta_capi_token}
                  onChange={v => setCfg(c => ({ ...c, meta_capi_token: v }))}
                  badge="server secret"
                  masked
                  monospace
                  hint="Generated in Meta Events Manager under Settings → Generate Access Token. Never exposed to browser."
                />

                <FormField
                  label="Test Event Code (Optional for Staging/Testing)"
                  placeholder="e.g. TEST12345"
                  value={cfg.meta_capi_test_code}
                  onChange={v => setCfg(c => ({ ...c, meta_capi_test_code: v }))}
                  badge="optional"
                  monospace
                  hint="Found in Meta Events Manager → Test Events tab. Leave blank for live production."
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 3: TikTok (Pixel + Events API) ── */}
      <div className="p-5 sm:p-6 rounded-2xl border border-border bg-card shadow-2xs space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-pink-500/10 text-pink-600 flex items-center justify-center font-bold">
              <Activity size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">TikTok Business Analytics</h3>
              <p className="text-[11px] text-muted-foreground">TikTok Pixel + TikTok server-side Events API with ttclid pass-through.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <SwitchToggle
            label="Enable TikTok Pixel"
            desc="Fires browser-level ttq tracking for product views, cart additions, and payments."
            checked={cfg.tiktok_enabled}
            onChange={v => setCfg(c => ({ ...c, tiktok_enabled: v }))}
          />

          {cfg.tiktok_enabled && (
            <FormField
              label="TikTok Pixel ID"
              placeholder="e.g. CXXXXXXXXXXXXXXX"
              value={cfg.tiktok_pixel_id}
              onChange={v => setCfg(c => ({ ...c, tiktok_pixel_id: v }))}
              badge="required"
              monospace
              hint="Found in TikTok Ads Manager under Assets → Events."
            />
          )}

          <div className="pt-2 border-t border-border/50 space-y-4">
            <SwitchToggle
              label="Enable TikTok Events API (Server-Side)"
              desc="Sends server events via TikTok Business API v1.3 with SHA-256 customer matching."
              checked={cfg.tiktok_events_api_enabled}
              onChange={v => setCfg(c => ({ ...c, tiktok_events_api_enabled: v }))}
            />

            {cfg.tiktok_events_api_enabled && (
              <div className="space-y-4 pt-1">
                <FormField
                  label="TikTok Events API Access Token"
                  placeholder="Paste TikTok Long-Lived Access Token..."
                  value={cfg.tiktok_access_token}
                  onChange={v => setCfg(c => ({ ...c, tiktok_access_token: v }))}
                  badge="server secret"
                  masked
                  monospace
                  hint="Generated in TikTok Ads Manager under Web Event Settings."
                />

                <FormField
                  label="TikTok Test Event Code (Optional)"
                  placeholder="e.g. TEST..."
                  value={cfg.tiktok_test_code}
                  onChange={v => setCfg(c => ({ ...c, tiktok_test_code: v }))}
                  badge="optional"
                  monospace
                  hint="Found in TikTok Ads Manager → Test Events tab."
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 4: General Settings & Privacy Controls ── */}
      <div className="p-5 sm:p-6 rounded-2xl border border-border bg-card shadow-2xs space-y-4">
        <div className="border-b border-border pb-3">
          <h3 className="text-sm font-bold text-foreground">General Privacy & Diagnostics</h3>
          <p className="text-[11px] text-muted-foreground">Control global tracking execution and debugging logs.</p>
        </div>

        <div className="space-y-3">
          <SwitchToggle
            label="Master Ecommerce Tracking"
            desc="Master switch. When turned off, all marketing pixels and conversion APIs are silenced."
            checked={cfg.ecommerce_tracking_enabled}
            onChange={v => setCfg(c => ({ ...c, ecommerce_tracking_enabled: v }))}
          />

          <SwitchToggle
            label="Advanced Matching (Hashed Customer Parameters)"
            desc="Sends SHA-256 hashed customer phone and email with server conversions to boost event match quality."
            checked={cfg.advanced_matching_enabled}
            onChange={v => setCfg(c => ({ ...c, advanced_matching_enabled: v }))}
          />

          <SwitchToggle
            label="Developer Debug Mode"
            desc="Outputs formatted event payloads and deduplication IDs directly to the browser console."
            checked={cfg.debug_mode}
            onChange={v => setCfg(c => ({ ...c, debug_mode: v }))}
          />
        </div>
      </div>

    </div>
  );
}
