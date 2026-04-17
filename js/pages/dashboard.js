/**
 * ForgeAdmin — Dashboard Page
 * Real-time KPI stats from Firestore
 */
import { auth } from '../firebase-config.js';
import { requireAuth, populateUserUI, fmt, showToast } from '../ui-utils.js';
import { dashboardService, settingsService } from '../forge-api.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ── Auth Guard ────────────────────────────────
const user = await requireAuth(auth, '../index.html');

// Load user profile from Firestore and update UI
try {
  const settings = await settingsService.get(user.uid);
  const profile = settings.profile || {};
  populateUserUI(user, { name: profile.name || user.displayName, email: profile.email || user.email, role: settings.role });
} catch (e) {
  populateUserUI(user);
}

// ── Logout ────────────────────────────────────
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = '../index.html';
});

// ── Helpers ───────────────────────────────────
function setStatCard(statKey, value, change, trend) {
  const valEl  = document.querySelector(`[data-stat="${statKey}"]`);
  const chgEl  = document.querySelector(`[data-change="${statKey}"]`);
  const icoEl  = document.querySelector(`[data-trend="${statKey}"]`);

  if (valEl) valEl.textContent = value;
  if (chgEl) chgEl.textContent = `${Math.abs(change)}%`;
  if (icoEl) {
    const isUp = trend === 'up';
    icoEl.className = `fa-solid ${isUp ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'} text-xs`;
    const badge = icoEl.closest('span');
    if (badge) {
      badge.className = `flex items-center gap-1 text-sm font-semibold px-2.5 py-1 rounded-lg ${isUp ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50'}`;
    }
  }
}

// ── Load Stats ───────────────────────────────
async function loadDashboard() {
  try {
    const stats = await dashboardService.getStats();
    setStatCard('revenue',   fmt.currency(stats.revenue.total),   stats.revenue.change,   stats.revenue.trend);
    setStatCard('orders',    fmt.number(stats.orders.total),       stats.orders.change,    stats.orders.trend);
    setStatCard('customers', fmt.number(stats.customers.total),    stats.customers.change, stats.customers.trend);
    setStatCard('products',  fmt.number(stats.products.total),     stats.products.change,  stats.products.trend);
    
    // Update sidebar product count badge
    const sidebarCount = document.getElementById('sidebar-product-count');
    if (sidebarCount) sidebarCount.textContent = stats.products.total;
  } catch (err) {
    console.error('[Dashboard] Failed to load stats:', err);
    showToast('Could not load dashboard stats', 'error');
  }
}

loadDashboard();
