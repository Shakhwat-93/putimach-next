'use client';
// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import './Settings.css';
import { usePathname } from 'next/navigation';

import { useAuth } from '../context/AuthContext';
import { useBranding } from '../hooks/useBranding';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import { DateRangePicker } from '../components/DateRangePicker';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import { Input } from '../components/ui/input';
import { cn } from '../lib/utils';
import TrackingSection from '../components/TrackingSection';
import {
  Settings as SettingsIcon, Trash2, AlertTriangle, CheckCircle, Loader2,
  ShieldAlert, Database, Truck, Zap, Key, Save, Type, Bell, Package,
  Clock, Shield, Sliders, Eye, EyeOff, ChevronRight, ChevronLeft, Activity,
  ToggleLeft, ToggleRight, RefreshCw, Lock, Palette, Download, BarChart2, Copy, ExternalLink, Wifi
} from 'lucide-react';

// ── Sidebar nav sections ──
const NAV = [
  { id: 'general',     label: 'General',         icon: Palette,    desc: 'Branding & appearance' },
  { id: 'automation',  label: 'Automation',       icon: Zap,        desc: 'Order lifecycle rules' },
  { id: 'fraud',       label: 'Fraud Detection',  icon: Shield,     desc: 'Duplicate & anomaly rules' },
  { id: 'inventory',   label: 'Inventory Alerts', icon: Package,    desc: 'Stock threshold controls' },
  { id: 'courier',     label: 'Courier',          icon: Truck,      desc: 'Steadfast integration' },
  { id: 'alerts',      label: 'Alert Timers',     icon: Bell,       desc: 'Response & notification timers' },
  { id: 'update',      label: 'App Updates',      icon: RefreshCw,  desc: 'OTA Updates & Version Center' },
  { id: 'tracking',    label: 'Tracking & Pixels', icon: BarChart2, desc: 'GTM, GA4, Meta Pixel & CAPI' },
  { id: 'danger',      label: 'Danger Zone',      icon: AlertTriangle, desc: 'System reset', danger: true },
];

// ── Reusable toggle ──
const Toggle = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    className={cn(
      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none",
      checked ? "bg-primary" : "bg-input",
      disabled && "opacity-50 cursor-not-allowed"
    )}
    onClick={() => !disabled && onChange(!checked)}
    disabled={disabled}
    aria-label="toggle"
  >
    <span className={cn(
      "absolute left-0 inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
      checked ? "translate-x-5" : "translate-x-0"
    )} />
  </button>
);

// ── Reusable number slider row ──
const SliderRow = ({ label, desc, value, min, max, step = 1, unit = 'hrs', onChange }) => (
  <div className="flex flex-col gap-2 py-4 border-b border-border/50 last:border-0 md:flex-row md:items-center md:justify-between">
    <div className="flex flex-col">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <span className="text-xs text-muted-foreground mt-0.5">{desc}</span>
    </div>
    <div className="flex items-center gap-3 md:w-64">
      <span className="text-sm font-bold text-primary w-16 shrink-0">{value}{unit}</span>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  </div>
);

// ── Section header ──
const SectionHead = ({ icon: Icon, title, desc }) => (
  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
      <Icon size={20} />
    </div>
    <div>
      <h2 className="text-lg font-display font-semibold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  </div>
);

// ── Save button ──
const SaveBtn = ({ onClick, saving, saved, disabled, label = 'Save Changes' }) => (
  <button
    className={cn(
      "flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all",
      saved ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30" : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
    )}
    onClick={onClick}
    disabled={saving || disabled}
  >
    {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <><CheckCircle size={16} /> Saved!</> : <><Save size={16} /> {label}</>}
  </button>
);

// ── localStorage helpers for runtime configs ──
const LS_AUTOMATION = 'of_automation_config';
const LS_FRAUD      = 'of_fraud_config';
const LS_ALERTS     = 'of_alerts_config';
const LS_INVENTORY  = 'of_inventory_alert_config';

const loadLS = (key, defaults) => {
  try { return { ...defaults, ...JSON.parse((typeof window !== 'undefined' ? localStorage : { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} }).getItem(key) || '{}') }; }
  catch { return defaults; }
};
const saveLS = (key, val) => (typeof window !== 'undefined' ? localStorage : { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} }).setItem(key, JSON.stringify(val));

// ──────────────────────────────────────────────────────────────────
export const Settings = () => {
  const { user, profile, isAdmin } = useAuth();
  const { appName, isSaving: isSavingBranding, saveBranding } = useBranding();
  const { showError, ConfirmDialogComponent } = useConfirmDialog();

  const pathname = usePathname();

  const [activeSection, setActiveSection] = useState(() => {
    const params = new URLSearchParams((typeof window !== 'undefined' ? window.location.search : ''));
    return params.get('section') || 'general';
  });

  const [currentMobileView, setCurrentMobileView] = useState(() => {
    const params = new URLSearchParams((typeof window !== 'undefined' ? window.location.search : ''));
    return params.get('section') ? 'detail' : 'master';
  });

  const [updatingState, setUpdatingState] = useState('idle');

  useEffect(() => {
    const params = new URLSearchParams("");
    const sec = params.get('section');
    if (sec) {
      setActiveSection(sec);
      setCurrentMobileView('detail');
    }
  }, [""]);

  // ── App Updates OTA ──
  const CURRENT_VERSION_CODE = 2;
  const CURRENT_VERSION_NAME = "2.0.1";
  const [remoteVersion, setRemoteVersion] = useState(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [publishSaving, setPublishSaving] = useState(false);
  const [publishSaved, setPublishSaved] = useState(false);

  // Form states for releasing new updates (Admins only)
  const [formCode, setFormCode] = useState(CURRENT_VERSION_CODE + 1);
  const [formName, setFormName] = useState("2.1.0");
  const [formApkUrl, setFormApkUrl] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const fetchRemoteVersion = useCallback(async () => {
    setCheckingUpdate(true);
    setUpdateError(null);
    try {
      const config = await api.getSystemConfig('app_version');
      if (config) {
        setRemoteVersion(config);
        setFormCode((Number(config.versionCode) || CURRENT_VERSION_CODE) + 1);
        setFormName(config.versionName || "2.1.0");
        setFormApkUrl(config.apkUrl || "");
        setFormNotes(config.releaseNotes || "");
      } else {
        const initVal = {
          versionCode: CURRENT_VERSION_CODE,
          versionName: CURRENT_VERSION_NAME,
          apkUrl: "https://github.com/Shakhwat-93/Orderflow/actions",
          releaseNotes: "Initial elite production release of OrderFlow App."
        };
        setRemoteVersion(initVal);
      }
    } catch (err) {
      console.error('Error checking updates:', err);
      setUpdateError('Failed to retrieve server version. Check connection.');
    } finally {
      setCheckingUpdate(false);
    }
  }, []);

  useEffect(() => {
    fetchRemoteVersion();
  }, [fetchRemoteVersion]);

  const handlePublishRelease = async () => {
    const finalApkUrl = formApkUrl.trim() || "https://github.com/Shakhwat-93/Orderflow/actions";
    setPublishSaving(true);
    setPublishSaved(false);
    try {
      const payload = {
        versionCode: Number(formCode),
        versionName: formName.trim(),
        apkUrl: finalApkUrl,
        releaseNotes: formNotes.trim(),
        publishedAt: new Date().toISOString(),
        publishedBy: profile?.name || 'Admin'
      };

      await api.updateSystemConfig('app_version', payload);
      setRemoteVersion(payload);
      setPublishSaved(true);
      setTimeout(() => setPublishSaved(false), 3000);
    } catch (err) {
      console.error('Failed to publish release:', err);
      showError(err.message, 'Failed to Publish Release');
    } finally {
      setPublishSaving(false);
    }
  };

  // ── Branding ──
  const [brandingName, setBrandingName] = useState(appName);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingSaved, setBrandingSaved] = useState(false);
  useEffect(() => setBrandingName(appName), [appName]);

  // ── Automation Rules ──
  const [automation, setAutomation] = useState(() => loadLS(LS_AUTOMATION, {
    stale_new: 48, stale_pending: 72, stale_confirmed: 96, enabled: true
  }));
  const [autoSaving, setAutoSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);

  // ── Fraud Detection ──
  const [fraud, setFraud] = useState(() => loadLS(LS_FRAUD, {
    enabled: true, phone_check: true, address_check: true, similarity_threshold: 85
  }));
  const [fraudSaving, setFraudSaving] = useState(false);
  const [fraudSaved, setFraudSaved] = useState(false);

  // ── Inventory Alerts ──
  const [invAlert, setInvAlert] = useState(() => loadLS(LS_INVENTORY, {
    global_min_stock: 5, alert_enabled: true
  }));
  const [invSaving, setInvSaving] = useState(false);
  const [invSaved, setInvSaved] = useState(false);

  // ── Alert Timers ──
  const [alerts, setAlerts] = useState(() => loadLS(LS_ALERTS, {
    no_call_alert_mins: 20, no_call_alert_enabled: true,
    response_warn_mins: 15, sound_enabled: true
  }));
  const [alertSaving, setAlertSaving] = useState(false);
  const [alertSaved, setAlertSaved] = useState(false);

  // ── Courier ──
  const [courierConfig, setCourierConfig] = useState({ api_key: '', secret_key: '', is_enabled: false, auto_dispatch: false });
  const [courierLoading, setCourierLoading] = useState(true);
  const [courierSaving, setCourierSaving] = useState(false);
  const [courierSaved, setCourierSaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);

  // ── Pathao Courier ──
  const [pathaoConfig, setPathaoConfig] = useState({
    base_url: 'https://courier-api-sandbox.pathao.com',
    client_id: '',
    client_secret: '',
    username: '',
    password: '',
    store_id: '',
    is_enabled: false
  });
  const [pathaoLoading, setPathaoLoading] = useState(true);
  const [pathaoSaving, setPathaoSaving] = useState(false);
  const [pathaoSaved, setPathaoSaved] = useState(false);
  const [showPathaoSecret, setShowPathaoSecret] = useState(false);
  const [showPathaoPass, setShowPathaoPass] = useState(false);

  // ── Fraud Checker BD ──
  const [fraudCheckerConfig, setFraudCheckerConfig] = useState({ api_key: '', api_url: 'https://fraudchecker.link/api/check', is_enabled: false });
  const [fraudCheckerLoading, setFraudCheckerLoading] = useState(true);
  const [fraudCheckerSaving, setFraudCheckerSaving] = useState(false);
  const [fraudCheckerSaved, setFraudCheckerSaved] = useState(false);
  const [showFraudToken, setShowFraudToken] = useState(false);

  // ── Danger Zone ──
  const [showReset, setShowReset] = useState(false);
  const [resetScope, setResetScope] = useState('all');
  const [resetDateRange, setResetDateRange] = useState({ start: null, end: null });
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      setCourierLoading(true);
      setPathaoLoading(true);
      setFraudCheckerLoading(true);
      try {
        const data = await api.getSystemConfig('courier_steadfast');
        if (data) setCourierConfig(data);
      } catch (e) { console.warn(e); }
      finally { setCourierLoading(false); }

      try {
        const data = await api.getSystemConfig('courier_pathao');
        if (data) setPathaoConfig(data);
      } catch (e) { console.warn(e); }
      finally { setPathaoLoading(false); }

      try {
        const data = await api.getSystemConfig('fraud_checker_bd');
        if (data) setFraudCheckerConfig(data);
      } catch (e) { console.warn(e); }
      finally { setFraudCheckerLoading(false); }
    })();
  }, []);

  // ── Save handlers ──
  const saveBrandingHandler = async () => {
    setBrandingSaving(true);
    try { await saveBranding({ app_name: brandingName }); setBrandingSaved(true); setTimeout(() => setBrandingSaved(false), 3000); }
    catch { setError('Branding save failed.'); } finally { setBrandingSaving(false); }
  };

  const saveAutomation = () => {
    setAutoSaving(true);
    saveLS(LS_AUTOMATION, automation);
    setTimeout(() => { setAutoSaving(false); setAutoSaved(true); setTimeout(() => setAutoSaved(false), 2500); }, 400);
  };

  const saveFraud = () => {
    setFraudSaving(true);
    saveLS(LS_FRAUD, fraud);
    setTimeout(() => { setFraudSaving(false); setFraudSaved(true); setTimeout(() => setFraudSaved(false), 2500); }, 400);
  };

  const saveInv = () => {
    setInvSaving(true);
    saveLS(LS_INVENTORY, invAlert);
    setTimeout(() => { setInvSaving(false); setInvSaved(true); setTimeout(() => setInvSaved(false), 2500); }, 400);
  };

  const saveAlerts = () => {
    setAlertSaving(true);
    saveLS(LS_ALERTS, alerts);
    setTimeout(() => { setAlertSaving(false); setAlertSaved(true); setTimeout(() => setAlertSaved(false), 2500); }, 400);
  };

  const saveCourier = async () => {
    setCourierSaving(true);
    try {
      await api.updateSystemConfig('courier_steadfast', courierConfig);
      setCourierSaved(true); setTimeout(() => setCourierSaved(false), 3000);
    } catch { setError('Courier save failed.'); } finally { setCourierSaving(false); }
  };

  const savePathao = async () => {
    setPathaoSaving(true);
    try {
      await api.updateSystemConfig('courier_pathao', pathaoConfig);
      setPathaoSaved(true); setTimeout(() => setPathaoSaved(false), 3000);
    } catch { setError('Pathao save failed.'); } finally { setPathaoSaving(false); }
  };

  const saveFraudChecker = async () => {
    setFraudCheckerSaving(true);
    try {
      await api.updateSystemConfig('fraud_checker_bd', fraudCheckerConfig);
      setFraudCheckerSaved(true); setTimeout(() => setFraudCheckerSaved(false), 3000);
    } catch { setError('Fraud Checker BD save failed.'); } finally { setFraudCheckerSaving(false); }
  };

  const handleReset = async () => {
    if (resetPassword !== 'Rasel123@#') { setError('Incorrect password.'); return; }
    setResetLoading(true); setError(null);
    try {
      if (resetScope === 'date-range' && (!resetDateRange.start || !resetDateRange.end))
        throw new Error('Select a valid date range.');
      await api.resetSystem(isAdmin, { scope: resetScope, dateRange: resetDateRange });
      (typeof window !== 'undefined' ? localStorage : { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} }).setItem('activity_cleared_at', new Date().toISOString());
      setResetSuccess(true); setShowReset(false); setResetPassword('');
      setTimeout(() => setResetSuccess(false), 5000);
    } catch (err) { setError(err.message || 'Reset failed.'); }
    finally { setResetLoading(false); }
  };

  // ── Render section content ──
  const renderSection = () => {
    switch (activeSection) {
      // ── GENERAL ──
      case 'general': return (
        <div className="space-y-6">
          <SectionHead icon={Palette} title="App Branding" desc="Customize how your app appears across all panels and the login screen." />
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-foreground">Application Name</label>
            <Input
              value={brandingName}
              onChange={e => setBrandingName(e.target.value)}
              placeholder="e.g. PutiMach Admin Pro"
              maxLength={40}
            />
            <p className="text-xs text-muted-foreground">Shown in sidebar, browser tab, and login screen.</p>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 border border-border/50">
            <span className="text-sm font-medium text-muted-foreground">Live Preview</span>
            <span className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold shadow-sm">{brandingName.trim() || 'PutiMach Admin'}</span>
          </div>
          <div className="flex justify-start pt-2">
            <SaveBtn onClick={saveBrandingHandler} saving={brandingSaving} saved={brandingSaved}
              disabled={!brandingName.trim() || brandingName.trim() === appName} />
          </div>
        </div>
      );

      // ── AUTOMATION ──
      case 'automation': return (
        <div className="space-y-6">
          <SectionHead icon={Zap} title="Automation Rules" desc="Control when orders get flagged as stale. These thresholds trigger warnings in OrdersBoard." />
          <div className="flex items-center justify-between py-3 border-b border-border/50">
            <div>
              <span className="block text-sm font-semibold text-foreground">Enable Automation Engine</span>
              <span className="block text-xs text-muted-foreground mt-0.5">Scan orders and flag stale ones automatically.</span>
            </div>
            <Toggle checked={automation.enabled} onChange={v => setAutomation(a => ({ ...a, enabled: v }))} />
          </div>
          <div className={cn("space-y-1 transition-opacity", !automation.enabled && "opacity-50 pointer-events-none")}>
            <SliderRow label="New Order Stale After" desc="Flag NEW orders that haven't been actioned." value={automation.stale_new} min={12} max={120} onChange={v => setAutomation(a => ({ ...a, stale_new: v }))} />
            <SliderRow label="Pending Call Stale After" desc="Flag Pending Call orders with no update." value={automation.stale_pending} min={24} max={168} onChange={v => setAutomation(a => ({ ...a, stale_pending: v }))} />
            <SliderRow label="Confirmed Stale After" desc="Flag Confirmed orders not reaching Factory." value={automation.stale_confirmed} min={24} max={240} onChange={v => setAutomation(a => ({ ...a, stale_confirmed: v }))} />
          </div>
          <div className="flex justify-start pt-2">
            <SaveBtn onClick={saveAutomation} saving={autoSaving} saved={autoSaved} />
          </div>
        </div>
      );

      // ── FRAUD ──
      case 'fraud': return (
        <div className="space-y-6">
          <SectionHead icon={Shield} title="Fraud Detection" desc="Configure duplicate detection and address similarity rules for incoming orders." />
          <div className="flex items-center justify-between py-3 border-b border-border/50">
            <div>
              <span className="block text-sm font-semibold text-foreground">Enable Fraud Detection</span>
              <span className="block text-xs text-muted-foreground mt-0.5">Scan all orders for duplicates on creation.</span>
            </div>
            <Toggle checked={fraud.enabled} onChange={v => setFraud(f => ({ ...f, enabled: v }))} />
          </div>
          <div className={cn("space-y-1 transition-opacity", !fraud.enabled && "opacity-50 pointer-events-none")}>
            <div className="flex items-center justify-between py-3 border-b border-border/50 pl-4 md:pl-6">
              <div>
                <span className="block text-sm font-semibold text-foreground">Phone Duplicate Check</span>
                <span className="block text-xs text-muted-foreground mt-0.5">Flag exact phone matches across orders.</span>
              </div>
              <Toggle checked={fraud.phone_check} onChange={v => setFraud(f => ({ ...f, phone_check: v }))} />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border/50 pl-4 md:pl-6">
              <div>
                <span className="block text-sm font-semibold text-foreground">Address Similarity Check</span>
                <span className="block text-xs text-muted-foreground mt-0.5">Flag orders with very similar delivery addresses.</span>
              </div>
              <Toggle checked={fraud.address_check} onChange={v => setFraud(f => ({ ...f, address_check: v }))} />
            </div>
            <div className="pl-4 md:pl-6">
              <SliderRow
                label="Address Similarity Threshold"
                desc="Orders above this % similarity will be flagged."
                value={fraud.similarity_threshold}
                min={60} max={99} unit="%"
                onChange={v => setFraud(f => ({ ...f, similarity_threshold: v }))}
              />
            </div>
          </div>
          <div className="flex justify-start pt-2">
            <SaveBtn onClick={saveFraud} saving={fraudSaving} saved={fraudSaved} />
          </div>
        </div>
      );

      // ── INVENTORY ALERTS ──
      case 'inventory': return (
        <div className="space-y-6">
          <SectionHead icon={Package} title="Inventory Alerts" desc="Set global minimum stock alert level for all products in your inventory." />
          <div className="flex items-center justify-between py-3 border-b border-border/50">
            <div>
              <span className="block text-sm font-semibold text-foreground">Enable Low Stock Alerts</span>
              <span className="block text-xs text-muted-foreground mt-0.5">Show warnings when products fall below threshold.</span>
            </div>
            <Toggle checked={invAlert.alert_enabled} onChange={v => setInvAlert(i => ({ ...i, alert_enabled: v }))} />
          </div>
          <div className={cn("space-y-1 transition-opacity", !invAlert.alert_enabled && "opacity-50 pointer-events-none")}>
            <SliderRow
              label="Global Minimum Stock Level"
              desc="Products below this level will show 'Low Stock' badge."
              value={invAlert.global_min_stock}
              min={1} max={100} unit=" units"
              onChange={v => setInvAlert(i => ({ ...i, global_min_stock: v }))}
            />
          </div>
          <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/10 text-primary text-sm font-medium">
            <Activity size={16} className="mt-0.5 shrink-0" />
            <span>Individual product thresholds override this global setting.</span>
          </div>
          <div className="flex justify-start pt-2">
            <SaveBtn onClick={saveInv} saving={invSaving} saved={invSaved} />
          </div>
        </div>
      );

      // ── COURIER ──
      case 'courier': return (
        <div className="space-y-6">
          <SectionHead icon={Truck} title="Courier & Ratio Settings" desc="Connect Steadfast courier API and Fraud Checker BD for automated dispatch and return checks." />
          
          <div className="space-y-8">
            {/* Steadfast Courier Settings */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Truck size={16} className="text-primary" />
                <span>Steadfast Courier API</span>
              </h3>
              {courierLoading ? (
                <div className="flex items-center gap-3 text-muted-foreground text-sm py-4"><Loader2 size={16} className="animate-spin" /><span>Loading configuration...</span></div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col gap-4 md:grid md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><Key size={14} /> API Key</label>
                      <div className="relative">
                        <Input type={showApiKey ? 'text' : 'password'} value={courierConfig.api_key} onChange={e => setCourierConfig(c => ({ ...c, api_key: e.target.value }))} placeholder="Enter Steadfast API Key" className="pr-10" />
                        <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowApiKey(v => !v)} type="button">{showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><Lock size={14} /> Secret Key</label>
                      <div className="relative">
                        <Input type={showSecretKey ? 'text' : 'password'} value={courierConfig.secret_key} onChange={e => setCourierConfig(c => ({ ...c, secret_key: e.target.value }))} placeholder="Enter Steadfast Secret Key" className="pr-10" />
                        <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowSecretKey(v => !v)} type="button">{showSecretKey ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-border/50">
                    <div><span className="block text-sm font-semibold text-foreground">Enable Integration</span><span className="block text-xs text-muted-foreground mt-0.5">Allow system to communicate with Steadfast API.</span></div>
                    <Toggle checked={courierConfig.is_enabled} onChange={v => setCourierConfig(c => ({ ...c, is_enabled: v }))} />
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-border/50">
                    <div><span className="block text-sm font-semibold text-foreground">Auto-Dispatch</span><span className="block text-xs text-muted-foreground mt-0.5">Submit orders to courier when stock is matched.</span></div>
                    <Toggle checked={courierConfig.auto_dispatch} onChange={v => setCourierConfig(c => ({ ...c, auto_dispatch: v }))} />
                  </div>
                  <div className="flex justify-start pt-2">
                    <SaveBtn onClick={saveCourier} saving={courierSaving} saved={courierSaved} />
                  </div>
                </div>
              )}
            </div>

            {/* Pathao Courier Settings */}
            <div className="pt-6 border-t border-border/50 space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Truck size={16} className="text-primary" />
                <span>Pathao Merchant Courier API</span>
              </h3>
              {pathaoLoading ? (
                <div className="flex items-center gap-3 text-muted-foreground text-sm py-4"><Loader2 size={16} className="animate-spin" /><span>Loading Pathao configuration...</span></div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col gap-4 md:grid md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-foreground">Base URL (Sandbox / Production)</label>
                      <Input type="text" value={pathaoConfig.base_url || ''} onChange={e => setPathaoConfig(p => ({ ...p, base_url: e.target.value }))} placeholder="e.g. https://courier-api.pathao.com" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-foreground">Client ID</label>
                      <Input type="text" value={pathaoConfig.client_id || ''} onChange={e => setPathaoConfig(p => ({ ...p, client_id: e.target.value }))} placeholder="Enter Pathao Client ID" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-foreground">Client Secret</label>
                      <div className="relative">
                        <Input type={showPathaoSecret ? 'text' : 'password'} value={pathaoConfig.client_secret || ''} onChange={e => setPathaoConfig(p => ({ ...p, client_secret: e.target.value }))} placeholder="Enter Pathao Client Secret" className="pr-10" />
                        <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPathaoSecret(v => !v)} type="button">{showPathaoSecret ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-foreground">Username (Merchant Email)</label>
                      <Input type="text" value={pathaoConfig.username || ''} onChange={e => setPathaoConfig(p => ({ ...p, username: e.target.value }))} placeholder="Enter Pathao login email" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-foreground">Password</label>
                      <div className="relative">
                        <Input type={showPathaoPass ? 'text' : 'password'} value={pathaoConfig.password || ''} onChange={e => setPathaoConfig(p => ({ ...p, password: e.target.value }))} placeholder="Enter Pathao login password" className="pr-10" />
                        <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPathaoPass(v => !v)} type="button">{showPathaoPass ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-foreground">Merchant Store ID (Pickup Location ID)</label>
                      <Input type="text" value={pathaoConfig.store_id || ''} onChange={e => setPathaoConfig(p => ({ ...p, store_id: e.target.value }))} placeholder="Enter Pathao Store ID" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-border/50">
                    <div><span className="block text-sm font-semibold text-foreground">Enable Pathao Integration</span><span className="block text-xs text-muted-foreground mt-0.5">Allow sending orders to Pathao.</span></div>
                    <Toggle checked={pathaoConfig.is_enabled} onChange={v => setPathaoConfig(p => ({ ...p, is_enabled: v }))} />
                  </div>
                  <div className="flex justify-start pt-2">
                    <SaveBtn onClick={savePathao} saving={pathaoSaving} saved={pathaoSaved} />
                  </div>
                </div>
              )}
            </div>

            {/* Fraud Checker BD Settings */}
            <div className="pt-6 border-t border-border/50 space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Shield size={16} className="text-primary" />
                <span>Fraud Checker BD (Ratio Intelligence)</span>
              </h3>
              {fraudCheckerLoading ? (
                <div className="flex items-center gap-3 text-muted-foreground text-sm py-4"><Loader2 size={16} className="animate-spin" /><span>Loading configuration...</span></div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col gap-4 md:grid md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><Key size={14} /> Bearer Token</label>
                      <div className="relative">
                        <Input type={showFraudToken ? 'text' : 'password'} value={fraudCheckerConfig.api_key || ''} onChange={e => setFraudCheckerConfig(c => ({ ...c, api_key: e.target.value }))} placeholder="Enter Bearer Token for Fraud Checker BD" className="pr-10" />
                        <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowFraudToken(v => !v)} type="button">{showFraudToken ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><Sliders size={14} /> API Endpoint URL</label>
                      <Input type="text" value={fraudCheckerConfig.api_url || ''} onChange={e => setFraudCheckerConfig(c => ({ ...c, api_url: e.target.value }))} placeholder="https://fraudchecker.link/api/check" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-border/50">
                    <div><span className="block text-sm font-semibold text-foreground">Enable Fraud Checker BD API</span><span className="block text-xs text-muted-foreground mt-0.5">Check order success rates from Fraud Checker BD API first.</span></div>
                    <Toggle checked={fraudCheckerConfig.is_enabled || false} onChange={v => setFraudCheckerConfig(c => ({ ...c, is_enabled: v }))} />
                  </div>
                  <div className="flex justify-start pt-2">
                    <SaveBtn onClick={saveFraudChecker} saving={fraudCheckerSaving} saved={fraudCheckerSaved} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );

      // ── ALERTS ──
      case 'alerts': return (
        <div className="space-y-6">
          <SectionHead icon={Bell} title="Alert Timers" desc="Configure timing rules for admin alerts, response warnings, and notification sounds." />
          <div className="flex items-center justify-between py-3 border-b border-border/50">
            <div><span className="block text-sm font-semibold text-foreground">No-Call Admin Alert</span><span className="block text-xs text-muted-foreground mt-0.5">Alert admin when no agent calls an order within the set time.</span></div>
            <Toggle checked={alerts.no_call_alert_enabled} onChange={v => setAlerts(a => ({ ...a, no_call_alert_enabled: v }))} />
          </div>
          <div className={cn("space-y-1 transition-opacity", !alerts.no_call_alert_enabled && "opacity-50 pointer-events-none")}>
            <SliderRow
              label="No-Call Alert Threshold"
              desc="Alert fires when order is uncalled for this long."
              value={alerts.no_call_alert_mins}
              min={5} max={120} unit=" min"
              onChange={v => setAlerts(a => ({ ...a, no_call_alert_mins: v }))}
            />
          </div>
          <div className="flex items-center justify-between py-3 border-b border-border/50">
            <div><span className="block text-sm font-semibold text-foreground">Notification Sounds</span><span className="block text-xs text-muted-foreground mt-0.5">Play audio when new orders or alerts arrive.</span></div>
            <Toggle checked={alerts.sound_enabled} onChange={v => setAlerts(a => ({ ...a, sound_enabled: v }))} />
          </div>
          <SliderRow
            label="Response Time Warning"
            desc="Warn agents when order response time exceeds this."
            value={alerts.response_warn_mins}
            min={5} max={60} unit=" min"
            onChange={v => setAlerts(a => ({ ...a, response_warn_mins: v }))}
          />
          <div className="flex justify-start pt-2">
            <SaveBtn onClick={saveAlerts} saving={alertSaving} saved={alertSaved} />
          </div>
        </div>
      );

      // ── DANGER ──
      case 'danger': return (
        <div className="space-y-6">
          <SectionHead icon={AlertTriangle} title="Danger Zone" desc="Permanently delete system data. These actions cannot be undone." />
          {resetSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 text-sm font-medium"><CheckCircle size={16} /> System reset initiated successfully.</div>
          )}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-900/30 text-sm font-medium"><ShieldAlert size={16} /> {error}</div>
          )}
          <div className="rounded-2xl border border-rose-200 bg-rose-50 dark:border-rose-800/40 dark:bg-rose-950/20 p-5 md:p-6 space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-rose-700 dark:text-rose-400">Reset System Data</h3>
              <p className="text-sm text-rose-600/80 dark:text-rose-400/80">Permanently delete orders, logs, and notifications — either all-time or within a selected date range.</p>
            </div>
            {isAdmin ? (
              <button className="flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-sm font-bold transition-colors" onClick={() => { setShowReset(true); setResetPassword(''); setError(null); }}>
                <Trash2 size={16} /> Reset System
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400 text-xs font-bold"><Lock size={14} /> Admin Only</div>
            )}
          </div>

          {showReset && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowReset(false)}>
              <div className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-slide-up border border-border" onClick={e => e.stopPropagation()}>
                <div className="p-6 space-y-6">
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center dark:bg-rose-900/30">
                      <AlertTriangle size={32} />
                    </div>
                    <div>
                      <h2 className="text-xl font-display font-bold text-foreground">Are you absolutely sure?</h2>
                      <p className="text-sm text-muted-foreground mt-1">This cannot be undone. Choose your reset scope:</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {[['all', 'Full Reset — All data & stock'], ['date-range', 'Date Range Reset — Orders & logs']].map(([val, lab]) => (
                      <label key={val} className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                        resetScope === val ? "border-rose-500 bg-rose-50 dark:bg-rose-500/10 dark:border-rose-500/50" : "border-border hover:bg-secondary/50"
                      )}>
                        <input type="radio" name="scope" value={val} checked={resetScope === val} onChange={() => setResetScope(val)} className="accent-rose-600 w-4 h-4" />
                        <span className={cn("text-sm font-medium", resetScope === val ? "text-rose-700 dark:text-rose-400" : "text-foreground")}>{lab}</span>
                      </label>
                    ))}
                  </div>
                  {resetScope === 'date-range' && (
                    <div className="pt-2">
                      <DateRangePicker value={resetDateRange} onChange={setResetDateRange} />
                    </div>
                  )}
                  <div className="space-y-2 pt-2">
                    <label className="text-sm font-semibold text-foreground">Confirm Password <span className="text-rose-500">*</span></label>
                    <Input
                      type="password"
                      value={resetPassword}
                      onChange={e => { setResetPassword(e.target.value); setError(null); }}
                      placeholder="Enter admin password"
                      className={error ? 'border-rose-500 focus-visible:ring-rose-500' : ''}
                    />
                    {error && <p className="text-xs font-medium text-rose-500">{error}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 border-t border-border bg-secondary/30">
                  <button className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm text-muted-foreground hover:bg-secondary transition-colors" onClick={() => setShowReset(false)}>Cancel</button>
                  <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-50" onClick={handleReset} disabled={resetLoading}>
                    {resetLoading ? <Loader2 size={16} className="animate-spin" /> : 'Yes, Reset System'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );

      // ── APP UPDATES CENTER ──
      case 'update': {
        const hasNewUpdate = remoteVersion && Number(remoteVersion.versionCode) > CURRENT_VERSION_CODE;

        const handleDirectUpdate = () => {
          const targetUrl = remoteVersion?.apkUrl || "https://github.com/Shakhwat-93/Orderflow/actions";
          setUpdatingState('downloading');
          setTimeout(() => {
            if (typeof window !== 'undefined' && window.Capacitor) {
              window.open(targetUrl, '_system');
            } else {
              window.open(targetUrl, '_blank');
            }
            setUpdatingState('idle');
          }, 1500);
        };

        return (
          <div className="space-y-6">
            <SectionHead icon={RefreshCw} title="App Update Center" desc="Check system OTA updates and manage self-hosted APK deployments." />
            
            <div className="rounded-2xl border border-border p-6 bg-card shadow-sm">
              {checkingUpdate ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Loader2 className="animate-spin text-primary" size={28} />
                  <span className="text-sm font-semibold text-foreground">Checking for updates...</span>
                </div>
              ) : hasNewUpdate && remoteVersion ? (
                <div className="flex flex-col items-center text-center space-y-4 py-4">
                  <div className="inline-flex items-center justify-center rounded-full bg-emerald-500/10 px-3 py-1 mb-2">
                    <span className="flex w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2"></span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">NEW APP UPDATE</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-display font-bold text-foreground">Version {remoteVersion.versionName} is ready!</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Build {remoteVersion.versionCode} • Released {remoteVersion.publishedBy ? `by ${remoteVersion.publishedBy}` : ''}
                    </p>
                  </div>

                  {remoteVersion.releaseNotes && (
                    <div className="w-full max-w-md text-left p-4 rounded-xl bg-secondary/50 text-sm">
                      <strong className="block mb-1 text-foreground">What's New:</strong>
                      <p className="text-muted-foreground whitespace-pre-wrap">{remoteVersion.releaseNotes}</p>
                    </div>
                  )}

                  <button 
                    className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 font-bold text-sm transition-all shadow-[0_4px_14px_rgba(34,197,94,0.25)] mt-4 disabled:opacity-50"
                    disabled={updatingState !== 'idle'}
                    onClick={handleDirectUpdate}
                  >
                    {updatingState === 'downloading' ? (
                      <><Loader2 size={18} className="animate-spin" /> Executing Native Install...</>
                    ) : (
                      <><Download size={18} /> Update Now (Install APK)</>
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 p-5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                  <CheckCircle size={32} className="text-emerald-500 shrink-0" />
                  <div>
                    <h3 className="text-base font-bold text-emerald-800 dark:text-emerald-400">Your App is Up to Date</h3>
                    <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                      Running version <b>v{CURRENT_VERSION_NAME}</b> (Build {CURRENT_VERSION_CODE}). Everything is fresh and fully synced!
                    </p>
                  </div>
                </div>
              )}
            </div>

            {isAdmin && (
              <div className="mt-8 pt-8 border-t border-border/50 space-y-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-primary font-bold">
                    <Sliders size={18} />
                    <h3>Release New App Update (Admin Control)</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Publish a new build below. All active APKs will immediately detect this update and display a one-click install button to agents.</p>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">New Version Code (Build Number) <span className="text-rose-500">*</span></label>
                    <Input
                      type="number"
                      value={formCode}
                      onChange={e => setFormCode(Number(e.target.value))}
                      placeholder="e.g. 3"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">New Version Name <span className="text-rose-500">*</span></label>
                    <Input
                      type="text"
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      placeholder="e.g. 2.1.0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">APK Download Direct Link <span className="text-rose-500">*</span></label>
                  <Input
                    type="url"
                    value={formApkUrl}
                    onChange={e => setFormApkUrl(e.target.value)}
                    placeholder="https://github.com/Shakhwat-93/Orderflow/actions... or Supabase Storage URL"
                  />
                  <p className="text-xs text-muted-foreground">Specify the link to download the compiled .apk file.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Release Notes / Changes Log</label>
                  <textarea
                    className="flex min-h-[100px] w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    rows={4}
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    placeholder="Describe the new updates (e.g. fixed order notifications, added 10 min alert snooze)..."
                  />
                </div>

                <div className="flex justify-start">
                  <SaveBtn onClick={handlePublishRelease} saving={publishSaving} saved={publishSaved} label="Publish App Release" />
                </div>
              </div>
            )}
          </div>
        );
      }

      // ── TRACKING ──
      case 'tracking': return <TrackingSection supabase={supabase} />;

      default: return null;
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 p-4 md:p-6 w-full max-w-7xl mx-auto min-h-[calc(100vh-4rem)]">
      {/* ── Sidebar ── */}
      <aside className={cn(
        "rounded-2xl border border-border bg-card p-3 md:sticky md:top-6 md:self-start w-full md:w-72 shrink-0 space-y-2",
        currentMobileView === 'detail' ? 'hidden md:block' : 'block'
      )}>
        <div className="flex items-center gap-3 p-3 mb-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
            <SettingsIcon size={18} />
          </div>
          <div>
            <h1 className="text-base font-display font-bold text-foreground leading-tight">Settings</h1>
            <p className="text-xs text-muted-foreground">System Configuration</p>
          </div>
        </div>
        <nav className="space-y-1">
          {NAV.map(item => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "flex items-center w-full gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold cursor-pointer transition-colors text-left",
                  active 
                    ? (item.danger ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-500" : "bg-primary/10 text-primary")
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
                onClick={() => {
                  setActiveSection(item.id);
                  setError(null);
                  setCurrentMobileView('detail');
                }}
              >
                <Icon size={16} className="shrink-0" />
                <div className="flex-1 flex flex-col items-start overflow-hidden">
                  <span className="truncate w-full">{item.label}</span>
                </div>
                <ChevronRight size={14} className={cn("shrink-0 transition-transform", active ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2")} />
              </button>
            );
          })}
        </nav>
        <div className="pt-4 mt-4 border-t border-border/50 px-3">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            <Activity size={12} />
             <span>PutiMach Admin v2.0 Elite</span>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className={cn(
        "flex-1 min-w-0",
        currentMobileView === 'master' ? 'hidden md:block' : 'block'
      )}>
        {currentMobileView === 'detail' && (
          <div className="md:hidden mb-4">
            <button 
              type="button"
              className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors bg-card px-3 py-2 rounded-xl border border-border w-fit shadow-sm"
              onClick={() => setCurrentMobileView('master')}
            >
              <ChevronLeft size={16} />
              <span>Back to Settings</span>
            </button>
          </div>
        )}
        <div className="rounded-2xl border border-border bg-card p-5 md:p-8 space-y-6 shadow-sm animate-slide-up">
          {renderSection()}
        </div>
      </main>
      {ConfirmDialogComponent}
    </div>
  );
};
