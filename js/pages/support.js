/**
 * ForgeAdmin — Support Tickets Page
 */
import { auth } from '../firebase-config.js';
import { requireAuth, populateUserUI, populateSidebarStats, fmt, showToast, openModal,
         setLoading, skeletonRows, renderPagination } from '../ui-utils.js';
import { supportService, settingsService, productService } from '../forge-api.js';

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

// Helper for priority badges
function getPriorityBadge(p) {
  const badges = {
    urgent: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase">Urgent</span>',
    high: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 uppercase">High</span>',
    normal: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 uppercase">Normal</span>'
  };
  return badges[p?.toLowerCase()] || badges['normal'];
}

function getStatusBadge(s) {
  const badges = {
    open: '<span class="px-2 py-1 rounded-full text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200">Open</span>',
    'in-progress': '<span class="px-2 py-1 rounded-full text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200">In Progress</span>',
    resolved: '<span class="px-2 py-1 rounded-full text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">Resolved</span>'
  };
  return badges[s?.toLowerCase()] || badges['open'];
}

function supportRow(t) {
  return `
  <tr class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
    <td class="px-6 py-4 font-medium text-brand-600">TIC-${esc(t.id).slice(-6).toUpperCase()}</td>
    <td class="px-6 py-4 text-gray-500 text-sm">${fmt.dateTime(t.createdAt)}</td>
    <td class="px-6 py-4">
      <p class="font-medium text-gray-900">${esc(t.customerName) || 'Unknown'}</p>
      <p class="text-xs text-gray-500">${esc(t.email) || ''}</p>
    </td>
    <td class="px-6 py-4">
      <div class="flex flex-col gap-1 items-start">
        <p class="font-medium text-gray-900 truncate max-w-[200px]" title="${escAttr(t.subject)}">${esc(t.subject)}</p>
        ${getPriorityBadge(t.priority)}
      </div>
    </td>
    <td class="px-6 py-4">
      ${getStatusBadge(t.status)}
    </td>
    <td class="px-6 py-4 text-right">
      <button onclick="viewTicket('${escAttr(t.id)}')" class="px-3 py-1.5 text-xs font-medium bg-brand-50 text-brand-600 rounded-lg hover:bg-brand-100 transition-colors">Resolve</button>
    </td>
  </tr>`;
}

async function loadTickets(page = 1) {
  currentPage = page;
  const tbody = document.getElementById('support-tbody');
  if (!tbody) return;
  tbody.innerHTML = skeletonRows(5, 6);

  try {
    const res = await supportService.getAll({ status: currentStatus, search: currentSearch, page, pageSize: 10 });
    
    // Update summary stats based on fetched entire data for this list (or just generic counts)
    const all = await supportService.getAll({ pageSize: 1000 });
    const statOpen = all.data.filter(t => t.status === 'open').length;
    const statProg = all.data.filter(t => t.status === 'in-progress').length;
    const statRes = all.data.filter(t => t.status === 'resolved').length;
    
    const el = (id) => document.getElementById(id);
    if (el('stat-open')) el('stat-open').textContent = statOpen;
    if (el('stat-in-progress')) el('stat-in-progress').textContent = statProg;
    if (el('stat-resolved')) el('stat-resolved').textContent = statRes;

    if (!res.data.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-16 text-center text-gray-400">
        <i class="fa-solid fa-inbox text-3xl mb-3 block opacity-50"></i>No tickets found.
      </td></tr>`;
    } else {
      tbody.innerHTML = res.data.map(supportRow).join('');
    }
    renderPagination('support-pagination', res, loadTickets);
  } catch (err) {
    console.error(err);
    showToast('Error loading support tickets', 'error');
  }
}

window.viewTicket = async (id) => {
  const ticket = await supportService.getById(id);
  if (!ticket) { showToast('Ticket not found', 'error'); return; }
  
  openModal({
    id: 'modal-ticket-detail',
    title: `Ticket Details #${ticket.id.slice(-6).toUpperCase()}`,
    saveText: 'Mark Resolved',
    content: `
      <div class="space-y-4 text-sm">
        <div class="grid grid-cols-2 gap-4">
          <div><p class="text-gray-500">Customer</p><p class="font-semibold text-gray-900">${ticket.customerName || '—'}</p></div>
          <div><p class="text-gray-500">Email</p><p class="font-semibold text-gray-900">${ticket.email || '—'}</p></div>
        </div>
        <div class="bg-gray-50 p-4 rounded-xl border border-gray-100">
          <p class="text-gray-500 font-medium mb-1">Subject: ${esc(ticket.subject)}</p>
          <p class="text-gray-800 whitespace-pre-wrap">${esc(ticket.message)}</p>
        </div>
        
        <div class="border-t border-gray-100 pt-4">
            <label class="forge-label">Write your reply (Simulated Email)</label>
            <textarea id="replyMsg" rows="3" class="forge-input" placeholder="Dear ${escAttr(ticket.customerName)}, we have reviewed your request..."></textarea>
        </div>
      </div>`,
    onSave: async (close, btn) => {
      setLoading(btn, true);
      const msg = document.getElementById('replyMsg').value;
      try {
        if (msg) {
            await supportService.sendReply(id, msg);
            showToast('Reply Sent & Ticket Resolved!', 'success');
        } else {
            await supportService.updateStatus(id, 'resolved');
            showToast('Ticket marked as resolved');
        }
        close();
        loadTickets(currentPage);
      } catch (err) {
        showToast('Update failed', 'error');
        setLoading(btn, false);
      }
    }
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
    loadTickets(1);
  });
});

// Search
const searchInput = document.getElementById('support-search');
let timer;
searchInput?.addEventListener('input', (e) => {
  clearTimeout(timer);
  timer = setTimeout(() => { currentSearch = e.target.value; loadTickets(1); }, 400);
});

// Seed Dummy Ticket helper for Demo purposes
document.getElementById('btn-new-ticket')?.addEventListener('click', async () => {
   showToast('Adding sample ticket for demo...', 'success');
   const { addDoc, collection, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
   const { db } = await import('../firebase-config.js');
   await addDoc(collection(db, 'support'), {
       customerName: "Alice Smith",
       email: "alice@example.com",
       subject: "Missing item from order #X12M",
       message: "Hi, I received my package today but it only had 2 out of the 3 items I ordered. Can you please check what happened to the third item?",
       status: "open",
       priority: "high",
       createdAt: serverTimestamp()
   });
   loadTickets(1);
});

loadTickets();
