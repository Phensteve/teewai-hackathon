import { usersMirror } from '@/lib/insforgeDb';

// Do not mistake a failed profile request for a new account.
export default async function accountProfile(user) {
  if (!user?.id) throw new Error('Please sign in again.');
  const rows = await usersMirror.list('-created_date', 1, { user_id: user.id });
  const mirror = rows[0];
  return { ...user, ...mirror, id: user.id, email: user.email,
    username: mirror?.username || user.username || '',
    display_name: mirror?.display_name || user.display_name || '',
    role: user.role };
}