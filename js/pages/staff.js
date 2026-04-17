/**
 * ForgeAdmin — Staff Page
 */
import { auth } from '../firebase-config.js';
import { requireAuth, populateUserUI, populateSidebarStats, fmt, showToast, openModal,
         confirmDelete, setLoading, skeletonCards } from '../ui-utils.js';
import { staffService, settingsService, productService } from '../forge-api.js';

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

const ROLES = ['super_admin','admin','editor','viewer'];
const roleColors = {
  super_admin: 'text-brand-600 bg-brand-50',
  admin:       'text-blue-600 bg-blue-50',
  editor:      'text-violet-600 bg-violet-50',
  viewer:      'text-gray-600 bg-gray-100'
};
const roleLabels = {
  super_admin: 'Super Admin',
  admin:       'Admin',
  editor:      'Editor',
  viewer:      'Viewer'
};

function staffCard(s) {
  const isOnline = s.onlineStatus === 'online';
  const roleColor = roleColors[s.role] || roleColors.viewer;

  return `
  <div class="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
    <div class="flex items-center gap-4 mb-6">
      <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
        ${esc(fmt.initials(s.name))}
      </div>
      <div>
        <h3 class="font-bold text-gray-900">${esc(s.name)}</h3>
        <span class="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${roleColor}">${esc(roleLabels[s.role] || s.role)}</span>
      </div>
    </div>
    <div class="space-y-2 mb-6">
      <div class="flex items-center gap-3 text-sm text-gray-500">
        <i class="fa-solid fa-envelope w-5 flex-shrink-0"></i>
        <span class="truncate">${esc(s.email)}</span>
      </div>
      <div class="flex items-center gap-3 text-sm text-gray-500">
        <i class="fa-solid fa-calendar w-5 flex-shrink-0"></i>
        Joined ${fmt.date(s.joinedAt || s.createdAt)}
      </div>
    </div>
    <div class="flex items-center justify-between pt-4 border-t border-gray-50">
      <span class="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}">
        <span class="w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}"></span>
        ${isOnline ? 'Online' : 'Offline'}
      </span>
      <div class="flex gap-2">
        <button onclick="editStaff('${escAttr(s.id)}')" class="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors">
          <i class="fa-solid fa-gear mr-1"></i>Manage
        </button>
        <button onclick="removeStaff('${escAttr(s.id)}','${escAttr(s.name)}')" class="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
          <i class="fa-solid fa-trash text-sm"></i>
        </button>
      </div>
    </div>
  </div>`;
}

function staffFormHTML(s = {}) {
  const roleOptions = ROLES.map(r =>
    `<option value="${r}" ${s.role === r ? 'selected' : ''}>${roleLabels[r]}</option>`
  ).join('');

  return `
    <div class="space-y-4">
      <div>
        <label class="forge-label">Full Name *</label>
        <input id="sf2-name" class="forge-input" placeholder="e.g., Alice Smith" value="${s.name || ''}">
      </div>
      <div>
        <label class="forge-label">Email Address *</label>
        <input id="sf2-email" type="email" class="forge-input" placeholder="alice@forgecart.com" value="${s.email || ''}">
      </div>
      <div>
        <label class="forge-label">Role *</label>
        <select id="sf2-role" class="forge-input">${roleOptions}</select>
      </div>
    </div>`;
}

async function loadStaff() {
  const grid = document.getElementById('staff-grid');
  if (!grid) return;
  grid.innerHTML = skeletonCards(2);
  try {
    const members = await staffService.getAll();
    if (!members.length) {
      grid.innerHTML = `<div class="col-span-3 py-16 text-center text-gray-400">
        <i class="fa-solid fa-user-shield text-3xl mb-3 block opacity-50"></i>
        No staff members yet.
      </div>`;
    } else {
      grid.innerHTML = members.map(staffCard).join('');
    }
  } catch (err) {
    console.error(err);
    showToast('Error loading staff', 'error');
  }
}

window.editStaff = async (id) => {
  const staff = await staffService.getById(id);
  if (!staff) { showToast('Staff member not found', 'error'); return; }
  openModal({
    id: 'modal-staff', title: 'Manage Staff Member',
    content: staffFormHTML(staff),
    saveText: 'Save Changes',
    onSave: async (close, btn) => {
      const data = {
        name:  document.getElementById('sf2-name')?.value?.trim(),
        email: document.getElementById('sf2-email')?.value?.trim(),
        role:  document.getElementById('sf2-role')?.value
      };
      if (!data.name) { showToast('Name is required', 'warning'); return; }
      setLoading(btn, true);
      try {
        await staffService.update(id, data);
        showToast('Staff member updated!');
        close(); loadStaff();
      } catch (err) {
        showToast(err.message || 'Update failed', 'error');
        setLoading(btn, false);
      }
    }
  });
};

window.removeStaff = (id, name) => {
  if (id === user.uid) { showToast("You can't remove yourself!", 'warning'); return; }
  confirmDelete(`Remove staff member "<strong>${name}</strong>"?`, async () => {
    try {
      await staffService.delete(id);
      showToast('Staff member removed');
      loadStaff();
    } catch (err) { showToast(err.message || 'Delete failed', 'error'); }
  });
};

window.openAddStaff = () => {
  openModal({
    id: 'modal-staff', title: 'Add Staff Member',
    content: staffFormHTML(),
    saveText: '<i class="fa-solid fa-plus mr-2"></i>Add Member',
    onSave: async (close, btn) => {
      const data = {
        name:  document.getElementById('sf2-name')?.value?.trim(),
        email: document.getElementById('sf2-email')?.value?.trim(),
        role:  document.getElementById('sf2-role')?.value
      };
      if (!data.name)  { showToast('Name is required', 'warning'); return; }
      if (!data.email) { showToast('Email is required', 'warning'); return; }
      setLoading(btn, true);
      try {
        await staffService.create(data);
        showToast('Staff member added!');
        close(); loadStaff();
      } catch (err) {
        showToast(err.message || 'Failed to add staff', 'error');
        setLoading(btn, false);
      }
    }
  });
};

document.getElementById('btn-add-staff')?.addEventListener('click', () => openAddStaff());
loadStaff();
