/**
 * Expense Management - Bank Accounts
 */

const BankModule = (() => {
  function openAddModal() {
    document.getElementById('bankModalTitle').textContent = 'Add Bank Account';
    document.getElementById('bankId').value = '';
    document.getElementById('bankForm').reset();
    document.getElementById('bankForm').classList.remove('was-validated');
    document.getElementById('bankOpening').value = '0';
    bootstrap.Modal.getOrCreateInstance(document.getElementById('bankModal')).show();
  }

  function openEditModal(id) {
    const bank = Storage.getBankAccounts().find((b) => b.id === id);
    if (!bank) {
      Utils.showToast('Account not found.', 'danger');
      return;
    }
    document.getElementById('bankModalTitle').textContent = 'Edit Bank Account';
    document.getElementById('bankId').value = bank.id;
    document.getElementById('bankName').value = bank.name;
    document.getElementById('bankOpening').value = bank.openingBalance;
    document.getElementById('bankForm').classList.remove('was-validated');
    bootstrap.Modal.getOrCreateInstance(document.getElementById('bankModal')).show();
  }

  function saveBank() {
    const form = document.getElementById('bankForm');
    form.classList.add('was-validated');

    const name = document.getElementById('bankName').value.trim();
    const opening = Utils.parseAmount(document.getElementById('bankOpening').value);
    const id = document.getElementById('bankId').value;

    if (!name) {
      Utils.showToast('Please enter an account name.', 'warning');
      return;
    }
    if (isNaN(opening)) {
      Utils.showToast('Please enter a valid opening balance.', 'warning');
      return;
    }

    if (id) {
      const result = Storage.updateBankAccount(id, { name, openingBalance: opening });
      if (result.error) {
        Utils.showToast(result.error, 'danger');
        return;
      }
      Utils.showToast('Bank account updated.', 'success');
    } else {
      const result = Storage.addBankAccount(name, opening);
      if (result.error) {
        Utils.showToast(result.error, 'danger');
        return;
      }
      Utils.showToast('Bank account added.', 'success');
    }

    bootstrap.Modal.getInstance(document.getElementById('bankModal')).hide();
    App.refreshAll();
  }

  async function deleteBank(id) {
    const ok = await Utils.confirmModal({
      title: 'Delete Bank Account',
      message: 'Are you sure you want to delete this bank account?',
      okText: 'Delete',
      okClass: 'btn-danger'
    });
    if (!ok) return;
    const result = Storage.deleteBankAccount(id);
    if (result.error) {
      Utils.showToast(result.error, 'danger');
      return;
    }
    Utils.showToast('Bank account deleted.', 'success');
    App.refreshAll();
  }

  function render() {
    const banks = Storage.getBankAccounts();
    const tbody = document.getElementById('bankTableBody');
    const cardsEl = document.getElementById('bankCards');
    const total = Storage.getTotalBankBalance();

    const totalEl = document.getElementById('dashBankBalance');
    if (totalEl) {
      totalEl.textContent = Utils.formatCurrency(total);
      totalEl.className = 'stat-value ' + (total >= 0 ? 'text-balance' : 'balance-negative');
    }

    const calcBank = document.getElementById('calcBankBalance');
    if (calcBank) calcBank.textContent = Utils.formatCurrency(total);

    if (cardsEl) {
      if (banks.length === 0) {
        cardsEl.innerHTML = `<div class="col-12"><div class="empty-state"><i class="bi bi-bank"></i>No bank accounts yet. Add one to track balances.</div></div>`;
      } else {
        cardsEl.innerHTML = banks.map((b) => `
          <div class="col-6 col-md-4 col-lg-3">
            <div class="card category-card h-100">
              <div class="card-body">
                <div class="cat-name">${Utils.escapeHtml(b.name)}</div>
                <div class="cat-amount ${b.currentBalance >= 0 ? 'text-balance' : 'balance-negative'}">${Utils.formatCurrency(b.currentBalance)}</div>
                <div class="cat-count">Opening: ${Utils.formatCurrency(b.openingBalance)}</div>
              </div>
            </div>
          </div>
        `).join('');
      }
    }

    if (tbody) {
      if (banks.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state"><i class="bi bi-bank"></i>No bank accounts.</td></tr>`;
      } else {
        tbody.innerHTML = banks.map((b) => `
          <tr>
            <td><strong>${Utils.escapeHtml(b.name)}</strong></td>
            <td>${Utils.formatCurrency(b.openingBalance)}</td>
            <td class="${b.currentBalance >= 0 ? 'amount-income' : 'amount-expense'}">${Utils.formatCurrency(b.currentBalance)}</td>
            <td class="small text-muted">Updated ${Utils.escapeHtml(Utils.formatDateTime(b.updatedAt))}</td>
            <td class="table-actions text-nowrap">
              <button class="btn btn-outline-primary btn-sm" onclick="BankModule.openEditModal('${b.id}')"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-outline-danger btn-sm" onclick="BankModule.deleteBank('${b.id}')"><i class="bi bi-trash"></i></button>
            </td>
          </tr>
        `).join('');
      }
    }
  }

  function bindEvents() {
    document.getElementById('btnSaveBank')?.addEventListener('click', saveBank);
    document.getElementById('btnAddBank')?.addEventListener('click', openAddModal);
  }

  return {
    bindEvents,
    render,
    openAddModal,
    openEditModal,
    deleteBank
  };
})();
