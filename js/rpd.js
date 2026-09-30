/**
 * Expense Management - RPD Income CRUD & Table
 */

const RpdModule = (() => {
  const TYPES = ['Cash', 'YES', 'Other'];

  let filters = {
    search: '',
    type: '',
    dateFrom: '',
    dateTo: ''
  };

  function getFilteredList(monthKey) {
    let list = Storage.getRpdByMonth(monthKey);

    if (filters.type) {
      list = list.filter((r) => r.type === filters.type);
    }
    if (filters.dateFrom) {
      list = list.filter((r) => r.date >= filters.dateFrom);
    }
    if (filters.dateTo) {
      list = list.filter((r) => r.date <= filters.dateTo);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter((r) => {
        return (
          Utils.matchesSearch(r.notes, q) ||
          Utils.matchesSearch(r.type, q) ||
          Utils.matchesSearch(r.date, q) ||
          Utils.matchesSearch(String(r.amount), q) ||
          Utils.matchesSearch(Utils.formatDateDisplay(r.date), q)
        );
      });
    }

    return list.sort((a, b) => b.date.localeCompare(a.date));
  }

  function setFilters(partial) {
    Object.assign(filters, partial);
    renderTable();
  }

  function clearFilters() {
    filters = { search: '', type: '', dateFrom: '', dateTo: '' };
    const form = document.getElementById('rpdFilterForm');
    if (form) form.reset();
    renderTable();
  }

  function openAddModal() {
    document.getElementById('rpdModalTitle').textContent = 'Add RPD Income';
    document.getElementById('rpdId').value = '';
    document.getElementById('rpdForm').reset();
    document.getElementById('rpdForm').classList.remove('was-validated');
    document.getElementById('rpdDate').value = Utils.todayISO();
    bootstrap.Modal.getOrCreateInstance(document.getElementById('rpdModal')).show();
  }

  function openEditModal(id) {
    const entry = Storage.getRpdById(id);
    if (!entry) {
      Utils.showToast('RPD entry not found.', 'danger');
      return;
    }
    document.getElementById('rpdModalTitle').textContent = 'Edit RPD Income';
    document.getElementById('rpdId').value = entry.id;
    document.getElementById('rpdDate').value = entry.date;
    document.getElementById('rpdAmount').value = entry.amount;
    document.getElementById('rpdType').value = entry.type || '';
    document.getElementById('rpdNotes').value = entry.notes || '';
    document.getElementById('rpdForm').classList.remove('was-validated');
    bootstrap.Modal.getOrCreateInstance(document.getElementById('rpdModal')).show();
  }

  function saveRpd() {
    const form = document.getElementById('rpdForm');
    form.classList.add('was-validated');

    const date = document.getElementById('rpdDate').value;
    const amount = Utils.parseAmount(document.getElementById('rpdAmount').value);
    const type = document.getElementById('rpdType').value;
    const notes = document.getElementById('rpdNotes').value.trim();
    const id = document.getElementById('rpdId').value;

    if (!date) {
      Utils.showToast('Please select a date.', 'warning');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      Utils.showToast('Amount must be greater than 0.', 'warning');
      return;
    }
    if (!type || !TYPES.includes(type)) {
      Utils.showToast('Please select a type.', 'warning');
      return;
    }

    const payload = { date, amount, type, notes };

    if (id) {
      Storage.updateRpd(id, payload);
      Utils.showToast('RPD Income updated successfully.', 'success');
    } else {
      Storage.addRpd(payload);
      Utils.showToast('RPD Income added successfully.', 'success');
    }

    bootstrap.Modal.getInstance(document.getElementById('rpdModal')).hide();
    App.refreshAll();
  }

  async function deleteRpd(id) {
    const ok = await Utils.confirmModal({
      title: 'Delete RPD Income',
      message: 'Are you sure you want to delete this RPD entry?',
      okText: 'Delete',
      okClass: 'btn-danger'
    });
    if (!ok) return;
    Storage.deleteRpd(id);
    Utils.showToast('RPD entry deleted.', 'success');
    App.refreshAll();
  }

  function renderTable() {
    const monthKey = Storage.getSelectedMonth();
    const list = getFilteredList(monthKey);
    const tbody = document.getElementById('rpdTableBody');
    if (!tbody) return;

    const countEl = document.getElementById('rpdCountLabel');
    if (countEl) countEl.textContent = `${list.length} record${list.length !== 1 ? 's' : ''}`;

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state"><i class="bi bi-inbox"></i>No RPD Income found for this month.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map((r) => `
      <tr>
        <td>${Utils.escapeHtml(Utils.formatDateDisplay(r.date))}</td>
        <td class="amount-income">${Utils.formatCurrency(r.amount)}</td>
        <td><span class="badge text-bg-success badge-category">${Utils.escapeHtml(r.type)}</span></td>
        <td>${Utils.escapeHtml(r.notes || '—')}</td>
        <td class="table-actions text-nowrap">
          <button class="btn btn-outline-primary btn-sm" title="Edit" onclick="RpdModule.openEditModal('${r.id}')"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-outline-danger btn-sm" title="Delete" onclick="RpdModule.deleteRpd('${r.id}')"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `).join('');
  }

  function bindEvents() {
    document.getElementById('btnSaveRpd')?.addEventListener('click', saveRpd);
    document.getElementById('btnAddRpd')?.addEventListener('click', openAddModal);

    document.getElementById('rpdSearch')?.addEventListener('input', (e) => setFilters({ search: e.target.value.trim() }));
    document.getElementById('rpdFilterType')?.addEventListener('change', (e) => setFilters({ type: e.target.value }));
    document.getElementById('rpdFilterDateFrom')?.addEventListener('change', (e) => setFilters({ dateFrom: e.target.value }));
    document.getElementById('rpdFilterDateTo')?.addEventListener('change', (e) => setFilters({ dateTo: e.target.value }));
    document.getElementById('btnClearRpdFilters')?.addEventListener('click', clearFilters);
  }

  return {
    bindEvents,
    renderTable,
    openAddModal,
    openEditModal,
    deleteRpd,
    setFilters,
    clearFilters
  };
})();
