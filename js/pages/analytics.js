/**
 * ForgeAdmin — Analytics Page
 */
import { auth } from '../firebase-config.js';
import { requireAuth, populateUserUI, populateSidebarStats, fmt, showToast } from '../ui-utils.js';
import { analyticsService, settingsService, productService } from '../forge-api.js';

populateSidebarStats(productService);
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const user = await requireAuth(auth, '../index.html');
try {
  const s = await settingsService.get(user.uid);
  populateUserUI(user, { name: s.profile?.name, email: s.profile?.email, role: s.role });
} catch (e) { populateUserUI(user); }
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  await signOut(auth); window.location.href = '../index.html';
});

const el = (id) => document.getElementById(id);

async function loadAnalytics() {
  try {
    const [overview, traffic, devices] = await Promise.all([
      analyticsService.getOverview(),
      analyticsService.getTrafficSources(),
      analyticsService.getDeviceBreakdown()
    ]);

    // ── KPI Metrics ──────────────────────────
    if (el('metric-conversion'))  el('metric-conversion').textContent = `${overview.conversionRate}%`;
    if (el('metric-aov'))         el('metric-aov').textContent        = fmt.currency(overview.aov);
    if (el('metric-bounce'))      el('metric-bounce').textContent      = `${overview.bounceRate}%`;
    if (el('metric-sessions'))    el('metric-sessions').textContent    = fmt.number(overview.sessions);

    // Progress bars on KPI cards
    setBar('bar-conversion', 65);
    setBar('bar-aov',        45);
    setBar('bar-bounce',     overview.bounceRate);
    setBar('bar-sessions',   78);

    // ── Traffic Sources ───────────────────────
    const trafficContainer = el('traffic-sources');
    if (trafficContainer) {
      const colors = ['bg-brand-500','bg-blue-500','bg-emerald-500','bg-violet-500'];
      trafficContainer.innerHTML = Object.entries(traffic).map(([source, pct], i) => `
        <div class="flex items-center gap-4">
          <span class="text-sm font-medium text-gray-600 w-28 flex-shrink-0">${source}</span>
          <div class="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
            <div class="h-full ${colors[i % colors.length]} rounded-full transition-all" style="width:${pct}%"></div>
          </div>
          <span class="text-sm font-bold text-gray-900 w-12 text-right">${pct}%</span>
        </div>`).join('');
    }

    // ── Device Breakdown ──────────────────────
    const deviceContainer = el('device-breakdown');
    const devColors = { Mobile: 'border-brand-500', Desktop: 'border-blue-500', Tablet: 'border-emerald-500' };
    if (deviceContainer) {
      deviceContainer.innerHTML = Object.entries(devices).map(([device, pct]) => `
        <div class="text-center">
          <div class="w-24 h-24 rounded-full border-8 ${devColors[device] || 'border-gray-300'} border-t-transparent flex items-center justify-center mb-2 mx-auto">
            <span class="text-lg font-bold">${pct}%</span>
          </div>
          <p class="text-xs text-gray-500">${device}</p>
        </div>`).join('');
    }
  } catch (err) {
    console.error(err);
    showToast('Error loading analytics', 'error');
  }
}

function setBar(id, pct) {
  const bar = el(id);
  if (bar) bar.style.width = `${Math.min(100, Math.max(0, pct))}%`;
}

loadAnalytics();
