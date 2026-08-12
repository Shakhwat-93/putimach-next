'use client';
// @ts-nocheck
import { useCallback, useEffect, useMemo, useState } from 'react';
import './FraudControl.css';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Database,
  RefreshCw,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { cn } from '../lib/utils';

const IPV4_PATTERN = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const IPV6_PATTERN = /^(([0-9a-f]{1,4}:){2,7}[0-9a-f]{1,4}|::1|::)$/i;

const isValidIpAddress = (value = '') => {
  const normalized = String(value || '').trim();
  return IPV4_PATTERN.test(normalized) || IPV6_PATTERN.test(normalized);
};

const formatDateTime = (value) => {
  if (!value) return 'Never';
  try {
    return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return 'Invalid date';
  }
};

export const FraudControl = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingIp, setSavingIp] = useState('');
  const [blocklistConfigured, setBlocklistConfigured] = useState(true);
  const [blocks, setBlocks] = useState([]);
  const [ipRows, setIpRows] = useState([]);
  const [ipAddress, setIpAddress] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const activeBlocks = useMemo(
    () => blocks.filter((block) => block.is_active !== false),
    [blocks]
  );

  const activeBlockMap = useMemo(
    () => new Map(activeBlocks.map((block) => [api.normalizeIpAddress(block.ip_address), block])),
    [activeBlocks]
  );

  const repeatedIpCount = useMemo(
    () => ipRows.filter((row) => row.total_orders > 1).length,
    [ipRows]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const [blocklistResult, intelligence] = await Promise.all([
        api.getIpBlocklist(),
        api.getOrderIpIntelligence(1000)
      ]);

      setBlocklistConfigured(blocklistResult.configured);
      setBlocks(blocklistResult.blocks || []);
      setIpRows(intelligence || []);
    } catch (err) {
      console.error('Failed to load fraud controls:', err);
      setError(err?.message || 'Failed to load fraud controls.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const blockIp = async (targetIp, targetReason = reason) => {
    const normalizedIp = api.normalizeIpAddress(targetIp);
    setError('');
    setMessage('');

    if (!blocklistConfigured) {
      setError('IP blocklist database guard is not installed yet.');
      return;
    }

    if (!isValidIpAddress(normalizedIp)) {
      setError('Enter a valid IPv4 or IPv6 address.');
      return;
    }

    setSavingIp(normalizedIp);
    try {
      await api.blockIpAddress(
        normalizedIp,
        targetReason,
        user?.id,
        profile?.name || user?.email || 'Admin'
      );
      setIpAddress('');
      setReason('');
      await loadData();
      setMessage(`${normalizedIp} is now blocked.`);
    } catch (err) {
      console.error('Failed to block IP:', err);
      setError(err?.message || 'Failed to block IP address.');
    } finally {
      setSavingIp('');
    }
  };

  const unblockIp = async (targetIp) => {
    const normalizedIp = api.normalizeIpAddress(targetIp);
    setError('');
    setMessage('');
    setSavingIp(normalizedIp);

    try {
      await api.unblockIpAddress(normalizedIp);
      await loadData();
      setMessage(`${normalizedIp} is unblocked.`);
    } catch (err) {
      console.error('Failed to unblock IP:', err);
      setError(err?.message || 'Failed to unblock IP address.');
    } finally {
      setSavingIp('');
    }
  };

  return (
    <div className="space-y-6">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Security Operations</span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">Fraud Control</h1>
          <p className="text-sm text-muted-foreground">IP firewall for abusive landing-page order submissions.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="w-fit">
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="animate-slide-up">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active Blocks</p>
              <h3 className="text-2xl font-bold text-foreground font-display">{activeBlocks.length}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Database className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Observed IPs</p>
              <h3 className="text-2xl font-bold text-foreground font-display">{ipRows.length}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Repeat IPs</p>
              <h3 className="text-2xl font-bold text-foreground font-display">{repeatedIpCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up">
          <CardContent className="p-4 flex items-center gap-4">
            <div
              className={cn(
                "p-3 rounded-xl",
                blocklistConfigured
                  ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
              )}
            >
              {blocklistConfigured ? <ShieldCheck className="size-5" /> : <Ban className="size-5" />}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">DB Guard</p>
              <h3 className="text-2xl font-bold text-foreground font-display">
                {blocklistConfigured ? 'Ready' : 'Setup Required'}
              </h3>
            </div>
          </CardContent>
        </Card>
      </section>

      {!blocklistConfigured && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200 text-sm animate-slide-up">
          <Ban className="size-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1">
            <strong className="font-semibold block">Database blocklist is not installed.</strong>
            <span>Run <code className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-xs font-mono">supabase_migration_ip_blocklist.sql</code> in Supabase SQL Editor to activate lifetime IP blocking.</span>
          </div>
        </div>
      )}

      {message && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-200 text-sm animate-slide-up">
          <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-200 text-sm animate-slide-up">
          <AlertTriangle className="size-5 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="animate-slide-up flex flex-col justify-between">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-lg font-bold font-display">Block IP Address</CardTitle>
              <CardDescription className="mt-1">Blocks future orders with the same captured IP.</CardDescription>
            </div>
            <div className="p-2 rounded-lg bg-secondary text-muted-foreground">
              <Ban className="size-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                blockIp(ipAddress);
              }}
            >
              <Input
                label="IP Address"
                value={ipAddress}
                onChange={(event) => setIpAddress(event.target.value)}
                placeholder="103.124.237.249"
                disabled={!blocklistConfigured}
                fullWidth
              />

              <Input
                isTextarea
                rows={4}
                label="Reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Spam orders, fake customer info, repeated abuse"
                disabled={!blocklistConfigured}
                fullWidth
              />

              <Button
                type="submit"
                variant="destructive"
                className="w-full sm:w-auto"
                disabled={!blocklistConfigured || savingIp === api.normalizeIpAddress(ipAddress)}
              >
                <Ban className="size-4" />
                Block Lifetime
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="animate-slide-up flex flex-col">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-lg font-bold font-display">Blocked IPs</CardTitle>
              <CardDescription className="mt-1">Active blocks currently enforced by the database guard.</CardDescription>
            </div>
            <div className="p-2 rounded-lg bg-secondary text-muted-foreground">
              <ShieldCheck className="size-5" />
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              {activeBlocks.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                  No active IP blocks.
                </div>
              ) : (
                activeBlocks.map((block) => (
                  <div
                    className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-border bg-card/50 hover:bg-secondary/40 transition-colors"
                    key={block.ip_address}
                  >
                    <div className="space-y-1 min-w-0">
                      <strong className="block text-sm font-mono font-bold text-foreground truncate">
                        {block.ip_address}
                      </strong>
                      <p className="text-xs text-muted-foreground truncate">
                        {block.reason || 'No reason added'}
                      </p>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground/80">
                        <Clock className="size-3 shrink-0" />
                        <span>{formatDateTime(block.created_at)}</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => unblockIp(block.ip_address)}
                      disabled={savingIp === api.normalizeIpAddress(block.ip_address)}
                      className="shrink-0"
                    >
                      Unblock
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="animate-slide-up">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg font-bold font-display">Recent Order IP Intelligence</CardTitle>
            <CardDescription className="mt-1">
              Aggregated from the latest order records with captured IP addresses.
            </CardDescription>
          </div>
          <div className="p-2 rounded-lg bg-secondary text-muted-foreground">
            <ShieldAlert className="size-5" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="bg-muted/30 px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      IP Address
                    </th>
                    <th className="bg-muted/30 px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Orders
                    </th>
                    <th className="bg-muted/30 px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Latest Order
                    </th>
                    <th className="bg-muted/30 px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Status Mix
                    </th>
                    <th className="bg-muted/30 px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {ipRows.map((row) => {
                    const isBlocked = activeBlockMap.has(row.ip_address);
                    return (
                      <tr
                        key={row.ip_address}
                        className={cn(
                          "hover:bg-secondary/50 transition-colors",
                          isBlocked && "bg-rose-50/40 dark:bg-rose-950/10"
                        )}
                      >
                        <td className="px-4 py-3 text-sm text-foreground border-b border-border/50">
                          <div className="flex items-center gap-2 flex-wrap">
                            <code className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted">
                              {row.ip_address}
                            </code>
                            {isBlocked ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                                <span className="size-1.5 rounded-full bg-rose-600 dark:bg-rose-400" />
                                Blocked
                              </span>
                            ) : row.total_orders > 2 ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                                <span className="size-1.5 rounded-full bg-rose-600 dark:bg-rose-400" />
                                High Risk
                              </span>
                            ) : row.total_orders > 1 ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                                <span className="size-1.5 rounded-full bg-amber-600 dark:bg-amber-400" />
                                Medium Risk
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                                Low Risk
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground border-b border-border/50 font-semibold">
                          {row.total_orders}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground border-b border-border/50">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-foreground">
                              {row.latest_order?.id || 'N/A'}
                            </span>
                            <span className="text-xs text-muted-foreground font-medium">
                              {row.latest_order?.customer_name || 'Unknown customer'}
                            </span>
                            <span className="text-[11px] text-muted-foreground/80">
                              {row.latest_order?.phone || 'No phone'} • {formatDateTime(row.latest_order_at)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground border-b border-border/50">
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(row.statuses || {}).map(([status, count]) => (
                              <span
                                key={status}
                                className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground border border-border/50"
                              >
                                {status}: {count}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground border-b border-border/50">
                          {isBlocked ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              onClick={() => unblockIp(row.ip_address)}
                              disabled={savingIp === row.ip_address}
                            >
                              Unblock
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="destructive"
                              size="xs"
                              onClick={() =>
                                blockIp(
                                  row.ip_address,
                                  `Blocked from order intelligence. Latest order: ${row.latest_order?.id || 'N/A'}`
                                )
                              }
                              disabled={!blocklistConfigured || savingIp === row.ip_address}
                            >
                              Block
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {!loading && ipRows.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-4 py-12 text-center text-sm text-muted-foreground">
                        No captured IP addresses found.
                      </td>
                    </tr>
                  )}

                  {loading && (
                    <tr>
                      <td colSpan="5" className="px-4 py-12 text-center text-sm text-muted-foreground">
                        Loading fraud intelligence...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
