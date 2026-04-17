/**
 * ForgeAdmin — Categories Page
 */
import { auth } from '../firebase-config.js';
import { requireAuth, populateUserUI, populateSidebarStats, fmt, showToast, openModal,
         confirmDelete, setLoading, skeletonCards } from '../ui-utils.js';
import { categoryService, settingsService, productService } from '../forge-api.js';

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

const iconColors = ['brand', 'blue', 'emerald', 'violet', 'amber', 'rose', 'indigo', 'teal'];
function colorFor(i) { return iconColors[i % iconColors.length]; }

function categoryCard(cat, idx) {
  const c = colorFor(idx);
  return `
  <div class="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow group">
    <div class="flex items-center justify-between mb-6">
      <div class="w-14 h-14 bg-${c}-50 rounded-2xl flex items-center justify-center text-${c}-500 group-hover:bg-${c}-500 group-hover:text-white transition-colors">
        <i class="fa-solid ${esc(cat.icon) || 'fa-tags'} text-2xl"></i>
      </div>
      <div class="flex gap-1">
        <button onclick="editCategory('${escAttr(cat.id)}')" class="p-2 text-gray-400 hover:text-brand-500 transition-colors"><i class="fa-solid fa-pen-to-square text-sm"></i></button>
        <button onclick="removeCategory('${escAttr(cat.id)}','${escAttr(cat.name)}')" class="p-2 text-gray-400 hover:text-red-500 transition-colors"><i class="fa-solid fa-trash text-sm"></i></button>
      </div>
    </div>
    <h3 class="font-bold text-lg text-gray-900 mb-1">${esc(cat.name)}</h3>
    <p class="text-sm text-gray-500 mb-6 line-clamp-2">${esc(cat.description) || 'No description'}</p>
    <div class="flex items-center justify-between pt-6 border-t border-gray-50">
      <div>
        <p class="text-xs text-gray-400 uppercase font-bold tracking-wider">Products</p>
        <p class="font-bold text-gray-900">${cat.productCount ?? 0}</p>
      </div>
      <span class="px-3 py-1 text-xs font-bold rounded-full ${fmt.statusClass(cat.status)}">${fmt.statusLabel(cat.status)}</span>
    </div>
  </div>`;
}

function categoryFormHTML(cat = {}) {
  const icons = ['fa-tags','fa-laptop','fa-shirt','fa-couch','fa-headphones','fa-keyboard','fa-clock','fa-gamepad','fa-dumbbell','fa-book'];
  return `
    <div class="space-y-4">
      <div>
        <label class="forge-label">Category Name *</label>
        <input id="cf-name" class="forge-input" placeholder="e.g., Electronics" value="${cat.name || ''}">
      </div>
      <div>
        <label class="forge-label">Description</label>
        <textarea id="cf-desc" class="forge-input" rows="2" placeholder="Brief description">${cat.description || ''}</textarea>
      </div>
      <div>
        <label class="forge-label">Status</label>
        <select id="cf-status" class="forge-input">
          <option value="active" ${(!cat.status || cat.status === 'active') ? 'selected' : ''}>Active</option>
          <option value="hidden" ${cat.status === 'hidden' ? 'selected' : ''}>Hidden</option>
        </select>
      </div>
      <div>
        <label class="forge-label">Icon</label>
        <div class="flex gap-2 flex-wrap mt-1">
          ${icons.map(ic => `
            <button type="button" onclick="selectCatIcon('${ic}',this)"
              class="cat-icon-opt w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${cat.icon === ic ? 'border-brand-500 bg-brand-50 text-brand-500' : 'border-gray-200 text-gray-400 hover:border-brand-300'}">
              <i class="fa-solid ${ic}"></i>
            </button>`).join('')}
        </div>
        <input type="hidden" id="cf-icon" value="${cat.icon || 'fa-tags'}">
      </div>
    </div>`;
}

window.selectCatIcon = (icon, btn) => {
  document.getElementById('cf-icon').value = icon;
  document.querySelectorAll('.cat-icon-opt').forEach(b => {
    b.classList.remove('border-brand-500','bg-brand-50','text-brand-500');
    b.classList.add('border-gray-200','text-gray-400');
  });
  btn.classList.remove('border-gray-200','text-gray-400');
  btn.classList.add('border-brand-500','bg-brand-50','text-brand-500');
};

async function loadCategories() {
  const grid = document.getElementById('categories-grid');
  if (!grid) return;
  grid.innerHTML = skeletonCards(3);
  try {
    const cats = await categoryService.getAll();
    if (!cats.length) {
      grid.innerHTML = `<div class="col-span-3 text-center py-16 text-gray-400">
        <i class="fa-solid fa-tags text-3xl mb-3 block opacity-50"></i>
        No categories yet. <button onclick="openAddCategory()" class="text-brand-500 hover:underline font-medium">Add one</button>
      </div>`;
    } else {
      grid.innerHTML = cats.map((c, i) => categoryCard(c, i)).join('');
    }
  } catch (err) {
    console.error(err);
    showToast('Error loading categories', 'error');
  }
}

window.openAddCategory = () => {
  openModal({
    id: 'modal-category', title: 'Add New Category',
    content: categoryFormHTML(),
    saveText: '<i class="fa-solid fa-plus mr-2"></i>Add Category',
    onSave: async (close, btn) => {
      const data = {
        name: document.getElementById('cf-name')?.value?.trim(),
        description: document.getElementById('cf-desc')?.value?.trim(),
        status: document.getElementById('cf-status')?.value,
        icon: document.getElementById('cf-icon')?.value || 'fa-tags'
      };
      if (!data.name) { showToast('Category name is required', 'warning'); return; }
      setLoading(btn, true);
      try {
        await categoryService.create(data);
        showToast('Category created!');
        close(); loadCategories();
      } catch (err) {
        showToast(err.message || 'Failed to create category', 'error');
        setLoading(btn, false);
      }
    }
  });
};

window.editCategory = async (id) => {
  const cat = await categoryService.getById(id);
  if (!cat) { showToast('Category not found', 'error'); return; }
  openModal({
    id: 'modal-category', title: 'Edit Category',
    content: categoryFormHTML(cat),
    saveText: 'Save Changes',
    onSave: async (close, btn) => {
      const data = {
        name: document.getElementById('cf-name')?.value?.trim(),
        description: document.getElementById('cf-desc')?.value?.trim(),
        status: document.getElementById('cf-status')?.value,
        icon: document.getElementById('cf-icon')?.value || 'fa-tags'
      };
      if (!data.name) { showToast('Category name is required', 'warning'); return; }
      setLoading(btn, true);
      try {
        await categoryService.update(id, data);
        showToast('Category updated!');
        close(); loadCategories();
      } catch (err) {
        showToast(err.message || 'Update failed', 'error');
        setLoading(btn, false);
      }
    }
  });
};

window.removeCategory = (id, name) => {
  confirmDelete(`Delete category "<strong>${name}</strong>"?`, async () => {
    try {
      await categoryService.delete(id);
      showToast('Category deleted');
      loadCategories();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
};

document.getElementById('btn-add-category')?.addEventListener('click', () => openAddCategory());
loadCategories();
