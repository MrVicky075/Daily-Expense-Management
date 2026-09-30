/**
 * Expense Management - Expense CRUD & Table
 */

const ExpenseModule = (() => {
  let sortField = 'date';
  let sortDir = 'desc';
  let filters = {
    search: '',
    category: '',
    bank: '',
    payment: '',
    dateFrom: '',
    dateTo: ''
  };

  const CATEGORY_SUBOPTIONS = {
    FOOD: ['Paket', 'Puri', 'Others'],
    HOME: ['child', 'dudh', 'food-other', 'others'],
    'BIG-EXPENSE': ['recharge', 'with Parul', 'My Personal', 'Others'],
    PETROL: ['my', 'other']
  };

  const UPI_BANKS = ['JIO', 'YES BANK', 'ADC'];
  const PAYMENT_METHODS = ['Cash', 'UPI'];

  function normalizeBankName(name) {
    if (!name) return '';
    const upper = String(name).trim().toUpperCase().replace(/\s+/g, ' ');
    if (upper === 'YES BANK' || upper === 'YESBANK') return 'YES BANK';
    if (upper === 'JIO') return 'JIO';
    if (upper === 'ADC') return 'ADC';
    return name;
  }

  function resolveBankAccountName(selected) {
    const normalized = normalizeBankName(selected);
    if (!normalized) return '';
    const banks = Storage.getBankAccounts();
    const match = banks.find((b) => normalizeBankName(b.name) === normalized);
    return match ? match.name : normalized;
  }

  function getFilteredExpenses(monthKey) {
    let list = Storage.getExpensesByMonth(monthKey);

    if (filters.category) {
      list = list.filter((e) => e.category === filters.category);
    }
    if (filters.bank) {
      list = list.filter((e) => e.bankAccount === filters.bank);
    }
    if (filters.payment) {
      list = list.filter((e) => e.paymentMethod === filters.payment);
    }
    if (filters.dateFrom) {
      list = list.filter((e) => e.date >= filters.dateFrom);
    }
    if (filters.dateTo) {
      list = list.filter((e) => e.date <= filters.dateTo);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter((e) => {
        return (
          Utils.matchesSearch(e.description, q) ||
          Utils.matchesSearch(e.category, q) ||
          Utils.matchesSearch(e.subcategory, q) ||
          Utils.matchesSearch(e.date, q) ||
          Utils.matchesSearch(String(e.amount), q) ||
          Utils.matchesSearch(e.bankAccount, q) ||
          Utils.matchesSearch(e.paymentMethod, q) ||
          Utils.matchesSearch(e.notes, q) ||
          Utils.matchesSearch(Utils.formatDateDisplay(e.date), q)
        );
      });
    }

    list.sort((a, b) => {
      let va = a[sortField];
      let vb = b[sortField];
      if (sortField === 'amount') {
        va = Number(va);
        vb = Number(vb);
      } else {
        va = String(va || '').toLowerCase();
        vb = String(vb || '').toLowerCase();
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }

  function setSort(field) {
    if (sortField === field) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortField = field;
      sortDir = field === 'date' || field === 'amount' ? 'desc' : 'asc';
    }
    renderTable();
  }

  function setFilters(partial) {
    Object.assign(filters, partial);
    renderTable();
  }

  function clearFilters() {
    filters = { search: '', category: '', bank: '', payment: '', dateFrom: '', dateTo: '' };
    const form = document.getElementById('expenseFilterForm');
    if (form) form.reset();
    const search = document.getElementById('globalSearch');
    if (search) search.value = '';
    const expenseSearch = document.getElementById('expenseSearch');
    if (expenseSearch) expenseSearch.value = '';
    renderTable();
  }

  function updateCategoryDependentFields(selectedCategory, selectedSubcategory) {
    const subWrap = document.getElementById('expenseSubcategoryWrap');
    const subSelect = document.getElementById('expenseSubcategory');
    const otherWrap = document.getElementById('expenseOtherDetailWrap');
    const otherInput = document.getElementById('expenseOtherDetail');
    const options = CATEGORY_SUBOPTIONS[selectedCategory];

    if (selectedCategory === 'OTHER') {
      subWrap?.classList.add('d-none');
      otherWrap?.classList.remove('d-none');
      if (subSelect) subSelect.innerHTML = '';
      if (otherInput && selectedSubcategory !== undefined) {
        otherInput.value = selectedSubcategory || '';
      }
      return;
    }

    otherWrap?.classList.add('d-none');
    if (otherInput) otherInput.value = '';

    if (options && options.length) {
      subWrap?.classList.remove('d-none');
      if (subSelect) {
        subSelect.innerHTML =
          `<option value="">Select sub category</option>` +
          options.map((o) => `<option value="${Utils.escapeHtml(o)}">${Utils.escapeHtml(o)}</option>`).join('');
        if (selectedSubcategory) {
          const match = options.find((o) => o.toLowerCase() === String(selectedSubcategory).toLowerCase());
          subSelect.value = match || '';
        }
      }
    } else {
      subWrap?.classList.add('d-none');
      if (subSelect) subSelect.innerHTML = '';
    }
  }

  function updatePaymentDependentFields(paymentMethod, bankAccount) {
    const upiWrap = document.getElementById('expenseUpiBankWrap');
    const upiSelect = document.getElementById('expenseUpiBank');

    if (paymentMethod === 'UPI') {
      upiWrap?.classList.remove('d-none');
      if (upiSelect && bankAccount !== undefined) {
        const normalized = normalizeBankName(bankAccount);
        upiSelect.value = UPI_BANKS.includes(normalized) ? normalized : '';
      }
    } else {
      upiWrap?.classList.add('d-none');
      if (upiSelect) upiSelect.value = '';
    }
  }

  function resetDependentFields() {
    updateCategoryDependentFields('');
    updatePaymentDependentFields('');
    const otherInput = document.getElementById('expenseOtherDetail');
    if (otherInput) otherInput.value = '';
  }

  function populateFormSelects() {
    const catSelect = document.getElementById('expenseCategory');
    const paySelect = document.getElementById('expensePayment');
    const filterCat = document.getElementById('filterCategory');
    const filterBank = document.getElementById('filterBank');
    const filterPay = document.getElementById('filterPayment');

    const categories = Storage.getCategories();
    const banks = Storage.getBankAccounts();

    const catOpts = categories.map((c) => `<option value="${Utils.escapeHtml(c.name)}">${Utils.escapeHtml(c.name)}</option>`).join('');
    const payOpts = PAYMENT_METHODS.map((m) => `<option value="${Utils.escapeHtml(m)}">${Utils.escapeHtml(m)}</option>`).join('');
    const bankFilterOpts = banks.map((b) => `<option value="${Utils.escapeHtml(b.name)}">${Utils.escapeHtml(b.name)}</option>`).join('');
    const upiFilterOpts = UPI_BANKS.map((b) => `<option value="${Utils.escapeHtml(b)}">${Utils.escapeHtml(b)}</option>`).join('');

    if (catSelect) catSelect.innerHTML = `<option value="">Select category</option>${catOpts}`;
    if (paySelect) {
      paySelect.innerHTML = `<option value="">Select method</option>${payOpts}`;
    }
    if (filterCat) filterCat.innerHTML = `<option value="">All Categories</option>${catOpts}`;
    if (filterBank) {
      filterBank.innerHTML = `<option value="">All Accounts</option>${bankFilterOpts || upiFilterOpts}`;
    }
    if (filterPay) filterPay.innerHTML = `<option value="">All Methods</option>${payOpts}`;
  }

  function openAddModal() {
    populateFormSelects();
    document.getElementById('expenseModalTitle').textContent = 'Add Expense';
    document.getElementById('expenseId').value = '';
    document.getElementById('expenseForm').reset();
    document.getElementById('expenseForm').classList.remove('was-validated');
    document.getElementById('expenseDate').value = Utils.todayISO();
    resetDependentFields();
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('expenseModal'));
    modal.show();
  }

  function openEditModal(id) {
    const exp = Storage.getExpenseById(id);
    if (!exp) {
      Utils.showToast('Expense not found.', 'danger');
      return;
    }
    populateFormSelects();
    document.getElementById('expenseModalTitle').textContent = 'Edit Expense';
    document.getElementById('expenseId').value = exp.id;
    document.getElementById('expenseDate').value = exp.date;
    document.getElementById('expenseCategory').value = exp.category;
    document.getElementById('expenseAmount').value = exp.amount;
    document.getElementById('expenseDescription').value = exp.description || '';
    document.getElementById('expensePayment').value = exp.paymentMethod || '';
    document.getElementById('expenseNotes').value = exp.notes || '';
    document.getElementById('expenseForm').classList.remove('was-validated');

    updateCategoryDependentFields(exp.category, exp.subcategory || '');
    updatePaymentDependentFields(exp.paymentMethod || '', exp.bankAccount || '');

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('expenseModal'));
    modal.show();
  }

  function saveExpense() {
    const form = document.getElementById('expenseForm');
    form.classList.add('was-validated');

    const date = document.getElementById('expenseDate').value;
    const category = document.getElementById('expenseCategory').value;
    const amount = Utils.parseAmount(document.getElementById('expenseAmount').value);
    const description = document.getElementById('expenseDescription').value.trim();
    const paymentMethod = document.getElementById('expensePayment').value;
    const notes = document.getElementById('expenseNotes').value.trim();
    const id = document.getElementById('expenseId').value;

    let subcategory = '';
    if (category === 'OTHER') {
      subcategory = document.getElementById('expenseOtherDetail').value.trim();
      if (!subcategory) {
        Utils.showToast('Please enter other details.', 'warning');
        return;
      }
    } else if (CATEGORY_SUBOPTIONS[category]) {
      subcategory = document.getElementById('expenseSubcategory').value;
      if (!subcategory) {
        Utils.showToast('Please select a sub category.', 'warning');
        return;
      }
    }

    let bankAccount = '';
    if (paymentMethod === 'UPI') {
      const upiBank = document.getElementById('expenseUpiBank').value;
      if (!upiBank) {
        Utils.showToast('Please select a UPI account.', 'warning');
        return;
      }
      bankAccount = resolveBankAccountName(upiBank);
    }

    if (!date) {
      Utils.showToast('Please select a date.', 'warning');
      return;
    }
    if (!category) {
      Utils.showToast('Please select a category.', 'warning');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      Utils.showToast('Amount must be greater than 0.', 'warning');
      return;
    }

    const payload = { date, category, subcategory, amount, description, paymentMethod, bankAccount, notes };

    if (id) {
      Storage.updateExpense(id, payload);
      Utils.showToast('Expense updated successfully.', 'success');
    } else {
      Storage.addExpense(payload);
      Utils.showToast('Expense added successfully.', 'success');
    }

    bootstrap.Modal.getInstance(document.getElementById('expenseModal')).hide();
    App.refreshAll();
  }

  async function deleteExpense(id) {
    const ok = await Utils.confirmModal({
      title: 'Delete Expense',
      message: 'Are you sure you want to delete this Expense?',
      okText: 'Delete',
      okClass: 'btn-danger'
    });
    if (!ok) return;
    Storage.deleteExpense(id);
    Utils.showToast('Expense deleted.', 'success');
    App.refreshAll();
  }

  function categoryBadge(exp) {
    const cat = Utils.escapeHtml(exp.category || '');
    if (exp.subcategory) {
      return `${cat} <small class="text-muted">/ ${Utils.escapeHtml(exp.subcategory)}</small>`;
    }
    return cat;
  }

  function renderTable(targetId) {
    const monthKey = Storage.getSelectedMonth();
    const list = getFilteredExpenses(monthKey);
    const tbody = document.getElementById(targetId || 'expenseTableBody');
    const recentBody = document.getElementById('recentExpenseTableBody');

    if (!tbody && !recentBody) return;

    if (list.length === 0) {
      const empty = `<tr><td colspan="8" class="empty-state"><i class="bi bi-inbox"></i>No Expenses found for this month.</td></tr>`;
      if (tbody) tbody.innerHTML = empty;
    } else {
      const rows = list.map((e) => `
        <tr>
          <td>${Utils.escapeHtml(Utils.formatDateDisplay(e.date))}</td>
          <td><span class="badge text-bg-secondary badge-category">${categoryBadge(e)}</span></td>
          <td>${Utils.escapeHtml(e.description || '—')}</td>
          <td class="amount-expense">${Utils.formatCurrency(e.amount)}</td>
          <td>${Utils.escapeHtml(e.paymentMethod || '—')}</td>
          <td>${Utils.escapeHtml(e.bankAccount || '—')}</td>
          <td class="table-actions text-nowrap">
            <button class="btn btn-outline-primary btn-sm" title="Edit" onclick="ExpenseModule.openEditModal('${e.id}')"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-outline-danger btn-sm" title="Delete" onclick="ExpenseModule.deleteExpense('${e.id}')"><i class="bi bi-trash"></i></button>
          </td>
        </tr>
      `).join('');
      if (tbody) tbody.innerHTML = rows;
    }

    // Recent expenses (dashboard) — top 8
    if (recentBody) {
      const recent = [...list].slice(0, 8);
      if (recent.length === 0) {
        recentBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">No Expenses found for this month.</td></tr>`;
      } else {
        recentBody.innerHTML = recent.map((e) => `
          <tr>
            <td>${Utils.escapeHtml(Utils.formatDateDisplay(e.date))}</td>
            <td><span class="badge text-bg-secondary badge-category">${categoryBadge(e)}</span></td>
            <td>${Utils.escapeHtml(e.description || '—')}</td>
            <td class="amount-expense">${Utils.formatCurrency(e.amount)}</td>
            <td class="table-actions text-nowrap">
              <button class="btn btn-outline-primary btn-sm" onclick="ExpenseModule.openEditModal('${e.id}')"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-outline-danger btn-sm" onclick="ExpenseModule.deleteExpense('${e.id}')"><i class="bi bi-trash"></i></button>
            </td>
          </tr>
        `).join('');
      }
    }

    const countEl = document.getElementById('expenseCountLabel');
    if (countEl) countEl.textContent = `${list.length} record${list.length !== 1 ? 's' : ''}`;
  }

  function bindEvents() {
    document.getElementById('btnSaveExpense')?.addEventListener('click', saveExpense);
    document.getElementById('btnAddExpense')?.addEventListener('click', openAddModal);
    document.getElementById('btnAddExpenseDash')?.addEventListener('click', () => {
      App.navigate('expenses');
      openAddModal();
    });

    document.getElementById('expenseCategory')?.addEventListener('change', (e) => {
      updateCategoryDependentFields(e.target.value);
    });
    document.getElementById('expensePayment')?.addEventListener('change', (e) => {
      updatePaymentDependentFields(e.target.value);
    });

    document.getElementById('filterCategory')?.addEventListener('change', (e) => setFilters({ category: e.target.value }));
    document.getElementById('filterBank')?.addEventListener('change', (e) => setFilters({ bank: e.target.value }));
    document.getElementById('filterPayment')?.addEventListener('change', (e) => setFilters({ payment: e.target.value }));
    document.getElementById('filterDateFrom')?.addEventListener('change', (e) => setFilters({ dateFrom: e.target.value }));
    document.getElementById('filterDateTo')?.addEventListener('change', (e) => setFilters({ dateTo: e.target.value }));
    document.getElementById('btnClearFilters')?.addEventListener('click', clearFilters);

    document.querySelectorAll('[data-sort]').forEach((el) => {
      el.addEventListener('click', () => setSort(el.dataset.sort));
    });
  }

  return {
    bindEvents,
    renderTable,
    populateFormSelects,
    openAddModal,
    openEditModal,
    deleteExpense,
    setFilters,
    clearFilters,
    getFilteredExpenses
  };
})();
