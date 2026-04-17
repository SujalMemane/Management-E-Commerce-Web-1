/**
 * ForgeAdmin — Products Page
 * Full CRUD with Firestore
 */
import { auth } from '../firebase-config.js';
import { requireAuth, populateUserUI, populateSidebarStats, fmt, showToast, openModal,
         confirmDelete, setLoading, skeletonRows, renderPagination } from '../ui-utils.js';
import { productService, categoryService, settingsService } from '../forge-api.js';

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

// ── State ─────────────────────────────────────
let currentPage = 1;
let allCategories = [];
let currentSearch = '';

// ── Load categories (for form select) ─────────
allCategories = await categoryService.getAll().catch(() => []);

// ── Render helpers ───────────────────────────
function productRow(p) {
  const stockClass = p.stock === 0 ? 'text-red-500 font-medium' : 'text-gray-600';
  return `
  <tr class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
    <td class="px-6 py-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-400">
          <i class="fa-solid ${esc(p.icon) || 'fa-box'}"></i>
        </div>
        <div>
          <p class="font-semibold text-gray-900">${esc(p.name)}</p>
          <p class="text-gray-500 text-xs">SKU: ${esc(p.sku) || '—'}</p>
        </div>
      </div>
    </td>
    <td class="px-6 py-4 text-gray-600">${esc(p.categoryName) || '—'}</td>
    <td class="px-6 py-4 font-medium text-gray-900">${fmt.currency(p.price)}</td>
    <td class="px-6 py-4 ${stockClass}">${p.stock ?? 0} in stock</td>
    <td class="px-6 py-4">
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${fmt.statusClass(p.status)}">
        <span class="w-1.5 h-1.5 rounded-full ${fmt.dotColor(p.status)}"></span>
        ${fmt.statusLabel(p.status)}
      </span>
    </td>
    <td class="px-6 py-4 text-right">
      <button onclick="editProduct('${escAttr(p.id)}')" class="text-gray-400 hover:text-brand-500 px-2 py-1 transition-colors"><i class="fa-solid fa-pen-to-square"></i></button>
      <button onclick="deleteProduct('${escAttr(p.id)}','${escAttr(p.name)}')" class="text-gray-400 hover:text-red-500 px-2 py-1 transition-colors"><i class="fa-solid fa-trash"></i></button>
    </td>
  </tr>`;
}

// ── Load & Render ────────────────────────────
async function loadProducts(page = 1) {
  currentPage = page;
  const tbody = document.getElementById('products-tbody');
  const pagination = document.getElementById('products-pagination');
  if (!tbody) return;

  tbody.innerHTML = skeletonRows(6, 5);

  try {
    const res = await productService.getAll({ search: currentSearch, page, pageSize: 10 });

    if (res.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-16 text-center text-gray-400">
        <i class="fa-solid fa-box-open text-3xl mb-3 block opacity-50"></i>
        No products yet. <button onclick="openAddProduct()" class="text-brand-500 hover:underline font-medium">Add your first product</button>
      </td></tr>`;
    } else {
      tbody.innerHTML = res.data.map(productRow).join('');
    }

    const countEl = document.getElementById('products-count');
    if (countEl) countEl.textContent = res.total;

    renderPagination('products-pagination', res, loadProducts);
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-red-500">Failed to load products</td></tr>`;
    showToast('Error loading products', 'error');
  }
}

// ── Form HTML ────────────────────────────────
function productFormHTML(p = {}) {
  const catOptions = allCategories.map(c =>
    `<option value="${c.id}" data-name="${c.name}" ${p.categoryId === c.id ? 'selected' : ''}>${c.name}</option>`
  ).join('');
  const icons = ['fa-box','fa-laptop','fa-headphones','fa-keyboard','fa-shirt','fa-couch','fa-clock','fa-tablet-screen-button','fa-gamepad','fa-dumbbell'];

  return `
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="forge-label">Product Name *</label>
          <input id="pf-name" class="forge-input" placeholder="e.g., ForgeBook Pro" value="${p.name || ''}">
        </div>
        <div>
          <label class="forge-label">SKU *</label>
          <input id="pf-sku" class="forge-input" placeholder="e.g., FB-P-2025" value="${p.sku || ''}">
        </div>
      </div>
      <div>
        <label class="forge-label">Description</label>
        <textarea id="pf-desc" class="forge-input" rows="2" placeholder="Short product description">${p.description || ''}</textarea>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="forge-label">Price ($) *</label>
          <input id="pf-price" type="number" step="0.01" min="0" class="forge-input" placeholder="0.00" value="${p.price || ''}">
        </div>
        <div>
          <label class="forge-label">Stock Quantity *</label>
          <input id="pf-stock" type="number" min="0" class="forge-input" placeholder="0" value="${p.stock ?? ''}">
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="forge-label">Category</label>
          <select id="pf-category" class="forge-input">
            <option value="">— Select category —</option>
            ${catOptions}
          </select>
        </div>
        <div>
          <label class="forge-label">Status</label>
          <select id="pf-status" class="forge-input">
            <option value="active" ${(p.status === 'active' || !p.status) ? 'selected' : ''}>Active</option>
            <option value="inactive" ${p.status === 'inactive' ? 'selected' : ''}>Inactive</option>
            <option value="out_of_stock" ${p.status === 'out_of_stock' ? 'selected' : ''}>Out of Stock</option>
          </select>
        </div>
      </div>
      <div>
        <label class="forge-label">Icon (Font Awesome class)</label>
        <div class="flex gap-2 flex-wrap mt-1">
          ${icons.map(ic => `
            <button type="button" onclick="selectIcon('${ic}', this)"
              class="icon-opt w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${p.icon === ic ? 'border-brand-500 bg-brand-50 text-brand-500' : 'border-gray-200 text-gray-400 hover:border-brand-300'}">
              <i class="fa-solid ${ic}"></i>
            </button>`).join('')}
        </div>
        <input type="hidden" id="pf-icon" value="${p.icon || 'fa-box'}">
      </div>
    </div>`;
}

window.selectIcon = (icon, btn) => {
  document.getElementById('pf-icon').value = icon;
  document.querySelectorAll('.icon-opt').forEach(b => {
    b.className = b.className.replace(/border-brand-500 bg-brand-50 text-brand-500/g, '').replace(/border-gray-200 text-gray-400/g, '');
    b.classList.add('border-gray-200', 'text-gray-400');
  });
  btn.classList.remove('border-gray-200', 'text-gray-400');
  btn.classList.add('border-brand-500', 'bg-brand-50', 'text-brand-500');
};

function collectForm() {
  const catEl = document.getElementById('pf-category');
  const catOpt = catEl?.selectedOptions[0];
  return {
    name:         document.getElementById('pf-name')?.value?.trim(),
    sku:          document.getElementById('pf-sku')?.value?.trim(),
    description:  document.getElementById('pf-desc')?.value?.trim(),
    price:        document.getElementById('pf-price')?.value,
    stock:        document.getElementById('pf-stock')?.value,
    categoryId:   catEl?.value || '',
    categoryName: catOpt?.dataset?.name || '',
    status:       document.getElementById('pf-status')?.value,
    icon:         document.getElementById('pf-icon')?.value || 'fa-box',
  };
}

// ── Add Product ──────────────────────────────
window.openAddProduct = () => {
  openModal({
    id: 'modal-product',
    title: 'Add New Product',
    content: productFormHTML(),
    saveText: '<i class="fa-solid fa-plus mr-2"></i>Add Product',
    onSave: async (close, btn) => {
      const data = collectForm();
      if (!data.name) { showToast('Product name is required', 'warning'); return; }
      if (!data.sku)  { showToast('SKU is required', 'warning'); return; }

      setLoading(btn, true);
      try {
        await productService.create(data);
        showToast('Product added successfully!');
        close();
        loadProducts(1);
      } catch (err) {
        showToast(err.message || 'Failed to add product', 'error');
        setLoading(btn, false);
      }
    }
  });
};

// ── Edit Product ─────────────────────────────
window.editProduct = async (id) => {
  const product = await productService.getById(id);
  if (!product) { showToast('Product not found', 'error'); return; }
  openModal({
    id: 'modal-product',
    title: 'Edit Product',
    content: productFormHTML(product),
    saveText: 'Save Changes',
    onSave: async (close, btn) => {
      const data = collectForm();
      if (!data.name) { showToast('Product name is required', 'warning'); return; }
      setLoading(btn, true);
      try {
        await productService.update(id, data);
        showToast('Product updated!');
        close();
        loadProducts(currentPage);
      } catch (err) {
        showToast(err.message || 'Update failed', 'error');
        setLoading(btn, false);
      }
    }
  });
};

// ── Delete Product ───────────────────────────
window.deleteProduct = (id, name) => {
  confirmDelete(`Delete "<strong>${name}</strong>"? This cannot be undone.`, async () => {
    try {
      await productService.delete(id);
      showToast('Product deleted');
      loadProducts(currentPage);
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error');
    }
  });
};

// ── Search ───────────────────────────────────
const searchInput = document.getElementById('products-search');
let searchTimer;
searchInput?.addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    currentSearch = e.target.value;
    loadProducts(1);
  }, 400);
});

// ── Add Product Button ───────────────────────
document.getElementById('btn-add-product')?.addEventListener('click', () => openAddProduct());

// ── Init ──────────────────────────────────────
loadProducts();
