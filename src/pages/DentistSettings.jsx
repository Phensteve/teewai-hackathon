import { useOutletContext } from 'react-router-dom';
import { Settings, Bell, Globe, Shield } from 'lucide-react';

export default function DentistSettings() {
  const { profile } = useOutletContext();
  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center gap-2 mb-1">
        <Settings className="w-5 h-5 text-olo" />
        <h1 className="font-heading font-700 text-2xl tracking-tight">Settings</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Manage your dentist portal preferences.</p>

      <div className="space-y-3">
        <div className="p-4 rounded-2xl border border-border bg-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-olo" />
            <div>
              <p className="text-sm font-medium">Notifications</p>
              <p className="text-xs text-muted-foreground">Get notified when patients share scans.</p>
            </div>
          </div>
          <span className="text-xs text-olo">Enabled</span>
        </div>
        <div className="p-4 rounded-2xl border border-border bg-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-olo" />
            <div>
              <p className="text-sm font-medium">Directory visibility</p>
              <p className="text-xs text-muted-foreground">{profile?.accepting_patients ? 'Visible to patients' : 'Hidden from directory'}</p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">Edit in Practice Profile</span>
        </div>
        <div className="p-4 rounded-2xl border border-border bg-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-olo" />
            <div>
              <p className="text-sm font-medium">Data and privacy</p>
              <p className="text-xs text-muted-foreground">Patient data is only visible after they approve your request.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}