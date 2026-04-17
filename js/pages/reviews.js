/**
 * ForgeAdmin — Reviews Page
 */
import { auth } from '../firebase-config.js';
import { requireAuth, populateUserUI, populateSidebarStats, fmt, showToast, confirmDelete } from '../ui-utils.js';
import { reviewService, settingsService, productService } from '../forge-api.js';

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

function starsHTML(rating) {
  return Array.from({ length: 5 }, (_, i) =>
    `<i class="fa-${i < rating ? 'solid' : 'regular'} fa-star"></i>`
  ).join('');
}

function reviewCard(r) {
  const isPending  = r.moderationStatus === 'pending' || !r.moderationStatus;
  const isRejected = r.moderationStatus === 'rejected';

  const actionHTML = isPending
    ? `<button onclick="approveReview('${escAttr(r.id)}')" class="px-4 py-2 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-lg hover:bg-emerald-100 transition-colors">
        <i class="fa-solid fa-check mr-1"></i>Approve</button>
       <button onclick="rejectReview('${escAttr(r.id)}')" class="px-4 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 transition-colors">
        <i class="fa-solid fa-xmark mr-1"></i>Reject</button>`
    : `<span class="inline-block px-3 py-1 text-xs font-bold rounded-full ${fmt.statusClass(r.moderationStatus)}">${fmt.statusLabel(r.moderationStatus)}</span>`;

  return `
  <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm ${isRejected ? 'opacity-60' : ''}">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600">
          ${esc(fmt.initials(r.customerName))}
        </div>
        <div>
          <h4 class="font-bold text-gray-900">${esc(r.customerName) || 'Anonymous'}</h4>
          <p class="text-xs text-gray-400">${fmt.date(r.createdAt)}</p>
        </div>
      </div>
      <div class="flex items-center gap-1 text-amber-400">
        ${starsHTML(r.rating || 0)}
        <span class="text-sm text-gray-500 ml-1">(${r.rating}/5)</span>
      </div>
    </div>
    <div class="bg-gray-50 p-4 rounded-xl mb-4 border border-gray-100">
      <p class="text-sm font-bold text-gray-700 mb-1">
        Product: <span class="text-brand-600">${esc(r.productName) || '—'}</span>
      </p>
      <p class="text-sm text-gray-600">"${esc(r.content) || 'No review text'}"</p>
    </div>
    <div class="flex items-center gap-3">
      ${actionHTML}
      <button onclick="deleteReview('${escAttr(r.id)}')" class="ml-auto p-2 text-gray-300 hover:text-red-500 transition-colors">
        <i class="fa-solid fa-trash text-sm"></i>
      </button>
    </div>
  </div>`;
}

async function loadReviews(filterStatus = '') {
  const list = document.getElementById('reviews-list');
  if (!list) return;
  list.innerHTML = `<div class="col-span-1 text-center py-8 text-gray-400"><i class="fa-solid fa-spinner fa-spin text-2xl"></i></div>`;

  try {
    const reviews = await reviewService.getAll({ moderationStatus: filterStatus });
    if (!reviews.length) {
      list.innerHTML = `<div class="text-center py-16 text-gray-400">
        <i class="fa-solid fa-star text-3xl mb-3 block opacity-50"></i>No reviews found.
      </div>`;
    } else {
      list.innerHTML = `<div class="grid grid-cols-1 gap-6">${reviews.map(reviewCard).join('')}</div>`;
    }
  } catch (err) {
    console.error(err);
    showToast('Error loading reviews', 'error');
  }
}

window.approveReview = async (id) => {
  try {
    await reviewService.approve(id);
    showToast('Review approved!');
    loadReviews();
  } catch (err) { showToast(err.message || 'Failed to approve', 'error'); }
};

window.rejectReview = async (id) => {
  try {
    await reviewService.reject(id);
    showToast('Review rejected', 'info');
    loadReviews();
  } catch (err) { showToast(err.message || 'Failed to reject', 'error'); }
};

window.deleteReview = (id) => {
  confirmDelete('Delete this review permanently?', async () => {
    try {
      await reviewService.delete(id);
      showToast('Review deleted');
      loadReviews();
    } catch (err) { showToast(err.message || 'Delete failed', 'error'); }
  });
};

// Filter tabs
document.querySelectorAll('[data-review-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-review-filter]').forEach(b => {
      b.className = b.className
        .replace('bg-gray-900 text-white', '')
        .replace('text-gray-600 border border-gray-200', 'text-gray-600 border border-gray-200');
    });
    btn.classList.add('bg-gray-900', 'text-white');
    loadReviews(btn.dataset.reviewFilter);
  });
});

loadReviews();
