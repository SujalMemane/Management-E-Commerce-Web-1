/**
 * ForgeAdmin — Inventory Page
 */
import { auth } from '../firebase-config.js';
import { requireAuth, populateUserUI, populateSidebarStats, fmt, showToast, openModal,
         setLoading, skeletonRows, exportToCSV } from '../ui-utils.js';
import { inventoryService, settingsService, productService } from '../forge-api.js';

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

function getAvailability(stock) {
  if (stock <= 0)  return { label: 'Out of Stock', class: 'text-red-500 font-bold' };
  if (stock <= 10) return { label: 'Low Stock',    class: 'text-amber-500 font-bold' };
  return              { label: 'In Stock',     class: 'text-emerald-500 font-bold' };
}

function barColor(stock) {
  if (stock <= 0)  return 'bg-red-500';
  if (stock <= 10) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function inventoryRow(item) {
  const avail  = getAvailability(item.stock);
  const pct    = Math.min(100, Math.max(0, (item.stock / 200) * 100));
  return `
  <tr class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
    <td class="px-6 py-4 font-mono text-gray-500 text-sm">${esc(item.sku) || '—'}</td>
    <td class="px-6 py-4 font-bold text-gray-900">${esc(item.name)}</td>
    <td class="px-6 py-4">
      <div class="flex items-center gap-3">
        <div class="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div class="h-full ${barColor(item.stock)} rounded-full transition-all" style="width:${pct}%"></div>
        </div>
        <span class="font-medium text-gray-900">${item.stock}</span>
      </div>
    </td>
    <td class="px-6 py-4 ${avail.class}">${avail.label}</td>
    <td class="px-6 py-4 text-right">
      <button onclick="openUpdateStock('${escAttr(item.id)}','${escAttr(item.name)}',${item.stock})"
        class="text-brand-500 font-bold hover:underline text-sm">Update</button>
    </td>
  </tr>`;
}

let currentInventory = [];

async function loadInventory() {
  const tbody = document.getElementById('inventory-tbody');
  if (!tbody) return;
  tbody.innerHTML = skeletonRows(5, 5);

  try {
    const items = await inventoryService.getAll();
    currentInventory = items;
    const lowCount = items.filter(i => i.stock > 0 && i.stock <= 10).length;
    const el = document.getElementById('low-stock-count');
    if (el) el.textContent = `${lowCount} Low Stock Item${lowCount !== 1 ? 's' : ''}`;

    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-12 text-center text-gray-400">
        No products found. Add products first.
      </td></tr>`;
    } else {
      tbody.innerHTML = items.map(inventoryRow).join('');
    }
  } catch (err) {
    console.error(err);
    showToast('Error loading inventory', 'error');
  }
}

window.openUpdateStock = (id, name, currentStock) => {
  openModal({
    id: 'modal-stock',
    title: `Update Stock — ${name}`,
    content: `
      <div class="space-y-4">
        <div>
          <label class="forge-label">Current Stock</label>
          <p class="text-2xl font-bold text-gray-900">${currentStock} units</p>
        </div>
        <div>
          <label class="forge-label">New Stock Quantity *</label>
          <input id="sf-qty" type="number" min="0" class="forge-input" value="${currentStock}" placeholder="Enter quantity">
        </div>
      </div>`,
    saveText: 'Update Stock',
    onSave: async (close, btn) => {
      const qty = parseInt(document.getElementById('sf-qty')?.value);
      if (isNaN(qty) || qty < 0) { showToast('Enter a valid quantity', 'warning'); return; }
      setLoading(btn, true);
      try {
        await inventoryService.updateStock(id, qty);
        showToast('Stock updated successfully!');
        close(); loadInventory();
      } catch (err) {
        showToast(err.message || 'Update failed', 'error');
        setLoading(btn, false);
      }
    }
  });
};

// Restock button
document.getElementById('btn-restock')?.addEventListener('click', () => {
  openModal({
    id: 'modal-restock',
    title: 'Bulk Restock',
    content: `
      <div class="space-y-3">
        <p class="text-sm text-gray-500">Update individual products using the "Update" button in the table.</p>
        <p class="text-sm text-gray-500">For bulk operations, use the individual stock update on each row.</p>
      </div>`,
    saveText: 'Got it',
    onSave: (close) => close()
  });
});

document.getElementById('btn-export-csv')?.addEventListener('click', () => {
  if (!currentInventory || currentInventory.length === 0) {
    return showToast('No data to export', 'warning');
  }
  const data = currentInventory.map(item => ({
    SKU: item.sku || 'N/A',
    Product: item.name,
    Category: item.category || 'N/A',
    Price: item.price || 0,
    StockLevel: item.stock || 0
  }));
  exportToCSV(data, 'InventoryList');
});

loadInventory();
