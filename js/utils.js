/**
 * Expense Management - Utility Helpers
 */

const Utils = (() => {
  const CURRENCY = '₹';
  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const MONTH_SHORT = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  function generateId(prefix) {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${ts}${rand}`;
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function todayISO() {
    const d = new Date();
    return formatISODate(d);
  }

  function formatISODate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function getMonthKey(dateStr) {
    if (!dateStr) return '';
    return dateStr.substring(0, 7); // YYYY-MM
  }

  function parseMonthKey(monthKey) {
    const [y, m] = monthKey.split('-').map(Number);
    return { year: y, month: m }; // month is 1-based
  }

  function formatMonthLabel(monthKey) {
    const { year, month } = parseMonthKey(monthKey);
    return `${MONTH_NAMES[month - 1]} ${year}`;
  }

  function formatMonthShort(monthKey) {
    const { year, month } = parseMonthKey(monthKey);
    return `${MONTH_SHORT[month - 1]} ${year}`;
  }

  function currentMonthKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function shiftMonth(monthKey, delta) {
    const { year, month } = parseMonthKey(monthKey);
    const d = new Date(year, month - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function formatCurrency(amount) {
    const num = Number(amount) || 0;
    const formatted = Math.abs(num).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
    return num < 0 ? `-${CURRENCY} ${formatted}` : `${CURRENCY} ${formatted}`;
  }

  function formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    return `${String(d).padStart(2, '0')}-${MONTH_SHORT[m - 1]}-${y}`;
  }

  function formatDateTime(isoStr) {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '—';
    const date = formatDateDisplay(formatISODate(d));
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${date} ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  }

  function formatDateTimeShort(isoStr) {
    return formatDateTime(isoStr);
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadJSON(obj, filename) {
    const json = JSON.stringify(obj, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    downloadBlob(blob, filename);
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function timestampForFilename(date = new Date()) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}-${pad2(date.getHours())}-${pad2(date.getMinutes())}`;
  }

  function dateForFilename(date = new Date()) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function parseAmount(val) {
    if (typeof val === 'number') return val;
    if (!val) return NaN;
    const cleaned = String(val).replace(/[₹,\s]/g, '');
    return parseFloat(cleaned);
  }

  function daysInMonth(monthKey) {
    const { year, month } = parseMonthKey(monthKey);
    return new Date(year, month, 0).getDate();
  }

  function getDatesInMonth(monthKey) {
    const days = daysInMonth(monthKey);
    const dates = [];
    for (let i = 1; i <= days; i++) {
      dates.push(`${monthKey}-${pad2(i)}`);
    }
    return dates;
  }

  function categoryColor(index) {
    const colors = [
      '#0d6efd', '#198754', '#dc3545', '#fd7e14', '#6f42c1',
      '#20c997', '#d63384', '#0dcaf0', '#6610f2', '#ffc107'
    ];
    return colors[index % colors.length];
  }

  function debounce(fn, wait = 250) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function matchesSearch(text, query) {
    if (!query) return true;
    return String(text || '').toLowerCase().includes(String(query).toLowerCase());
  }

  /** Show Bootstrap toast */
  function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = {
      success: 'bi-check-circle-fill',
      danger: 'bi-x-circle-fill',
      warning: 'bi-exclamation-triangle-fill',
      info: 'bi-info-circle-fill'
    };

    const bgMap = {
      success: 'text-bg-success',
      danger: 'text-bg-danger',
      warning: 'text-bg-warning',
      info: 'text-bg-info'
    };

    const id = `toast-${Date.now()}`;
    const html = `
      <div id="${id}" class="toast align-items-center ${bgMap[type] || bgMap.info} border-0" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body">
            <i class="bi ${icons[type] || icons.info} me-2"></i>${escapeHtml(message)}
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>`;
    container.insertAdjacentHTML('beforeend', html);
    const el = document.getElementById(id);
    const toast = new bootstrap.Toast(el, { delay: 3500 });
    toast.show();
    el.addEventListener('hidden.bs.toast', () => el.remove());
  }

  function confirmModal(options) {
    return new Promise((resolve) => {
      const modalEl = document.getElementById('confirmModal');
      const titleEl = document.getElementById('confirmModalTitle');
      const bodyEl = document.getElementById('confirmModalBody');
      const okBtn = document.getElementById('confirmModalOk');
      const cancelBtn = document.getElementById('confirmModalCancel');

      titleEl.textContent = options.title || 'Confirm';
      bodyEl.innerHTML = options.message || 'Are you sure?';
      okBtn.textContent = options.okText || 'Confirm';
      okBtn.className = `btn ${options.okClass || 'btn-danger'}`;
      cancelBtn.textContent = options.cancelText || 'Cancel';

      const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
      let settled = false;
      let confirmed = false;

      const finish = (value) => {
        if (settled) return;
        settled = true;
        okBtn.removeEventListener('click', onOk);
        resolve(value);
      };

      const onOk = () => {
        confirmed = true;
        modal.hide();
        finish(true);
      };

      const onHidden = () => {
        if (!confirmed) finish(false);
      };

      okBtn.addEventListener('click', onOk);
      modalEl.addEventListener('hidden.bs.modal', onHidden, { once: true });
      modal.show();
    });
  }

  return {
    CURRENCY,
    MONTH_NAMES,
    MONTH_SHORT,
    generateId,
    nowISO,
    todayISO,
    formatISODate,
    getMonthKey,
    parseMonthKey,
    formatMonthLabel,
    formatMonthShort,
    currentMonthKey,
    shiftMonth,
    formatCurrency,
    formatDateDisplay,
    formatDateTime,
    formatDateTimeShort,
    downloadBlob,
    downloadJSON,
    timestampForFilename,
    dateForFilename,
    escapeHtml,
    parseAmount,
    daysInMonth,
    getDatesInMonth,
    categoryColor,
    debounce,
    matchesSearch,
    showToast,
    confirmModal,
    pad2
  };
})();
