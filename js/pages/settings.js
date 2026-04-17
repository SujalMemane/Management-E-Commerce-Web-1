/**
 * ForgeAdmin — Settings Page
 */
import { auth } from '../firebase-config.js';
import { requireAuth, populateUserUI, populateSidebarStats, fmt, showToast, setLoading } from '../ui-utils.js';
import { settingsService, productService } from '../forge-api.js';

populateSidebarStats(productService);
import {
  signOut, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const user = await requireAuth(auth, '../index.html');
try {
  const s = await settingsService.get(user.uid);
  populateUserUI(user, { name: s.profile?.name, email: s.profile?.email, role: s.role });
} catch (e) { populateUserUI(user); }
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  await signOut(auth); window.location.href = '../index.html';
});

// ── Load Settings ──────────────────────────────
async function loadSettings() {
  try {
    const settings = await settingsService.get(user.uid);
    const p = settings.profile || {};
    const n = settings.notifications || {};

    // Profile
    const el = (id) => document.getElementById(id);
    if (el('sf-first'))  el('sf-first').value  = p.firstName || user.displayName?.split(' ')[0] || '';
    if (el('sf-last'))   el('sf-last').value   = p.lastName  || user.displayName?.split(' ').slice(1).join(' ') || '';
    if (el('sf-email'))  el('sf-email').value  = p.email     || user.email || '';

    // Notification prefs
    if (el('notif-daily-orders'))  el('notif-daily-orders').checked  = n.dailyOrderSummary !== false;
    if (el('notif-low-stock'))     el('notif-low-stock').checked     = n.lowStockAlerts !== false;
    if (el('notif-marketing'))     el('notif-marketing').checked     = n.marketingUpdates === true;

    // Avatar initials
    const avatarEl = document.getElementById('settings-avatar');
    if (avatarEl) {
      const name = `${p.firstName || ''} ${p.lastName || ''}`.trim() || user.displayName || 'Admin';
      avatarEl.textContent = fmt.initials(name);
    }
  } catch (err) {
    console.error(err);
    showToast('Could not load settings', 'error');
  }
}

// ── Save Profile ────────────────────────────────
document.getElementById('btn-save-settings')?.addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  const el  = (id) => document.getElementById(id);

  const firstName = el('sf-first')?.value?.trim();
  const lastName  = el('sf-last')?.value?.trim();
  const email     = el('sf-email')?.value?.trim();

  if (!firstName) { showToast('First name is required', 'warning'); return; }

  setLoading(btn, true);
  try {
    await settingsService.update(user.uid, {
      profile: { firstName, lastName, email, name: `${firstName} ${lastName}`.trim() },
      notifications: {
        dailyOrderSummary: el('notif-daily-orders')?.checked ?? true,
        lowStockAlerts:    el('notif-low-stock')?.checked    ?? true,
        marketingUpdates:  el('notif-marketing')?.checked    ?? false
      }
    });
    showToast('Settings saved successfully!');
    // Update sidebar/header display
    populateUserUI(user, { name: `${firstName} ${lastName}`.trim(), email });
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Failed to save settings', 'error');
  } finally {
    setLoading(btn, false);
  }
});

// ── Change Password ─────────────────────────────
document.getElementById('btn-change-password')?.addEventListener('click', async (e) => {
  const btn        = e.currentTarget;
  const currentPw  = document.getElementById('sf-current-pw')?.value;
  const newPw      = document.getElementById('sf-new-pw')?.value;
  const confirmPw  = document.getElementById('sf-confirm-pw')?.value;

  if (!currentPw) { showToast('Enter your current password', 'warning'); return; }
  if (!newPw || newPw.length < 8) { showToast('New password must be at least 8 characters', 'warning'); return; }
  if (newPw !== confirmPw) { showToast('Passwords do not match', 'warning'); return; }

  setLoading(btn, true);
  try {
    const credential = EmailAuthProvider.credential(user.email, currentPw);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPw);
    showToast('Password updated successfully!');
    document.getElementById('sf-current-pw').value = '';
    document.getElementById('sf-new-pw').value      = '';
    document.getElementById('sf-confirm-pw').value  = '';
  } catch (err) {
    const msgs = {
      'auth/wrong-password':         'Current password is incorrect.',
      'auth/too-many-requests':      'Too many attempts. Please wait and try again.',
      'auth/requires-recent-login':  'Please log out and log back in to change your password.',
    };
    showToast(msgs[err.code] || err.message || 'Password change failed', 'error');
  } finally {
    setLoading(btn, false);
  }
});

loadSettings();
