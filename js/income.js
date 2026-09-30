/**
 * Expense Management - Income CRUD & Table
 */

const IncomeModule = (() => {
  const DASH_ACCOUNTS = [
    { key: 'JIO', el: 'incomeDashJio', match: ['JIO'] },
    { key: 'YES', el: 'incomeDashYes', match: ['YES', 'YES BANK', 'YESBANK'] },
    { key: 'ADC', el: 'incomeDashAdc', match: ['ADC'] }
  ];

  function normalizeAccount(name) {
    return String(name || '').trim().toUpperCase().replace(/\s+/g, ' ');
  }

  function accountMatches(bankAccount, matchList) {
    const normalized = normalizeAccount(bankAccount);
    return matchList.some((m) => normalizeAccount(m) === normalized);
  }

  function populateFormSelects() {
    const typeSelect = document.getElementById('incomeType');
    const bankSelect = document.getElementById('incomeBank');
    const types = Storage.getData().incomeTypes.filter(
      (t) => t.id !== 'INC-RPD' && String(t.name).toLowerCase() !== 'rpd income'
    );
    const preferredBanks = ['JIO', 'YES', 'ADC'];
    const banks = Storage.getBankAccounts();
    const bankNames = [];
    preferredBanks.forEach((name) => {
      if (!bankNames.some((n) => n.toUpperCase() === name)) bankNames.push(name);
    });
    banks.forEach((b) => {
      if (b.name && !bankNames.some((n) => n.toUpperCase() === String(b.name).toUpperCase())) {
        bankNames.push(b.name);
      }
    });

    if (typeSelect) {
      typeSelect.innerHTML =
        `<option value="">Select type</option>` +
        types.map((t) => `<option value="${Utils.escapeHtml(t.name)}">${Utils.escapeHtml(t.name)}</option>`).join('');
    }
    if (bankSelect) {
      bankSelect.innerHTML =
        `<option value="">— None —</option>` +
        bankNames.map((name) => `<option value="${Utils.escapeHtml(name)}">${Utils.escapeHtml(name)}</option>`).join('');
    }
  }

  function renderDashboard() {
    const monthKey = Storage.getSelectedMonth();
    const list = Storage.getIncomeByMonth(monthKey);

    DASH_ACCOUNTS.forEach((acc) => {
      const amount = list
        .filter((i) => accountMatches(i.bankAccount, acc.match))
        .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
      const el = document.getElementById(acc.el);
      if (el) el.textContent = Utils.formatCurrency(amount);
    });
  }

  function openAddModal() {
    populateFormSelects();
    document.getElementById('incomeModalTitle').textContent = 'Add Income';
    document.getElementById('incomeId').value = '';
    document.getElementById('incomeForm').reset();
    document.getElementById('incomeForm').classList.remove('was-validated');
    document.getElementById('incomeDate').value = Utils.todayISO();
    bootstrap.Modal.getOrCreateInstance(document.getElementById('incomeModal')).show();
  }

  function openEditModal(id) {
    const inc = Storage.getIncomeById(id);
    if (!inc) {
      Utils.showToast('Income not found.', 'danger');
      return;
    }
    populateFormSelects();
    document.getElementById('incomeModalTitle').textContent = 'Edit Income';
    document.getElementById('incomeId').value = inc.id;
    document.getElementById('incomeDate').value = inc.date;
    document.getElementById('incomeType').value = inc.type;
    document.getElementById('incomeAmount').value = inc.amount;
    document.getElementById('incomeDescription').value = inc.description || '';
    document.getElementById('incomeBank').value = inc.bankAccount || '';
    document.getElementById('incomeNotes').value = inc.notes || '';
    document.getElementById('incomeForm').classList.remove('was-validated');
    bootstrap.Modal.getOrCreateInstance(document.getElementById('incomeModal')).show();
  }

  function saveIncome() {
    const form = document.getElementById('incomeForm');
    form.classList.add('was-validated');

    const date = document.getElementById('incomeDate').value;
    const type = document.getElementById('incomeType').value;
    const amount = Utils.parseAmount(document.getElementById('incomeAmount').value);
    const description = document.getElementById('incomeDescription').value.trim();
    const bankAccount = document.getElementById('incomeBank').value;
    const notes = document.getElementById('incomeNotes').value.trim();
    const id = document.getElementById('incomeId').value;

    if (!date) {
      Utils.showToast('Please select a date.', 'warning');
      return;
    }
    if (!type) {
      Utils.showToast('Please select an Income type.', 'warning');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      Utils.showToast('Amount must be greater than 0.', 'warning');
      return;
    }

    const payload = { date, type, amount, description, bankAccount, notes };

    if (id) {
      Storage.updateIncome(id, payload);
      Utils.showToast('Income updated successfully.', 'success');
    } else {
      Storage.addIncome(payload);
      Utils.showToast('Income added successfully.', 'success');
    }

    bootstrap.Modal.getInstance(document.getElementById('incomeModal')).hide();
    App.refreshAll();
  }

  async function deleteIncome(id) {
    const ok = await Utils.confirmModal({
      title: 'Delete Income',
      message: 'Are you sure you want to delete this Income entry?',
      okText: 'Delete',
      okClass: 'btn-danger'
    });
    if (!ok) return;
    Storage.deleteIncome(id);
    Utils.showToast('Income deleted.', 'success');
    App.refreshAll();
  }

  function renderTable() {
    renderDashboard();

    const monthKey = Storage.getSelectedMonth();
    const list = Storage.getIncomeByMonth(monthKey).sort((a, b) => b.date.localeCompare(a.date));
    const tbody = document.getElementById('incomeTableBody');
    if (!tbody) return;

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state"><i class="bi bi-inbox"></i>No Income found for this month.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map((i) => `
      <tr>
        <td>${Utils.escapeHtml(Utils.formatDateDisplay(i.date))}</td>
        <td><span class="badge text-bg-success badge-category">${Utils.escapeHtml(i.type)}</span></td>
        <td>${Utils.escapeHtml(i.description || '—')}</td>
        <td class="amount-income">${Utils.formatCurrency(i.amount)}</td>
        <td>${Utils.escapeHtml(i.bankAccount || '—')}</td>
        <td class="table-actions text-nowrap">
          <button class="btn btn-outline-primary btn-sm" onclick="IncomeModule.openEditModal('${i.id}')"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-outline-danger btn-sm" onclick="IncomeModule.deleteIncome('${i.id}')"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `).join('');
  }

  function bindEvents() {
    document.getElementById('btnSaveIncome')?.addEventListener('click', saveIncome);
    document.getElementById('btnAddIncome')?.addEventListener('click', openAddModal);
    document.getElementById('btnAddIncomeDash')?.addEventListener('click', () => {
      App.navigate('income');
      openAddModal();
    });
  }

  return {
    bindEvents,
    renderTable,
    renderDashboard,
    populateFormSelects,
    openAddModal,
    openEditModal,
    deleteIncome
  };
})();
