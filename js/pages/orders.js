/**
 * ForgeAdmin — Orders Page
 */
import { auth } from '../firebase-config.js';
import { requireAuth, populateUserUI, populateSidebarStats, fmt, showToast, openModal,
         setLoading, skeletonRows, renderPagination } from '../ui-utils.js';
import { orderService, settingsService, productService } from '../forge-api.js';

populateSidebarStats(productService);
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const esc = fmt.escapeHtml;
const escAttr = fmt.escapeAttr;

const user = await requireAuth(auth, '../index.html');
try {
  const s = await settingsService.get(user.uid);
  populateUserUI(user, { name: s.profile?.name, email: s.profile?.email, role: s.role });
} catch (e) { populateUserUI(user); }
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  await signOut(auth); window.location.href = '../index.html';
});

let currentPage = 1;
let currentStatus = '';
let currentSearch = '';

async function loadStats() {
  try {
    const stats = await orderService.getStats();
    const el = (id) => document.getElementById(id);
    if (el('stat-pending'))    el('stat-pending').textContent    = stats.pending;
    if (el('stat-processing')) el('stat-processing').textContent = stats.processing;
    if (el('stat-completed'))  el('stat-completed').textContent  = stats.completed;
  } catch (e) { console.error(e); }
}

function orderRow(o) {
  const transitions = orderService.allowedTransitions(o.status);
  const transitionBtns = transitions.map(s =>
    `<button onclick="updateStatus('${escAttr(o.id)}','${escAttr(s)}')"
      class="px-2 py-1 text-xs font-medium rounded-lg bg-gray-100 hover:bg-brand-50 hover:text-brand-600 transition-colors capitalize">${esc(s)}</button>`
  ).join('');

  return `
  <tr class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
    <td class="px-6 py-4 font-medium text-brand-600">${esc(o.orderNumber) || o.id.slice(-6).toUpperCase()}</td>
    <td class="px-6 py-4 text-gray-500 text-sm">${fmt.dateTime(o.orderedAt)}</td>
    <td class="px-6 py-4">
      <p class="font-medium text-gray-900">${esc(o.customerName) || 'Unknown'}</p>
      <p class="text-xs text-gray-500">${esc(o.customerEmail) || ''}</p>
    </td>
    <td class="px-6 py-4">
      <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${fmt.statusClass(o.status)}">${fmt.statusLabel(o.status)}</span>
    </td>
    <td class="px-6 py-4 font-semibold text-gray-900">${fmt.currency(o.total)}</td>
    <td class="px-6 py-4 text-right">
      <div class="flex gap-1 justify-end flex-wrap">
        ${transitionBtns}
        <button onclick="viewOrder('${escAttr(o.id)}')" class="px-2 py-1 text-xs font-medium text-brand-600 hover:text-brand-700">View</button>
      </div>
    </td>
  </tr>`;
}

async function loadOrders(page = 1) {
  currentPage = page;
  const tbody = document.getElementById('orders-tbody');
  if (!tbody) return;
  tbody.innerHTML = skeletonRows(6, 5);

  try {
    const res = await orderService.getAll({ status: currentStatus, search: currentSearch, page, pageSize: 10 });
    if (!res.data.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-16 text-center text-gray-400">
        <i class="fa-solid fa-bag-shopping text-3xl mb-3 block opacity-50"></i>No orders found.
      </td></tr>`;
    } else {
      tbody.innerHTML = res.data.map(orderRow).join('');
    }
    renderPagination('orders-pagination', res, loadOrders);
  } catch (err) {
    console.error(err);
    showToast('Error loading orders', 'error');
  }
}

window.updateStatus = async (id, status) => {
  try {
    await orderService.updateStatus(id, status);
    showToast(`Order marked as ${status}`);
    loadOrders(currentPage);
    loadStats();
  } catch (err) {
    showToast(err.message || 'Update failed', 'error');
  }
};

window.viewOrder = async (id) => {
  const order = await orderService.getById(id);
  if (!order) { showToast('Order not found', 'error'); return; }
  openModal({
    id: 'modal-order-detail',
    title: `Order ${order.orderNumber || id.slice(-6).toUpperCase()}`,
    saveText: 'Close',
    content: `
      <div class="space-y-4 text-sm">
        <div class="grid grid-cols-2 gap-4">
          <div><p class="text-gray-500">Customer</p><p class="font-semibold text-gray-900">${order.customerName || '—'}</p></div>
          <div><p class="text-gray-500">Email</p><p class="font-semibold text-gray-900">${order.customerEmail || '—'}</p></div>
          <div><p class="text-gray-500">Status</p>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${fmt.statusClass(order.status)}">${fmt.statusLabel(order.status)}</span>
          </div>
          <div><p class="text-gray-500">Date</p><p class="font-semibold text-gray-900">${fmt.dateTime(order.orderedAt)}</p></div>
        </div>
        ${(order.items || []).length > 0 ? `
          <div class="border-t border-gray-100 pt-4">
            <p class="text-gray-500 font-medium mb-3">Items</p>
            ${(order.items || []).map(item => `
              <div class="flex justify-between mb-2">
                <span class="text-gray-700">${item.name || item.productId} × ${item.quantity}</span>
                <span class="font-medium text-gray-900">${fmt.currency(item.totalPrice)}</span>
              </div>`).join('')}
          </div>` : ''}
        <div class="border-t border-gray-100 pt-3 flex justify-between">
          <span class="font-bold text-gray-900">Total</span>
          <span class="font-bold text-gray-900 text-base">${fmt.currency(order.total)}</span>
        </div>
      </div>`,
    onSave: (close) => close()
  });
};

// Status filter tabs
document.querySelectorAll('[data-filter-status]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-filter-status]').forEach(b => {
      b.className = b.className.replace('bg-gray-900 text-white', 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50');
    });
    btn.className = btn.className.replace('bg-white border border-gray-200 text-gray-600 hover:bg-gray-50', 'bg-gray-900 text-white');
    currentStatus = btn.dataset.filterStatus;
    loadOrders(1);
  });
});

// Search
const searchInput = document.getElementById('orders-search');
let timer;
searchInput?.addEventListener('input', (e) => {
  clearTimeout(timer);
  timer = setTimeout(() => { currentSearch = e.target.value; loadOrders(1); }, 400);
});

loadStats();
loadOrders();
