'use client';
// @ts-nocheck
// admin/src/components/TrackingSection.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Admin UI for managing all tracking pixels & analytics IDs dynamically.
// Saves to site_settings table with id = 'tracking_config'
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  Save, Loader2, CheckCircle, Eye, EyeOff,
  BarChart2, ExternalLink, Wifi, WifiOff, Copy, AlertTriangle, Info
} from 'lucide-react';
import { cn } from '../lib/utils';

const SETTINGS_ID = 'tracking_config';

const EMPTY = {
  gtm_id: '',
  ga4_id: '',
  pixel_id: '',
  capi_token: '',
  capi_test_code: '',
  tracking_enabled: true,
};

// ── Field component ─────────────────────────────────────────────────────────
function Field({ label, hint, value, onChange, placeholder, masked = false, badge = null, monospace = false }) {
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
      <div className="flex items-center gap-2">
        <label className="text-sm font-semibold text-foreground">{label}</label>
        {badge && (
          <span className={cn(
            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
            badge === 'required' ? "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400"
            : badge === 'optional' ? "bg-muted text-muted-foreground"
            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
          )}>{badge}</span>
        )}
      </div>
      <div className="relative flex">
        <input
          type={masked && !show ? 'password' : 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-all",
            "focus:ring-2 focus:ring-primary/30 focus:border-primary",
            "placeholder:text-muted-foreground/50",
            monospace && "font-mono tracking-tight"
          )}
          autoComplete="off"
          spellCheck={false}
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {value && (
            <button
              type="button"
              onClick={copy}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Copy"
            >
              {copied ? <CheckCircle size={13} className="text-emerald-500" /> : <Copy size={13} />}
            </button>
          )}
          {masked && (
            <button
              type="button"
              onClick={() => setShow(s => !s)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              {show ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          )}
        </div>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ── Status badge ────────────────────────────────────────────────────────────
function StatusBadge({ label, active }) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full",
      active
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
        : "bg-muted text-muted-foreground"
    )}>
      {active ? <Wifi size={11} /> : <WifiOff size={11} />}
      {label}
    </div>
  );
}

// ── Help link ────────────────────────────────────────────────────────────────
function HelpLink({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
      {children} <ExternalLink size={11} />
    </a>
  );
}

// ── Main TrackingSection ─────────────────────────────────────────────────────
export default function TrackingSection({ supabase }) {
  const [cfg, setCfg] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  // Load from Supabase
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('site_settings')
        .select('data')
        .eq('id', SETTINGS_ID)
        .maybeSingle();
      if (data?.data) setCfg({ ...EMPTY, ...data.data });
    } catch (e) {
      setError('Failed to load tracking config: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  // Save to Supabase
  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const { error: err } = await supabase
        .from('site_settings')
        .upsert({ id: SETTINGS_ID, data: cfg }, { onConflict: 'id' });
      if (err) throw err;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError('Failed to save: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const set = (key) => (val) => setCfg(prev => ({ ...prev, [key]: val }));

  // Test fire a test event (fires a Purchase event to Meta Events Manager using test code)
  const fireTestEvent = async () => {
    if (!cfg.pixel_id || !cfg.capi_token) {
      setTestResult({ type: 'error', msg: 'Pixel ID and CAPI Token are required to test.' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const eventId = `test-${Date.now()}`;
      const payload = {
        data: [{
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          event_source_url: 'https://putimach.com',
          action_source: 'website',
          user_data: { client_user_agent: navigator.userAgent },
          custom_data: { value: 100, currency: 'BDT', order_id: 'TEST-001' },
        }],
        ...(cfg.capi_test_code ? { test_event_code: cfg.capi_test_code } : {}),
      };
      const res = await fetch(
        `https://graph.facebook.com/v20.0/${cfg.pixel_id}/events?access_token=${cfg.capi_token}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
      );
      const json = await res.json();
      if (json.error) {
        setTestResult({ type: 'error', msg: `CAPI Error: ${json.error.message}` });
      } else {
        setTestResult({ type: 'success', msg: `✅ CAPI test event sent! Events received: ${json.events_received || 1}. Check Meta Events Manager.` });
      }
    } catch (e) {
      setTestResult({ type: 'error', msg: `Request failed: ${e.message}` });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
          <BarChart2 size={20} />
        </div>
        <div>
          <h2 className="text-lg font-display font-semibold text-foreground">Tracking & Pixels</h2>
          <p className="text-sm text-muted-foreground">Configure GTM, GA4, Meta Pixel & CAPI for accurate analytics.</p>
        </div>
      </div>

      {/* Master Enable/Disable toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/40 border border-border/60">
        <div>
          <span className="block text-sm font-semibold text-foreground">Enable Tracking</span>
          <span className="block text-xs text-muted-foreground mt-0.5">
            Master switch — disabling stops all Pixel, CAPI, and GA4 events.
          </span>
        </div>
        <button
          type="button"
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
            cfg.tracking_enabled ? "bg-primary" : "bg-input"
          )}
          onClick={() => set('tracking_enabled')(!cfg.tracking_enabled)}
        >
          <span className={cn(
            "absolute left-0 inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
            cfg.tracking_enabled ? "translate-x-5" : "translate-x-0"
          )} />
        </button>
      </div>

      {/* Status row */}
      <div className="flex flex-wrap gap-2">
        <StatusBadge label="GTM" active={!!cfg.gtm_id && cfg.tracking_enabled} />
        <StatusBadge label="GA4" active={!!cfg.ga4_id && cfg.tracking_enabled} />
        <StatusBadge label="Meta Pixel" active={!!cfg.pixel_id && cfg.tracking_enabled} />
        <StatusBadge label="CAPI" active={!!cfg.capi_token && !!cfg.pixel_id && cfg.tracking_enabled} />
      </div>

      {/* GTM Section */}
      <div className="space-y-4 rounded-xl border border-border/60 p-5 bg-secondary/20">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Google Tag Manager</h3>
          <HelpLink href="https://tagmanager.google.com/">GTM Console</HelpLink>
        </div>
        <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-3 flex gap-2">
          <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
          <span>GTM manages all GA4 tags. Configure GA4 tags <strong>inside GTM</strong> — do NOT use both GTM + direct GA4 script (causes double events).</span>
        </div>
        <Field
          label="GTM Container ID"
          badge="required"
          placeholder="GTM-XXXXXXX"
          value={cfg.gtm_id}
          onChange={set('gtm_id')}
          hint="Format: GTM-XXXXXXX — found in your GTM container header snippet."
          monospace
        />
        <Field
          label="GA4 Measurement ID"
          badge="optional"
          placeholder="G-XXXXXXXXXX"
          value={cfg.ga4_id}
          onChange={set('ga4_id')}
          hint="Only needed if NOT using GTM. If GTM is configured, add GA4 via GTM tags."
          monospace
        />
      </div>

      {/* Meta Pixel Section */}
      <div className="space-y-4 rounded-xl border border-border/60 p-5 bg-secondary/20">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#1877f2]"></span>
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Meta Pixel & CAPI</h3>
          <HelpLink href="https://business.facebook.com/events_manager2/">Events Manager</HelpLink>
        </div>
        <div className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-3 flex gap-2">
          <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
          <span>Pixel + CAPI send the <strong>same eventID</strong> — Meta deduplicates automatically. No double counting.</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Meta Pixel ID"
            badge="required"
            placeholder="123456789012345"
            value={cfg.pixel_id}
            onChange={set('pixel_id')}
            hint="15-digit number from Events Manager → Data Sources."
            monospace
          />
          <Field
            label="CAPI Access Token"
            badge="required"
            placeholder="EAAxxxxxxxxxxxxxxx"
            value={cfg.capi_token}
            onChange={set('capi_token')}
            masked
            hint="Generate from Events Manager → Settings → Conversions API → Generate Token."
          />
        </div>
        <Field
          label="CAPI Test Event Code"
          badge="optional"
          placeholder="TEST12345"
          value={cfg.capi_test_code}
          onChange={set('capi_test_code')}
          hint="From Events Manager → Test Events tab. Remove after testing!"
          monospace
        />
      </div>

      {/* Events tracked info */}
      <div className="rounded-xl border border-border/60 p-5 bg-secondary/20 space-y-3">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Events Tracked</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { name: 'PageView', desc: 'Every route change' },
            { name: 'ViewContent', desc: 'Product page load' },
            { name: 'AddToCart', desc: 'Add to cart click' },
            { name: 'InitiateCheckout', desc: 'Checkout page open' },
            { name: 'Purchase', desc: 'Order placed ✓' },
            { name: 'Search', desc: 'Shop search query' },
          ].map(ev => (
            <div key={ev.name} className="rounded-lg bg-background border border-border/50 px-3 py-2">
              <p className="text-xs font-bold text-foreground">{ev.name}</p>
              <p className="text-[11px] text-muted-foreground">{ev.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          All events fire via <strong>Pixel (browser)</strong> + <strong>CAPI (browser→Meta API)</strong> with the same <code className="bg-muted px-1 rounded">eventID</code> for deduplication.
        </p>
      </div>

      {/* Test Event */}
      <div className="rounded-xl border border-border/60 p-5 space-y-3">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Test CAPI Connection</h3>
        <p className="text-xs text-muted-foreground">
          Sends a test Purchase event to Meta via CAPI. Make sure to set the Test Event Code above and save first.
        </p>
        <button
          type="button"
          onClick={fireTestEvent}
          disabled={testing || !cfg.pixel_id || !cfg.capi_token}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1877f2] text-white text-sm font-semibold hover:bg-[#1565d8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {testing ? <Loader2 size={15} className="animate-spin" /> : <Wifi size={15} />}
          {testing ? 'Sending Test Event...' : 'Send Test Purchase Event'}
        </button>
        {testResult && (
          <div className={cn(
            "rounded-lg p-3 text-sm font-medium",
            testResult.type === 'success'
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
              : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20"
          )}>
            {testResult.msg}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-4 text-sm text-rose-700 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* Save button */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <p className="text-xs text-muted-foreground">Changes apply after the storefront next loads.</p>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className={cn(
            "flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all",
            saved
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30"
              : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
          )}
        >
          {saving ? <Loader2 size={15} className="animate-spin" />
            : saved ? <CheckCircle size={15} /> : <Save size={15} />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
