import { useState, useEffect } from 'react';
import { ShieldOff, Ban, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { adminAuth } from '@/lib/adminAuth';
import Spinner from '@/components/Spinner';

// Admin panel for tracking and banning guest (non-signed-in) IPs. Each row
// is a guest IP seen posting in the community, with last-seen, post count,
// a snippet of their last message, and a ban/unban control. Banned IPs are
// blocked from posting by the communityPost backend function.

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function IpBanPanel() {
  const [ips, setIps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [reasons, setReasons] = useState({});
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminAuth.listGuestIps();
      setIps(res.ips || []);
    } catch (e) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const ban = async (id) => {
    setActing(id);
    try {
      await adminAuth.banGuestIp(id, reasons[id] || '');
      setReasons((r) => ({ ...r, [id]: '' }));
      await load();
    } catch (e) { setError(e.message || 'Failed'); }
    finally { setActing(null); }
  };
  const unban = async (id) => {
    setActing(id);
    try { await adminAuth.unbanGuestIp(id); await load(); }
    catch (e) { setError(e.message || 'Failed'); }
    finally { setActing(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldOff className="w-5 h-5 text-olo" />
        <h2 className="font-heading font-700 text-xl">Guest IP Bans</h2>
        <span className="text-xs text-muted-foreground ml-auto">{ips.length} IPs tracked</span>
      </div>
      <p className="text-sm text-muted-foreground">
        IPs of non-signed-in users who posted in the community. Banning an IP blocks that device from posting as a guest.
      </p>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : ips.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
          No guest IPs tracked yet.
        </div>
      ) : (
        <div className="overflow-x-auto overflow-y-clip rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground admin-sticky-thead">
              <tr className="text-left">
                <th className="px-3 py-2.5 font-semibold font-mono">IP Address</th>
                <th className="px-3 py-2.5 font-semibold">Last seen</th>
                <th className="px-3 py-2.5 font-semibold text-center">Posts</th>
                <th className="px-3 py-2.5 font-semibold">Last message</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {ips.map((ip) => (
                <tr key={ip.id} className="border-t border-border">
                  <td className="px-3 py-2.5 font-mono text-xs">{ip.ip_address}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {timeAgo(ip.last_seen)}
                  </td>
                  <td className="px-3 py-2.5 text-center text-xs">{ip.post_count || 0}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[220px] truncate">{ip.last_message || '—'}</td>
                  <td className="px-3 py-2.5">
                    {ip.banned ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full uppercase">
                        <Ban className="w-2.5 h-2.5" /> Banned
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full uppercase">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Active
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {ip.banned ? (
                      <button
                        onClick={() => unban(ip.id)}
                        disabled={acting === ip.id}
                        className="text-xs font-semibold text-success hover:underline disabled:opacity-40"
                      >
                        {acting === ip.id ? '…' : 'Unban'}
                      </button>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        <input
                          value={reasons[ip.id] || ''}
                          onChange={(e) => setReasons((r) => ({ ...r, [ip.id]: e.target.value }))}
                          placeholder="reason"
                          className="w-24 rounded-none border border-border bg-background px-2 py-1 text-[11px] focus:outline-none focus:border-olo/50"
                        />
                        <button
                          onClick={() => ban(ip.id)}
                          disabled={acting === ip.id}
                          className="text-xs font-semibold text-destructive hover:underline disabled:opacity-40"
                        >
                          {acting === ip.id ? '…' : 'Ban'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}