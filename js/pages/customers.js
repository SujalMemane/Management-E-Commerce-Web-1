/**
 * ForgeAdmin — Customers Page
 */
import { auth } from '../firebase-config.js';
import { requireAuth, populateUserUI, populateSidebarStats, fmt, showToast, openModal,
         confirmDelete, setLoading, skeletonCards, renderPagination } from '../ui-utils.js';
import { customerService, settingsService, productService } from '../forge-api.js';

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

const avatarColors = ['blue','emerald','purple','rose','amber','indigo','teal','orange'];
function colorFor(i) { return avatarColors[i % avatarColors.length]; }

let currentPage  = 1;
let currentSearch = '';

function customerCard(c, idx) {
  const col = colorFor(idx);
  return `
  <div class="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
    <div class="flex justify-between items-start mb-4">
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 rounded-full bg-gradient-to-br from-${col}-400 to-${col}-600 text-white flex items-center justify-center text-xl font-bold shadow-md flex-shrink-0">
          ${esc(fmt.initials(c.name))}
        </div>
        <div>
          <h3 class="font-bold text-gray-900">${esc(c.name)}</h3>
          <p class="text-sm text-gray-500">${esc(c.location) || '—'}</p>
        </div>
      </div>
      <div class="flex gap-1">
        <button onclick="editCustomer('${escAttr(c.id)}')" class="p-1.5 text-gray-400 hover:text-brand-500 transition-colors"><i class="fa-solid fa-pen-to-square text-sm"></i></button>
        <button onclick="removeCustomer('${escAttr(c.id)}','${escAttr(c.name)}')" class="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><i class="fa-solid fa-trash text-sm"></i></button>
      </div>
    </div>
    <div class="space-y-2 mb-5">
      <div class="flex items-center text-sm text-gray-600 gap-2">
        <i class="fa-regular fa-envelope w-4 text-gray-400 flex-shrink-0"></i>
        <span class="truncate">${esc(c.email) || '—'}</span>
      </div>
      <div class="flex items-center text-sm text-gray-600 gap-2">
        <i class="fa-solid fa-phone w-4 text-gray-400 flex-shrink-0"></i>
        ${esc(c.phone) || '—'}
      </div>
    </div>
    <div class="flex items-center justify-between pt-4 border-t border-gray-100">
      <div>
        <p class="text-xs text-gray-500 mb-1">Total Spent</p>
        <p class="font-semibold text-gray-900">${fmt.currency(c.totalSpent)}</p>
      </div>
      <div class="w-px h-8 bg-gray-100"></div>
      <div>
        <p class="text-xs text-gray-500 mb-1">Orders</p>
        <p class="font-semibold text-gray-900">${c.orderCount || 0}</p>
      </div>
      <div class="w-px h-8 bg-gray-100"></div>
      <p class="text-xs text-gray-500">
        Since ${fmt.date(c.createdAt)}
      </p>
    </div>
  </div>`;
}

function customerFormHTML(c = {}) {
  return `
    <div class="space-y-4">
      <div>
        <label class="forge-label">Full Name *</label>
        <input id="cuf-name" class="forge-input" placeholder="e.g., Sarah Jenkins" value="${c.name || ''}">
      </div>
      <div>
        <label class="forge-label">Email Address *</label>
        <input id="cuf-email" type="email" class="forge-input" placeholder="sarah@example.com" value="${c.email || ''}">
      </div>
      <div>
        <label class="forge-label">Phone</label>
        <input id="cuf-phone" class="forge-input" placeholder="(555) 123-4567" value="${c.phone || ''}">
      </div>
      <div>
        <label class="forge-label">Location</label>
        <input id="cuf-location" class="forge-input" placeholder="Detroit, MI" value="${c.location || ''}">
      </div>
    </div>`;
}

function collectCustomerForm() {
  return {
    name:     document.getElementById('cuf-name')?.value?.trim(),
    email:    document.getElementById('cuf-email')?.value?.trim(),
    phone:    document.getElementById('cuf-phone')?.value?.trim(),
    location: document.getElementById('cuf-location')?.value?.trim()
  };
}

async function loadCustomers(page = 1) {
  currentPage = page;
  const grid = document.getElementById('customers-grid');
  if (!grid) return;
  grid.innerHTML = skeletonCards(3);

  try {
    const res = await customerService.getAll({ search: currentSearch, page, pageSize: 12 });
    if (!res.data.length) {
      grid.innerHTML = `<div class="col-span-3 text-center py-16 text-gray-400">
        <i class="fa-solid fa-users text-3xl mb-3 block opacity-50"></i>
        No customers yet. <button onclick="openAddCustomer()" class="text-brand-500 hover:underline">Add your first customer</button>
      </div>`;
    } else {
      grid.innerHTML = res.data.map((c, i) => customerCard(c, i)).join('');
    }
    renderPagination('customers-pagination', res, loadCustomers);
  } catch (err) {
    console.error(err);
    showToast('Error loading customers', 'error');
  }
}

window.openAddCustomer = () => {
  openModal({
    id: 'modal-customer', title: 'Add Customer',
    content: customerFormHTML(),
    saveText: '<i class="fa-solid fa-user-plus mr-2"></i>Add Customer',
    onSave: async (close, btn) => {
      const data = collectCustomerForm();
      if (!data.name)  { showToast('Name is required', 'warning'); return; }
      if (!data.email) { showToast('Email is required', 'warning'); return; }
      setLoading(btn, true);
      try {
        await customerService.create(data);
        showToast('Customer added!');
        close(); loadCustomers(1);
      } catch (err) {
        showToast(err.message || 'Failed to add customer', 'error');
        setLoading(btn, false);
      }
    }
  });
};

window.editCustomer = async (id) => {
  const customer = await customerService.getById(id);
  if (!customer) { showToast('Customer not found', 'error'); return; }
  openModal({
    id: 'modal-customer', title: 'Edit Customer',
    content: customerFormHTML(customer),
    saveText: 'Save Changes',
    onSave: async (close, btn) => {
      const data = collectCustomerForm();
      if (!data.name) { showToast('Name is required', 'warning'); return; }
      setLoading(btn, true);
      try {
        await customerService.update(id, data);
        showToast('Customer updated!');
        close(); loadCustomers(currentPage);
      } catch (err) {
        showToast(err.message || 'Update failed', 'error');
        setLoading(btn, false);
      }
    }
  });
};

window.removeCustomer = (id, name) => {
  confirmDelete(`Remove customer "<strong>${name}</strong>"?`, async () => {
    try {
      await customerService.delete(id);
      showToast('Customer removed');
      loadCustomers(currentPage);
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error');
    }
  });
};

document.getElementById('btn-add-customer')?.addEventListener('click', () => openAddCustomer());

const searchInput = document.getElementById('customers-search');
let timer;
searchInput?.addEventListener('input', (e) => {
  clearTimeout(timer);
  timer = setTimeout(() => { currentSearch = e.target.value; loadCustomers(1); }, 400);
});

loadCustomers();
