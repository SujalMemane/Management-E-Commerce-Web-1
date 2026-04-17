/**
 * ForgeAdmin — Promotions Page
 */
import { auth } from '../firebase-config.js';
import { requireAuth, populateUserUI, populateSidebarStats, fmt, showToast, openModal,
         confirmDelete, setLoading, skeletonRows } from '../ui-utils.js';
import { promotionService, settingsService, productService } from '../forge-api.js';

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

async function loadStats() {
  try {
    const stats = await promotionService.getStats();
    const el = (id) => document.getElementById(id);
    if (el('prom-active'))  el('prom-active').textContent  = stats.activeCoupons;
    if (el('prom-usage'))   el('prom-usage').textContent   = fmt.number(stats.totalUsage);
    if (el('prom-savings')) el('prom-savings').textContent = fmt.currency(stats.totalSavings);
  } catch (e) { console.error(e); }
}

function promoRow(p) {
  const expiry = p.expiryDate
    ? `<span class="${new Date(p.expiryDate) < new Date() ? 'text-red-500' : 'text-gray-500'}">${fmt.date(p.expiryDate)}</span>`
    : '<span class="text-gray-400">No Expiry</span>';
  const usage = p.maxUsage ? `${p.currentUsage}/${p.maxUsage}` : fmt.number(p.currentUsage);
  const discLabel = p.discountType === 'percentage' ? `${p.discountValue}% OFF` : `${fmt.currency(p.discountValue)} Flat`;

  return `
  <tr class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
    <td class="px-6 py-4">
      <span class="px-3 py-1.5 bg-brand-50 text-brand-700 font-bold border border-brand-100 rounded-lg tracking-wider">${esc(p.code)}</span>
    </td>
    <td class="px-6 py-4 font-bold text-gray-900">${esc(discLabel)}</td>
    <td class="px-6 py-4">${expiry}</td>
    <td class="px-6 py-4 font-medium text-gray-900">${usage}</td>
    <td class="px-6 py-4">
      <span class="px-2.5 py-1 text-xs font-bold rounded-full ${fmt.statusClass(p.status)}">${fmt.statusLabel(p.status)}</span>
    </td>
    <td class="px-6 py-4 text-right flex justify-end gap-2">
      <button onclick="editPromotion('${escAttr(p.id)}')" class="text-gray-400 hover:text-brand-500 px-2 transition-colors"><i class="fa-solid fa-pen"></i></button>
      <button onclick="removePromotion('${escAttr(p.id)}','${escAttr(p.code)}')" class="text-gray-400 hover:text-red-500 px-2 transition-colors"><i class="fa-solid fa-trash"></i></button>
    </td>
  </tr>`;
}

function promoFormHTML(p = {}) {
  return `
    <div class="space-y-4">
      <div>
        <label class="forge-label">Coupon Code *</label>
        <input id="prf-code" class="forge-input font-mono tracking-wider" placeholder="e.g., SUMMER25"
          value="${p.code || ''}" ${p.id ? 'readonly class="forge-input font-mono tracking-wider bg-gray-50"' : ''}>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="forge-label">Discount Type *</label>
          <select id="prf-type" class="forge-input" onchange="updateDiscountLabel(this.value)">
            <option value="percentage" ${p.discountType === 'percentage' || !p.discountType ? 'selected' : ''}>Percentage (%)</option>
            <option value="flat" ${p.discountType === 'flat' ? 'selected' : ''}>Flat Amount ($)</option>
          </select>
        </div>
        <div>
          <label class="forge-label" id="disc-label">Discount Value *</label>
          <input id="prf-value" type="number" min="0" step="0.01" class="forge-input"
            placeholder="${p.discountType === 'flat' ? '10.00' : '25'}" value="${p.discountValue || ''}">
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="forge-label">Expiry Date</label>
          <input id="prf-expiry" type="date" class="forge-input" value="${p.expiryDate || ''}">
        </div>
        <div>
          <label class="forge-label">Max Usage</label>
          <input id="prf-max-usage" type="number" min="0" class="forge-input"
            placeholder="Leave blank for unlimited" value="${p.maxUsage || ''}">
        </div>
      </div>
      <div>
        <label class="forge-label">Status</label>
        <select id="prf-status" class="forge-input">
          <option value="active" ${(!p.status || p.status === 'active') ? 'selected' : ''}>Active</option>
          <option value="inactive" ${p.status === 'inactive' ? 'selected' : ''}>Inactive</option>
        </select>
      </div>
    </div>`;
}

window.updateDiscountLabel = (type) => {
  const el = document.getElementById('disc-label');
  if (el) el.textContent = type === 'percentage' ? 'Percentage (%)' : 'Flat Amount ($)';
};

function collectPromoForm() {
  return {
    code:          document.getElementById('prf-code')?.value?.trim(),
    discountType:  document.getElementById('prf-type')?.value,
    discountValue: document.getElementById('prf-value')?.value,
    expiryDate:    document.getElementById('prf-expiry')?.value || null,
    maxUsage:      document.getElementById('prf-max-usage')?.value || null,
    status:        document.getElementById('prf-status')?.value
  };
}

async function loadPromotions() {
  const tbody = document.getElementById('promotions-tbody');
  if (!tbody) return;
  tbody.innerHTML = skeletonRows(6, 3);

  try {
    const promos = await promotionService.getAll();
    if (!promos.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-16 text-center text-gray-400">
        <i class="fa-solid fa-ticket text-3xl mb-3 block opacity-50"></i>
        No coupons yet. <button onclick="openAddPromotion()" class="text-brand-500 hover:underline">Create one</button>
      </td></tr>`;
    } else {
      tbody.innerHTML = promos.map(promoRow).join('');
    }
  } catch (err) {
    console.error(err);
    showToast('Error loading promotions', 'error');
  }
}

window.openAddPromotion = () => {
  openModal({
    id: 'modal-promotion', title: 'Create Coupon',
    content: promoFormHTML(),
    saveText: '<i class="fa-solid fa-plus mr-2"></i>Create Coupon',
    onSave: async (close, btn) => {
      const data = collectPromoForm();
      if (!data.code)          { showToast('Coupon code is required', 'warning'); return; }
      if (!data.discountValue) { showToast('Discount value is required', 'warning'); return; }
      setLoading(btn, true);
      try {
        await promotionService.create(data);
        showToast('Coupon created!');
        close(); loadPromotions(); loadStats();
      } catch (err) {
        showToast(err.message || 'Failed to create coupon', 'error');
        setLoading(btn, false);
      }
    }
  });
};

window.editPromotion = async (id) => {
  const promo = await promotionService.getById(id);
  if (!promo) { showToast('Promotion not found', 'error'); return; }
  openModal({
    id: 'modal-promotion', title: `Edit ${promo.code}`,
    content: promoFormHTML(promo),
    saveText: 'Save Changes',
    onSave: async (close, btn) => {
      const data = collectPromoForm();
      setLoading(btn, true);
      try {
        await promotionService.update(id, data);
        showToast('Coupon updated!');
        close(); loadPromotions(); loadStats();
      } catch (err) {
        showToast(err.message || 'Update failed', 'error');
        setLoading(btn, false);
      }
    }
  });
};

window.removePromotion = (id, code) => {
  confirmDelete(`Delete coupon "<strong>${code}</strong>"?`, async () => {
    try {
      await promotionService.delete(id);
      showToast('Coupon deleted');
      loadPromotions(); loadStats();
    } catch (err) { showToast(err.message || 'Delete failed', 'error'); }
  });
};

document.getElementById('btn-create-coupon')?.addEventListener('click', () => openAddPromotion());
loadStats();
loadPromotions();
