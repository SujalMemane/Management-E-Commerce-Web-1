/**
 * ForgeAdmin — UI Utilities
 * Toast, Modal, Auth Guard, Formatters, Pagination
 */

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ═══════════════════════════════════════════════════════════════
// FORMATTERS
// ═══════════════════════════════════════════════════════════════
export const fmt = {
  currency(n) {
    return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
  number(n) {
    return Number(n || 0).toLocaleString('en-US');
  },
  escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },
  escapeAttr(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },
  date(ts) {
    const d = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : new Date();
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },
  dateTime(ts) {
    const d = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : new Date();
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  },
  initials(name) {
    return (name || 'NA').split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
  },
  percent(n) {
    return `${Number(n || 0).toFixed(1)}%`;
  },
  statusLabel(status) {
    const map = {
      active: 'Active', inactive: 'Inactive', hidden: 'Hidden',
      out_of_stock: 'Out of Stock', pending: 'Pending',
      processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered',
      completed: 'Completed', cancelled: 'Cancelled', refunded: 'Refunded',
      approved: 'Approved', rejected: 'Rejected'
    };
    return map[status] || status;
  },
  statusClass(status) {
    const map = {
      active:       'bg-emerald-50 text-emerald-600 border-emerald-100',
      completed:    'bg-emerald-50 text-emerald-600 border-emerald-100',
      approved:     'bg-emerald-50 text-emerald-600 border-emerald-100',
      inactive:     'bg-gray-100 text-gray-500 border-gray-200',
      rejected:     'bg-red-50 text-red-600 border-red-100',
      out_of_stock: 'bg-red-50 text-red-600 border-red-100',
      cancelled:    'bg-red-50 text-red-600 border-red-100',
      hidden:       'bg-amber-50 text-amber-600 border-amber-100',
      pending:      'bg-blue-50 text-blue-600 border-blue-100',
      processing:   'bg-purple-50 text-purple-600 border-purple-100',
      shipped:      'bg-indigo-50 text-indigo-600 border-indigo-100',
      delivered:    'bg-teal-50 text-teal-600 border-teal-100',
      refunded:     'bg-orange-50 text-orange-600 border-orange-100',
    };
    return map[status?.toLowerCase()] || 'bg-gray-100 text-gray-600 border-gray-200';
  },
  dotColor(status) {
    const map = {
      active: 'bg-emerald-500', completed: 'bg-emerald-500', approved: 'bg-emerald-500',
      out_of_stock: 'bg-red-500', cancelled: 'bg-red-500', rejected: 'bg-red-500',
      hidden: 'bg-amber-500', pending: 'bg-blue-500', processing: 'bg-purple-500',
    };
    return map[status?.toLowerCase()] || 'bg-gray-400';
  }
};

// ═══════════════════════════════════════════════════════════════
// TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════
function ensureToastContainer() {
  let c = document.getElementById('forge-toasts');
  if (!c) {
    c = document.createElement('div');
    c.id = 'forge-toasts';
    c.style.cssText = 'position:fixed;bottom:1.25rem;right:1.25rem;z-index:9999;display:flex;flex-direction:column;gap:0.5rem;pointer-events:none;';
    document.body.appendChild(c);
  }
  return c;
}

export function showToast(message, type = 'success', duration = 3500) {
  const container = ensureToastContainer();
  const icons  = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
  const colors = {
    success: 'border-l-4 border-emerald-500',
    error:   'border-l-4 border-red-500',
    warning: 'border-l-4 border-amber-500',
    info:    'border-l-4 border-blue-500'
  };
  const iconColors = { success: 'text-emerald-500', error: 'text-red-500', warning: 'text-amber-500', info: 'text-blue-500' };

  const toast = document.createElement('div');
  toast.style.cssText = 'pointer-events:auto;display:flex;align-items:center;gap:0.75rem;background:white;border-radius:0.75rem;padding:0.875rem 1rem;box-shadow:0 10px 25px rgba(0,0,0,0.12);font-size:0.875rem;font-weight:500;color:#374151;transition:all 0.35s ease;transform:translateX(2rem);opacity:0;min-width:260px;max-width:340px;';
  toast.className = colors[type] || colors.info;
  toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info} ${iconColors[type]} flex-shrink-0"></i><span>${message}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity   = '1';
    });
  });

  setTimeout(() => {
    toast.style.transform = 'translateX(2rem)';
    toast.style.opacity   = '0';
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

// ═══════════════════════════════════════════════════════════════
// BUTTON LOADING STATE (with double-submit prevention)
// ═══════════════════════════════════════════════════════════════
export function setLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    if (btn.disabled) return; // Prevent double-submit
    btn._orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Saving...';
  } else {
    btn.disabled = false;
    if (btn._orig) btn.innerHTML = btn._orig;
  }
}

// Debounce utility for search inputs
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ═══════════════════════════════════════════════════════════════
// TABLE SKELETON LOADER
// ═══════════════════════════════════════════════════════════════
export function skeletonRows(cols = 6, rows = 5) {
  return Array.from({ length: rows }, () =>
    `<tr>${Array.from({ length: cols }, () =>
      `<td class="px-6 py-4"><div class="h-4 bg-gray-100 rounded animate-pulse"></div></td>`
    ).join('')}</tr>`
  ).join('');
}

export function skeletonCards(count = 3) {
  return Array.from({ length: count }, () =>
    `<div class="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div class="h-14 w-14 bg-gray-100 rounded-2xl animate-pulse mb-4"></div>
      <div class="h-5 bg-gray-100 rounded animate-pulse mb-2 w-3/4"></div>
      <div class="h-4 bg-gray-100 rounded animate-pulse w-1/2"></div>
    </div>`
  ).join('');
}

// ═══════════════════════════════════════════════════════════════
// MODAL SYSTEM
// ═══════════════════════════════════════════════════════════════
export function openModal({ id, title, content, onSave, saveText = 'Save Changes', danger = false }) {
  closeModal(id);

  const saveCls = danger
    ? 'px-5 py-2.5 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 transition-colors'
    : 'px-5 py-2.5 bg-brand-500 text-white text-sm font-medium rounded-xl hover:bg-brand-600 transition-colors shadow-sm shadow-brand-500/30';

  const el = document.createElement('div');
  el.id = id;
  el.style.cssText = 'position:fixed;inset:0;z-index:500;display:flex;align-items:center;justify-content:center;padding:1rem;';
  el.innerHTML = `
    <div data-backdrop class="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"></div>
    <div class="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl" style="animation:fadeIn .2s ease-out;max-height:90vh;display:flex;flex-direction:column;">
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
        <h3 class="font-bold text-gray-900 text-lg">${title}</h3>
        <button data-close class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="p-6 overflow-y-auto flex-1">${content}</div>
      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex-shrink-0">
        <button data-cancel class="px-5 py-2.5 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
        <button data-save class="${saveCls}">${saveText}</button>
      </div>
    </div>`;
  document.body.appendChild(el);

  const close = () => closeModal(id);
  el.querySelector('[data-backdrop]').onclick = close;
  el.querySelector('[data-close]').onclick     = close;
  el.querySelector('[data-cancel]').onclick    = close;

  if (onSave) {
    el.querySelector('[data-save]').onclick = () => onSave(close, el.querySelector('[data-save]'));
  }
  return { el, close };
}

export function closeModal(id) {
  document.getElementById(id)?.remove();
}

// ═══════════════════════════════════════════════════════════════
// CONFIRM DIALOG
// ═══════════════════════════════════════════════════════════════
export function confirmDelete(message, onConfirm) {
  openModal({
    id: 'confirm-dialog-' + Date.now(),
    title: 'Confirm Delete',
    content: `<p class="text-gray-600 text-sm">${message}</p>`,
    saveText: 'Delete',
    danger: true,
    onSave: (close) => { onConfirm(); close(); }
  });
}

// ═══════════════════════════════════════════════════════════════
// PAGINATION
// ═══════════════════════════════════════════════════════════════
export function renderPagination(containerId, { page, totalPages, total, pageSize }, onPageChange) {
  const el = document.getElementById(containerId);
  if (!el || totalPages <= 0) return;

  const from = Math.min((page - 1) * pageSize + 1, total);
  const to   = Math.min(page * pageSize, total);

  const pages = [];
  const range = 2;
  for (let i = Math.max(1, page - range); i <= Math.min(totalPages, page + range); i++) {
    pages.push(i);
  }

  el.innerHTML = `
    <div class="text-sm text-gray-500">Showing ${from}–${to} of ${fmt.number(total)}</div>
    <div class="flex gap-1">
      <button onclick="window._pageChange(${page - 1})" ${page <= 1 ? 'disabled' : ''}
        class="px-3 py-1 border border-gray-200 rounded text-sm ${page <= 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}">Prev</button>
      ${pages.map(p => `
        <button onclick="window._pageChange(${p})"
          class="px-3 py-1 border rounded text-sm ${p === page ? 'bg-brand-50 border-brand-200 text-brand-600 font-medium' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}">${p}</button>
      `).join('')}
      <button onclick="window._pageChange(${page + 1})" ${page >= totalPages ? 'disabled' : ''}
        class="px-3 py-1 border border-gray-200 rounded text-sm ${page >= totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}">Next</button>
    </div>`;

  window._pageChange = onPageChange;
}

// ═══════════════════════════════════════════════════════════════
// AUTH GUARD
// ═══════════════════════════════════════════════════════════════
export function requireAuth(auth, redirectPath = '../index.html') {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      if (!user) {
        window.location.href = redirectPath;
      } else {
        resolve(user);
      }
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// POPULATE USER IN SIDEBAR/HEADER
// ═══════════════════════════════════════════════════════════════
export function populateUserUI(user, profileData = null) {
  const name     = profileData?.name || user.displayName || user.email?.split('@')[0] || 'Admin';
  const email    = profileData?.email || user.email || '';
  const initials = fmt.initials(name);
  const role     = profileData?.role || 'Administrator';

  document.querySelectorAll('[data-user-initials]').forEach(el => el.textContent = initials);
  document.querySelectorAll('[data-user-name]').forEach(el => el.textContent = name);
  document.querySelectorAll('[data-user-email]').forEach(el => el.textContent = email);
  document.querySelectorAll('[data-user-role]').forEach(el => el.textContent = role);
}

// ═══════════════════════════════════════════════════════════════
// POPULATE SIDEBAR PRODUCT COUNT
// ═══════════════════════════════════════════════════════════════
export async function populateSidebarStats(productService) {
  try {
    const count = await productService.getCount();
    const el = document.getElementById('sidebar-product-count');
    if (el) el.textContent = count;
  } catch (e) {
    console.warn('Could not load sidebar product count');
  }
}
