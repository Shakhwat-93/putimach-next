'use client';
// @ts-nocheck
import { useState, useEffect, useCallback, useRef } from 'react';
import './BackupPanel.css';
import {
  DatabaseBackup, Download, RefreshCw, CheckCircle2,
  XCircle, Clock, CloudUpload, Settings2, History,
  Shield, Zap, HardDrive, ChevronLeft, ChevronRight,
  ExternalLink, AlertCircle, Play, Loader2
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { cn } from '../lib/utils';

// ── Google Drive OAuth helper ───────────────────────────────
// Uses Google Identity Services (browser popup — no redirect, no page reload)
const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

const loadGoogleScript = () =>
  new Promise((resolve, reject) => {
    if (window.google?.accounts) { resolve(); return; }
    if (document.getElementById('gsi-script')) { resolve(); return; }
    const script = document.createElement('script');
    script.id = 'gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });

// Format bytes to human-readable
const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// Format date relative
const timeAgo = (iso) => {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

// Countdown to next backup
const countdownTo = (iso) => {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'Overdue';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${m}m`;
};

const StatusBadge = ({ status }) => {
  const isCompleted = status === 'completed';
  const isRunning = status === 'running';
  const isFailed = status === 'failed';
  const isPending = status === 'pending';

  return (
    <Badge 
      variant={
        isCompleted ? 'success' : 
        isFailed ? 'destructive' : 
        (isPending || isRunning) ? 'warning' : 'outline'
      }
      className="flex w-fit items-center gap-1.5"
    >
      {isCompleted && <CheckCircle2 size={12} />}
      {isRunning && <Loader2 size={12} className="animate-spin" />}
      {isFailed && <XCircle size={12} />}
      {isPending && <Clock size={12} />}
      {status}
    </Badge>
  );
};

const ITEMS_PER_PAGE = 8;

export const BackupPanel = () => {
  const { profile, userRoles } = useAuth();
  const isAdmin = userRoles?.includes('Admin');

  // Settings state
  const [settings, setSettings]         = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Backup execution state
  const [isRunning, setIsRunning]       = useState(false);
  const [progress, setProgress]         = useState(0);
  const [progressMsg, setProgressMsg]   = useState('');
  const [lastResult, setLastResult]     = useState(null);
  const [backupError, setBackupError]   = useState(null);

  // History state
  const [logs, setLogs]                 = useState([]);
  const [logsCount, setLogsCount]       = useState(0);
  const [logsPage, setLogsPage]         = useState(1);
  const [logsLoading, setLogsLoading]   = useState(true);

  // Google Drive state
  const [driveToken, setDriveToken]     = useState(null);
  const [driveEmail, setDriveEmail]     = useState(null);
  const [clientId, setClientId]         = useState('');
  const [driveUploading, setDriveUploading] = useState(false);

  // Auto backup settings (local editable state)
  const [autoEnabled, setAutoEnabled]   = useState(false);
  const [intervalHours, setIntervalHours] = useState(12);
  const [savingSettings, setSavingSettings] = useState(false);
  const [countdown, setCountdown]       = useState(null);

  const lastBackupDataRef = useRef(null);

  // ── Load Settings ─────────────────────────────────────
  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const data = await api.getBackupSettings();
      if (data) {
        setSettings(data);
        setAutoEnabled(data.auto_backup_enabled ?? false);
        setIntervalHours(data.backup_interval_hours ?? 12);
        setClientId(data.google_drive_client_id || '');
        setCountdown(countdownTo(data.next_backup_at));
      }
    } catch (err) {
      console.error('[BackupPanel] Failed to load settings:', err);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  // ── Load History ───────────────────────────────────────
  const loadLogs = useCallback(async (page = 1) => {
    setLogsLoading(true);
    try {
      const { data, count } = await api.getBackupLogs(page, ITEMS_PER_PAGE);
      setLogs(data);
      setLogsCount(count);
    } catch (err) {
      console.error('[BackupPanel] Failed to load logs:', err);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);
  useEffect(() => { loadLogs(logsPage); }, [loadLogs, logsPage]);

  // Live countdown ticker
  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown(countdownTo(settings?.next_backup_at));
    }, 60000);
    return () => clearInterval(tick);
  }, [settings?.next_backup_at]);

  // ── Run Backup ─────────────────────────────────────────
  const handleBackupNow = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setBackupError(null);
    setLastResult(null);
    lastBackupDataRef.current = null;

    // Simulate granular progress
    const steps = [
      { pct: 10, msg: 'Connecting to database...' },
      { pct: 25, msg: 'Exporting orders & activity logs...' },
      { pct: 45, msg: 'Exporting users, inventory & campaigns...' },
      { pct: 65, msg: 'Exporting remaining tables...' },
      { pct: 80, msg: 'Packaging backup file...' },
      { pct: 90, msg: 'Uploading to Supabase Storage...' },
    ];

    let stepIndex = 0;
    const progressInterval = setInterval(() => {
      if (stepIndex < steps.length) {
        setProgress(steps[stepIndex].pct);
        setProgressMsg(steps[stepIndex].msg);
        stepIndex++;
      }
    }, 1200);

    try {
      let logId = null;
      try {
        const log = await api.createBackupLog({
          type: 'manual',
          triggered_by_user_id: profile?.id,
          triggered_by_user_name: profile?.name || 'Admin',
        });
        logId = log?.id;
      } catch { /* non-fatal */ }

      const result = await api.triggerBackup({
        type: 'manual',
        logId,
        triggeredByName: profile?.name || 'Admin',
      });

      clearInterval(progressInterval);
      setProgress(100);
      setProgressMsg('Backup complete! ✓');

      setLastResult(result);
      lastBackupDataRef.current = result.backupData || null;

      await loadSettings();
      await loadLogs(1);
      setLogsPage(1);

      if (result.backupData) {
        triggerDownload(result.backupData, result.fileName);
      }

      if (driveToken && result.backupData) {
        await uploadToDrive(result.backupData, result.fileName);
      }

    } catch (err) {
      clearInterval(progressInterval);
      setBackupError(err?.message || 'Backup failed. Please try again.');
      setProgress(0);
      setProgressMsg('');
    } finally {
      setTimeout(() => {
        setIsRunning(false);
        setProgress(0);
        setProgressMsg('');
      }, 2000);
    }
  }, [isRunning, profile, driveToken, loadSettings, loadLogs]);

  // ── Download helper ────────────────────────────────────
  const triggerDownload = (data, fileName) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || `orderflow_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Download from Storage ──────────────────────────────
  const handleDownloadFromStorage = async (log) => {
    if (log.supabase_storage_path) {
      const url = await api.getBackupDownloadUrl(log.supabase_storage_path);
      if (url) { window.open(url, '_blank'); return; }
    }
    alert('Download link expired or not available. Please run a new backup.');
  };

  // ── Google Drive OAuth ─────────────────────────────────
  const handleConnectDrive = async () => {
    const resolvedClientId = clientId.trim() || settings?.google_drive_client_id;
    if (!resolvedClientId) {
      alert('Please enter your Google OAuth Client ID first.');
      return;
    }
    try {
      await loadGoogleScript();
      if (clientId.trim()) {
        await api.updateBackupSettings({ google_drive_client_id: clientId.trim() });
      }
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: resolvedClientId,
        scope: GOOGLE_DRIVE_SCOPE,
        callback: async (response) => {
          if (response.error) {
            setBackupError(`Google Drive: ${response.error}`);
            return;
          }
          setDriveToken(response.access_token);
          try {
            const r = await fetch(
              `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${response.access_token}`
            );
            const info = await r.json();
            setDriveEmail(info.email || 'Connected');
          } catch { setDriveEmail('Connected'); }
          await api.updateBackupSettings({ google_drive_connected: true });
          await loadSettings();
        },
      });
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      setBackupError(`Google Drive connection failed: ${err.message}`);
    }
  };

  const handleDisconnectDrive = async () => {
    if (driveToken && window.google?.accounts?.oauth2) {
      window.google.accounts.oauth2.revoke(driveToken, () => {});
    }
    setDriveToken(null);
    setDriveEmail(null);
    await api.updateBackupSettings({ google_drive_connected: false });
    await loadSettings();
  };

  // ── Upload to Google Drive ─────────────────────────────
  const uploadToDrive = async (data, fileName) => {
    if (!driveToken) return;
    setDriveUploading(true);
    try {
      const jsonBlob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const metadata = {
        name: fileName || `orderflow_backup_${Date.now()}.json`,
        parents: ['root'], 
        description: `OrderFlow automated backup — ${new Date().toLocaleString()}`,
      };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', jsonBlob);

      const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${driveToken}` },
          body: form,
        }
      );
      if (!response.ok) throw new Error(`Drive upload failed: ${response.status}`);
      const driveFile = await response.json();

      const { data: recentLogs } = await api.getBackupLogs(1, 1);
      if (recentLogs[0]?.id) {
        await api.updateBackupLog(recentLogs[0].id, {
          google_drive_file_id: driveFile.id,
          google_drive_link: driveFile.webViewLink,
        });
      }
      await loadLogs(1);
    } catch (err) {
      console.error('[BackupPanel] Drive upload failed:', err);
    } finally {
      setDriveUploading(false);
    }
  };

  // ── Save Auto Backup Settings ──────────────────────────
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const nextAt = autoEnabled
        ? new Date(Date.now() + intervalHours * 3600000).toISOString()
        : null;
      await api.updateBackupSettings({
        auto_backup_enabled: autoEnabled,
        backup_interval_hours: intervalHours,
        next_backup_at: nextAt,
      });
      await loadSettings();
    } catch (err) {
      setBackupError('Failed to save settings: ' + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const totalPages = Math.ceil(logsCount / ITEMS_PER_PAGE);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground flex items-center gap-2">
            <DatabaseBackup className="text-primary" size={28} />
            Backup System
          </h1>
          <p className="text-muted-foreground mt-1">
            Enterprise data protection — all backups are read-only and isolated from live orders.
          </p>
        </div>
        <Button
          onClick={handleBackupNow}
          disabled={isRunning || !isAdmin}
          className="bg-primary text-primary-foreground rounded-full px-6 py-2.5 shadow-md shadow-primary/20"
        >
          {isRunning ? (
            <><Loader2 size={16} className="animate-spin mr-2" /> Backing Up...</>
          ) : (
            <><Play size={16} className="mr-2" /> Backup Now</>
          )}
        </Button>
      </div>

      {/* Success Banner */}
      {lastResult && !isRunning && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 animate-slide-up">
          <div className="flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-sm">
            <CheckCircle2 size={20} className="shrink-0" />
            <div>
              <strong className="font-semibold">Backup Complete!</strong>{' '}
              {lastResult.totalRecords?.toLocaleString()} records across {lastResult.successfulTables} tables —{' '}
              {formatBytes(lastResult.fileSizeBytes)} · {lastResult.durationMs}ms
              {driveToken && driveUploading && ' · Uploading to Drive...'}
              {driveToken && !driveUploading && ' · Saved to Google Drive ✓'}
            </div>
          </div>
          {lastResult.backupData && (
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-emerald-200 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-900"
              onClick={() => triggerDownload(lastResult.backupData, lastResult.fileName)}
            >
              <Download size={14} className="mr-2" /> Download JSON
            </Button>
          )}
        </div>
      )}

      {/* Error Banner */}
      {backupError && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300 text-sm animate-slide-up">
          <AlertCircle size={20} className="shrink-0" />
          <span>{backupError}</span>
        </div>
      )}

      {/* Progress Bar */}
      {isRunning && (
        <Card className="animate-slide-up border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-2 text-sm font-medium">
              <span className="flex items-center gap-2 text-primary">
                <Loader2 size={16} className="animate-spin" /> Running backup...
              </span>
              <span className="text-primary">{progress}%</span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500 ease-out rounded-full" 
                style={{ width: `${progress}%` }} 
              />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">{progressMsg}</div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="animate-slide-up [animation-delay:50ms]">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              <Clock size={24} />
            </div>
            <div>
              <div className="text-sm text-muted-foreground font-medium">Last Backup</div>
              <div className="text-xl font-bold text-foreground">
                {settingsLoading ? '...' : timeAgo(settings?.last_backup_at)}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {settings?.last_backup_status === 'completed' ? '✓ Successful' : settings?.last_backup_status || 'Never'}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up [animation-delay:100ms]">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <History size={24} />
            </div>
            <div>
              <div className="text-sm text-muted-foreground font-medium">Total Backups</div>
              <div className="text-xl font-bold text-foreground">{logsCount.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-0.5">stored in history</div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up [animation-delay:150ms]">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <HardDrive size={24} />
            </div>
            <div>
              <div className="text-sm text-muted-foreground font-medium">Last Size</div>
              <div className="text-xl font-bold text-foreground">
                {formatBytes(settings?.last_backup_size_bytes || 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">compressed JSON</div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up [animation-delay:200ms]">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <Zap size={24} />
            </div>
            <div>
              <div className="text-sm text-muted-foreground font-medium">Auto Backup</div>
              <div className="text-xl font-bold text-foreground">
                {settings?.auto_backup_enabled ? 'ON' : 'OFF'}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {settings?.auto_backup_enabled
                  ? `Every ${settings.backup_interval_hours}h · ${countdown || '—'}`
                  : 'Manual only'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Google Drive */}
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CloudUpload size={20} className="text-primary" /> Google Drive
            </CardTitle>
            <CardDescription>Automatically upload backups to your Google Drive</CardDescription>
          </CardHeader>
          <CardContent>
            {driveToken ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-secondary/50 rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <div className="text-sm font-medium text-foreground">Connected</div>
                    <div className="text-xs text-muted-foreground">{driveEmail || 'Google Drive Account'}</div>
                  </div>
                  {driveUploading && <Loader2 size={16} className="animate-spin text-primary ml-2" />}
                </div>
                <Button variant="outline" size="sm" onClick={handleDisconnectDrive}>
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Input
                  type="text"
                  placeholder="Paste your Google OAuth Client ID..."
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Get a Client ID from{' '}
                  <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Google Cloud Console
                  </a>
                  {' '}→ Enable Drive API → OAuth 2.0 Credentials.
                </p>
                <Button onClick={handleConnectDrive} className="w-full sm:w-auto">
                  <CloudUpload size={16} className="mr-2" /> Connect Drive
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Auto Backup Settings */}
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings2 size={20} className="text-primary" /> Auto Backup
            </CardTitle>
            <CardDescription>Configure automatic background backups</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm text-foreground">Enable auto backup</div>
                <div className="text-xs text-muted-foreground">Runs silently in the background</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={autoEnabled}
                  onChange={(e) => setAutoEnabled(e.target.checked)}
                />
                <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Interval</label>
              <select
                className="bg-background border border-border text-foreground text-sm rounded-lg focus:ring-primary focus:border-primary block p-2"
                value={intervalHours}
                onChange={(e) => setIntervalHours(Number(e.target.value))}
                disabled={!autoEnabled}
              >
                <option value={6}>Every 6 hours</option>
                <option value={12}>Every 12 hours</option>
                <option value={24}>Every 24 hours</option>
                <option value={48}>Every 48 hours</option>
                <option value={168}>Every 7 days</option>
              </select>
            </div>

            {autoEnabled && settings?.next_backup_at && (
              <div className="flex items-center gap-2 text-sm text-primary bg-primary/5 p-3 rounded-lg border border-primary/10">
                <Clock size={16} />
                Next backup <span className="font-bold">{countdown || '—'}</span>
              </div>
            )}

            <Button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="w-full sm:w-auto"
            >
              {savingSettings ? <Loader2 size={16} className="animate-spin mr-2" /> : <Shield size={16} className="mr-2" />}
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Backup History */}
      <Card className="animate-slide-up">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History size={20} className="text-primary" /> 
            Backup History
            <Badge variant="secondary" className="ml-2">{logsCount}</Badge>
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => loadLogs(logsPage)} title="Refresh">
            <RefreshCw size={16} />
          </Button>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 size={32} className="animate-spin mb-4 text-primary" />
              <p>Loading backup history...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground text-center">
              <DatabaseBackup size={48} className="mb-4 text-secondary-foreground opacity-20" />
              <p className="text-lg font-medium text-foreground mb-1">No backups yet</p>
              <p className="text-sm">Click <strong>Backup Now</strong> to create your first backup.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between transition-colors hover:bg-secondary/20">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-sm">
                        {new Date(log.created_at).toLocaleDateString('en-BD', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {new Date(log.created_at).toLocaleTimeString('en-BD', {
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                      <span className="text-muted-foreground text-xs bg-secondary px-2 py-0.5 rounded-full">
                        {timeAgo(log.created_at)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="uppercase text-[10px]">{log.type}</Badge>
                      <StatusBadge status={log.status} />
                      <span className="flex items-center gap-1"><HardDrive size={12}/> {formatBytes(log.file_size_bytes)}</span>
                      <span className="flex items-center gap-1"><DatabaseBackup size={12}/> {log.total_records?.toLocaleString() || '—'} records</span>
                      <span className="flex items-center gap-1"><Shield size={12}/> By {log.triggered_by_user_name || '—'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {log.supabase_storage_path && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full px-4 py-2 text-xs font-bold"
                        onClick={() => handleDownloadFromStorage(log)}
                        title="Download backup"
                      >
                        <Download size={12} className="mr-1.5" /> JSON
                      </Button>
                    )}
                    {log.google_drive_link && (
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="rounded-full px-4 py-2 text-xs font-bold text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/30"
                      >
                        <a href={log.google_drive_link} target="_blank" rel="noopener noreferrer" title="Open in Google Drive">
                          <ExternalLink size={12} className="mr-1.5" /> Drive
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-6">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                disabled={logsPage === 1}
              >
                <ChevronLeft size={14} />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pg = logsPage <= 3 ? i + 1 : logsPage - 2 + i;
                if (pg < 1 || pg > totalPages) return null;
                return (
                  <Button
                    key={pg}
                    variant={logsPage === pg ? 'default' : 'outline'}
                    className={`h-8 w-8 rounded-lg p-0 ${logsPage === pg ? 'bg-primary text-primary-foreground' : ''}`}
                    onClick={() => setLogsPage(pg)}
                  >
                    {pg}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => setLogsPage((p) => Math.min(totalPages, p + 1))}
                disabled={logsPage === totalPages}
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
