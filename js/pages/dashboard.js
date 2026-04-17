/**
 * ForgeAdmin — Dashboard Page
 * Real-time KPI stats and overview from Firestore
 */
import { auth } from '../firebase-config.js';
import { requireAuth, populateUserUI, fmt, showToast } from '../ui-utils.js';
import { dashboardService, orderService, inventoryService, reviewService, productService, settingsService } from '../forge-api.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const esc = fmt.escapeHtml;

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
document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
  e.preventDefault();
  await signOut(auth);
  window.location.href = '../index.html';
});

// ── Helpers ───────────────────────────────────
function setStatCard(statKey, value, change, trend) {
  const valEl  = document.querySelector(`[data-stat="${statKey}"]`);
  const chgValEl = document.querySelector(`[data-change-value="${statKey}"]`);
  const chgEl  = document.querySelector(`[data-change="${statKey}"]`);
  const icoEl  = document.querySelector(`[data-trend="${statKey}"]`);

  if (valEl) valEl.textContent = value;
  if (chgValEl) chgValEl.textContent = `${Math.abs(change)}%`;
  
  if (icoEl && chgEl) {
    const isUp = trend === 'up';
    icoEl.className = `fa-solid ${isUp ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'} text-xs`;
    chgEl.className = `flex items-center gap-1 text-sm font-semibold px-2.5 py-1 rounded-lg ${isUp ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50'}`;
  }
}

function setQuickStat(key, value) {
  const el = document.querySelector(`[data-quick-stat="${key}"]`);
  if (el) el.textContent = value;
}

// ── Render Recent Orders ─────────────────────
function renderRecentOrders(orders) {
  const container = document.getElementById('recent-orders-container');
  if (!container) return;

  if (orders.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-400">
        <i class="fa-solid fa-inbox text-3xl mb-2 block opacity-50"></i>
        <p class="text-sm">No orders yet</p>
      </div>`;
    return;
  }

  container.innerHTML = orders.slice(0, 5).map(order => `
    <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <div class="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-200">
          <i class="fa-solid fa-receipt text-gray-400"></i>
        </div>
        <div class="min-w-0">
          <p class="font-semibold text-gray-900 text-sm truncate">${esc(order.orderNumber || 'N/A')}</p>
          <p class="text-xs text-gray-500 truncate">${esc(order.customerName || 'Unknown')}</p>
        </div>
      </div>
      <div class="text-right flex-shrink-0 ml-3">
        <p class="font-bold text-gray-900 text-sm">${fmt.currency(order.total || 0)}</p>
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${fmt.statusClass(order.status)}">
          ${fmt.statusLabel(order.status)}
        </span>
      </div>
    </div>
  `).join('');
}

// ── Render Low Stock Products ────────────────
function renderLowStock(products) {
  const container = document.getElementById('low-stock-container');
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-400">
        <i class="fa-solid fa-check-circle text-3xl mb-2 block opacity-50"></i>
        <p class="text-sm">All stocked up!</p>
      </div>`;
    return;
  }

  container.innerHTML = products.slice(0, 5).map(product => `
    <div class="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <div class="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 text-gray-400">
          <i class="fa-solid ${esc(product.icon) || 'fa-box'} text-sm"></i>
        </div>
        <div class="min-w-0">
          <p class="font-medium text-gray-900 text-sm truncate">${esc(product.name)}</p>
          <p class="text-xs text-amber-600 font-medium">${product.stock || 0} left</p>
        </div>
      </div>
      <a href="inventory.html" class="text-brand-500 hover:text-brand-600 flex-shrink-0">
        <i class="fa-solid fa-arrow-right text-sm"></i>
      </a>
    </div>
  `).join('');
}

// ── Render Top Products ──────────────────────
function renderTopProducts(products) {
  const container = document.getElementById('top-products-container');
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-400">
        <i class="fa-solid fa-box-open text-3xl mb-2 block opacity-50"></i>
        <p class="text-sm">No products yet</p>
      </div>`;
    return;
  }

  container.innerHTML = products.slice(0, 5).map(product => `
    <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <div class="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-200">
          <i class="fa-solid ${esc(product.icon) || 'fa-box'} text-gray-400"></i>
        </div>
        <div class="min-w-0">
          <p class="font-semibold text-gray-900 text-sm truncate">${esc(product.name)}</p>
          <p class="text-xs text-gray-500">${esc(product.categoryName || 'Uncategorized')}</p>
        </div>
      </div>
      <div class="text-right flex-shrink-0 ml-3">
        <p class="font-bold text-gray-900 text-sm">${fmt.currency(product.price || 0)}</p>
        <p class="text-xs text-gray-500">${product.stock || 0} in stock</p>
      </div>
    </div>
  `).join('');
}

// ── Load Dashboard Data ──────────────────────
async function loadDashboard() {
  try {
    // Load main stats
    console.log('Loading dashboard stats...');
    const stats = await dashboardService.getStats();
    
    setStatCard('revenue',   fmt.currency(stats.revenue.total),   stats.revenue.change,   stats.revenue.trend);
    setStatCard('orders',    fmt.number(stats.orders.total),       stats.orders.change,    stats.orders.trend);
    setStatCard('customers', fmt.number(stats.customers.total),    stats.customers.change, stats.customers.trend);
    setStatCard('products',  fmt.number(stats.products.total),     stats.products.change,  stats.products.trend);

    console.log('Stats loaded successfully');
    
    // Update sidebar product count badge
    const sidebarCount = document.getElementById('sidebar-product-count');
    if (sidebarCount) sidebarCount.textContent = stats.products.total;
  } catch (err) {
    console.error('[Dashboard] Failed to load stats:', err);
    showToast('Could not load dashboard stats', 'error');
  }

  try {
    // Load order stats
    console.log('Loading order stats...');
    const orderStats = await orderService.getStats();
    setQuickStat('pending', fmt.number(orderStats.pending));
    console.log('Order stats loaded');
  } catch (err) {
    console.error('[Dashboard] Failed to load order stats:', err);
    setQuickStat('pending', '0');
  }

  try {
    // Load low stock count
    console.log('Loading inventory stats...');
    const lowStockCount = await inventoryService.getLowStockCount(10);
    setQuickStat('lowStock', fmt.number(lowStockCount));
    console.log('Inventory stats loaded');
  } catch (err) {
    console.error('[Dashboard] Failed to load inventory stats:', err);
    setQuickStat('lowStock', '0');
  }

  try {
    // Load pending reviews count
    console.log('Loading review stats...');
    const pendingReviewsCount = await reviewService.getPendingCount();
    setQuickStat('pendingReviews', fmt.number(pendingReviewsCount));
    console.log('Review stats loaded');
  } catch (err) {
    console.error('[Dashboard] Failed to load review stats:', err);
    setQuickStat('pendingReviews', '0');
  }

  try {
    // Load recent orders
    console.log('Loading recent orders...');
    const ordersResult = await orderService.getAll({ page: 1, pageSize: 5 });
    renderRecentOrders(ordersResult.data);
    console.log('Recent orders loaded');
  } catch (err) {
    console.error('[Dashboard] Failed to load recent orders:', err);
    renderRecentOrders([]);
  }

  try {
    // Load low stock products
    console.log('Loading low stock products...');
    const lowStockProducts = await inventoryService.getAll({ availability: 'low_stock' });
    renderLowStock(lowStockProducts);
    console.log('Low stock products loaded');
  } catch (err) {
    console.error('[Dashboard] Failed to load low stock products:', err);
    renderLowStock([]);
  }

  try {
    // Load top products
    console.log('Loading top products...');
    const productsResult = await productService.getAll({ page: 1, pageSize: 5 });
    renderTopProducts(productsResult.data);
    console.log('Top products loaded');
  } catch (err) {
    console.error('[Dashboard] Failed to load top products:', err);
    renderTopProducts([]);
  }
}

// ── Initialize ───────────────────────────────
console.log('Dashboard initializing...');
loadDashboard();

// ── Update Sidebar Badge ─────────────────────
async function updateSidebarBadges() {
  try {
    const productCount = await productService.getCount();
    const badge = document.querySelector('a[href="products.html"] .sidebar-text.ml-auto');
    if (badge) {
      badge.textContent = productCount;
    }
  } catch (err) {
    console.error('[Dashboard] Failed to update sidebar badges:', err);
  }
}

updateSidebarBadges();
