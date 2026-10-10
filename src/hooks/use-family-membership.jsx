import { useState, useEffect } from 'react';
import { unrufld } from '@/api/unrufldClient';
import { subscriptions } from '@/lib/insforgeDb';

// Resolves whether the current user is involved in a family plan — either the
// owner (bought family_15 / family_pro) or a linked member (resolved via the
// familyResolve backend). Used to gate the Family nav tab vs Find a Dentist.
export function useFamilyMembership() {
  const [isFamilyMember, setIsFamilyMember] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const s = await subscriptions.filter({});
        const sub = s[0] || null;
        if (sub && (sub.plan === 'family_15' || sub.plan === 'family_pro')) {
          if (active) setIsFamilyMember(true);
          return;
        }
        // Not an owner — check if they're a linked member of someone's family.
        const { data } = await unrufld.functions.invoke('familyResolve', { op: 'resolve' });
        if (active && data?.found) setIsFamilyMember(true);
      } catch {
        // Non-fatal — defaults to not a family member (Find a Dentist tab).
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  return { isFamilyMember, loading };
}