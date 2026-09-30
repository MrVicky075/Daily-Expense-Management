/**
 * Expense Management - Dashboard, Excel View, Calculations
 */

const Dashboard = (() => {
  function updateMonthLabel() {
    const monthKey = Storage.getSelectedMonth();
    const label = Utils.formatMonthLabel(monthKey);
    document.querySelectorAll('.current-month-label').forEach((el) => {
      el.textContent = label;
    });
    const select = document.getElementById('monthSelect');
    if (select) select.value = monthKey;
  }

  function populateMonthSelect() {
    const select = document.getElementById('monthSelect');
    if (!select) return;
    const current = Utils.currentMonthKey();
    const selected = Storage.getSelectedMonth();
    // Generate range: 24 months back, 6 months forward
    const options = [];
    for (let i = -24; i <= 6; i++) {
      const key = Utils.shiftMonth(current, i);
      options.push(`<option value="${key}">${Utils.formatMonthLabel(key)}</option>`);
    }
    select.innerHTML = options.join('');
    select.value = selected;
  }

  function setMonth(monthKey) {
    Storage.setSelectedMonth(monthKey);
    App.refreshAll();
  }

  function prevMonth() {
    setMonth(Utils.shiftMonth(Storage.getSelectedMonth(), -1));
  }

  function nextMonth() {
    setMonth(Utils.shiftMonth(Storage.getSelectedMonth(), 1));
  }

  function renderStats() {
    const monthKey = Storage.getSelectedMonth();
    const totals = Storage.getMonthTotals(monthKey);

    const setText = (id, value, className) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = value;
      if (className) el.className = className;
    };

    setText('dashTotalIncome', Utils.formatCurrency(totals.totalIncome), 'stat-value text-income');
    setText('dashTotalExpense', Utils.formatCurrency(totals.totalExpense), 'stat-value text-expense');

    const balClass = 'stat-value ' + (totals.balance >= 0 ? 'balance-positive' : 'balance-negative');
    setText('dashBalance', Utils.formatCurrency(totals.balance), balClass);

    // Calculation section
    setText('calcTotalIncome', Utils.formatCurrency(totals.totalIncome));
    setText('calcTotalExpense', Utils.formatCurrency(totals.totalExpense));
    const calcBal = document.getElementById('calcBalance');
    if (calcBal) {
      calcBal.textContent = Utils.formatCurrency(totals.balance);
      calcBal.className = totals.balance >= 0 ? 'amount-income' : 'amount-expense';
    }

    const bankTotal = Storage.getTotalBankBalance();
    const cashDiff = bankTotal - totals.balance;
    setText('calcCashDiff', Utils.formatCurrency(cashDiff));

    // Category cards on dashboard
    const catContainer = document.getElementById('categorySummaryCards');
    if (catContainer) {
      const categories = Storage.getCategories();
      const expenses = Storage.getExpensesByMonth(monthKey);
      catContainer.innerHTML = categories.map((c) => {
        const amount = totals.categoryTotals[c.name] || 0;
        const count = expenses.filter((e) => e.category === c.name).length;
        return `
          <div class="col-6 col-md-4 col-lg">
            <div class="card category-card h-100">
              <div class="card-body py-3">
                <div class="cat-name">${Utils.escapeHtml(c.name)}</div>
                <div class="cat-amount">${Utils.formatCurrency(amount)}</div>
                <div class="cat-count">${count} entr${count === 1 ? 'y' : 'ies'}</div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    // Category summary table (reports)
    const catTable = document.getElementById('categorySummaryTableBody');
    if (catTable) {
      const categories = Storage.getCategories();
      let rows = categories.map((c) => {
        const amount = totals.categoryTotals[c.name] || 0;
        return `<tr><td>${Utils.escapeHtml(c.name)}</td><td class="amount-expense">${Utils.formatCurrency(amount)}</td></tr>`;
      }).join('');
      rows += `<tr class="fw-bold table-light"><td>TOTAL</td><td class="amount-expense">${Utils.formatCurrency(totals.totalExpense)}</td></tr>`;
      catTable.innerHTML = rows;
    }

    // Daily summary table
    const dailyBody = document.getElementById('dailySummaryTableBody');
    if (dailyBody) {
      const daily = Storage.getDailySummary(monthKey);
      if (daily.length === 0) {
        dailyBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-3">No transactions this month.</td></tr>`;
      } else {
        dailyBody.innerHTML = daily.map((d) => `
          <tr>
            <td>${Utils.escapeHtml(Utils.formatDateDisplay(d.date))}</td>
            <td class="amount-expense">${Utils.formatCurrency(d.expense)}</td>
            <td class="amount-income">${Utils.formatCurrency(d.income)}</td>
            <td class="${d.balance >= 0 ? 'amount-income' : 'amount-expense'}">${Utils.formatCurrency(d.balance)}</td>
          </tr>
        `).join('');
      }
    }
  }

  function renderExcelView() {
    const monthKey = Storage.getSelectedMonth();
    const categories = Storage.getCategories();
    const expenses = Storage.getExpensesByMonth(monthKey);
    const incomes = Storage.getIncomeByMonth(monthKey);
    const totals = Storage.getMonthTotals(monthKey);
    const banks = Storage.getBankAccounts();

    const titleEl = document.getElementById('excelSheetTitle');
    if (titleEl) titleEl.textContent = Utils.formatMonthLabel(monthKey).toUpperCase();

    const grid = document.getElementById('excelCategoryGrid');
    if (grid) {
      grid.innerHTML = categories.map((c) => {
        const items = expenses.filter((e) => e.category === c.name);
        const total = totals.categoryTotals[c.name] || 0;
        const entries = items.length
          ? items.map((e) => `<div class="excel-entry">${e.amount} ${Utils.escapeHtml(e.description || '')}</div>`).join('')
          : `<div class="excel-entry text-muted">—</div>`;
        return `
          <div class="excel-cat-box">
            <div class="excel-cat-header">${Utils.escapeHtml(c.name)}</div>
            <div class="excel-cat-body">${entries}</div>
            <div class="excel-cat-total">TOTAL ${total}</div>
          </div>
        `;
      }).join('');
    }

    const grand = document.getElementById('excelGrandTotal');
    if (grand) grand.textContent = `TOTAL EXPENSE = ${totals.totalExpense}`;

    // Income boxes
    const incomeGrid = document.getElementById('excelIncomeGrid');
    if (incomeGrid) {
      const typeMap = {};
      incomes.forEach((i) => {
        if (!typeMap[i.type]) typeMap[i.type] = [];
        typeMap[i.type].push(i);
      });
      const types = Storage.getData().incomeTypes.map((t) => t.name);
      // Also include types present in data
      incomes.forEach((i) => {
        if (!types.includes(i.type)) types.push(i.type);
      });

      const boxes = ['calculation', ...types.slice(0, 4)];
      // Show calculation + up to a few income types like the screenshot
      const calcHtml = `
        <div class="excel-cat-box">
          <div class="excel-cat-header">calculation</div>
          <div class="excel-cat-body">
            <div class="excel-entry">Income: ${totals.totalIncome}</div>
            <div class="excel-entry">Expenses: ${totals.totalExpense}</div>
            <div class="excel-entry">Balance: ${totals.balance}</div>
          </div>
          <div class="excel-cat-total">TOTAL ${totals.balance}</div>
        </div>
      `;

      const incomeBoxes = Object.keys(typeMap).map((type) => {
        const items = typeMap[type];
        const total = items.reduce((s, i) => s + Number(i.amount), 0);
        const entries = items.map((i) => `<div class="excel-entry">${i.amount} ${Utils.escapeHtml(i.description || i.type)}</div>`).join('');
        return `
          <div class="excel-cat-box">
            <div class="excel-cat-header">${Utils.escapeHtml(type)}</div>
            <div class="excel-cat-body">${entries}</div>
            <div class="excel-cat-total">TOTAL ${total}</div>
          </div>
        `;
      }).join('');

      // Empty income type placeholders if none
      const emptyIncome = incomes.length === 0
        ? `<div class="excel-cat-box"><div class="excel-cat-header">Income</div><div class="excel-cat-body"><div class="excel-entry text-muted">—</div></div><div class="excel-cat-total">TOTAL 0</div></div>`
        : '';

      incomeGrid.innerHTML = calcHtml + (incomeBoxes || emptyIncome);
    }

    // Bank section
    const bankEl = document.getElementById('excelBankSection');
    if (bankEl) {
      if (banks.length === 0) {
        bankEl.innerHTML = '<p class="text-muted mb-0">No bank accounts.</p>';
      } else {
        bankEl.innerHTML = `
          <h5>Bank Balance</h5>
          <div class="row g-2">
            ${banks.map((b) => `
              <div class="col-6 col-md-3">
                <strong>${Utils.escapeHtml(b.name)}</strong><br>
                <span>${Utils.formatCurrency(b.currentBalance)}</span>
              </div>
            `).join('')}
          </div>
          <div class="mt-2 fw-bold">Total: ${Utils.formatCurrency(Storage.getTotalBankBalance())}</div>
        `;
      }
    }
  }

  function renderBackupStatus() {
    const meta = Storage.getMeta();
    const settings = Storage.getSettings();

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setVal('statusLastSaved', Utils.formatDateTime(meta.lastSaved));
    setVal('statusLastBackup', Utils.formatDateTime(meta.lastBackup));
    setVal('statusAutoBackup', settings.autoBackup ? 'Enabled' : 'Disabled');
    setVal('statusStorage', 'Local Browser');

    // Dashboard editable "last update date"
    const dashDate = document.getElementById('dashLastUpdateDate');
    if (dashDate && document.activeElement !== dashDate) {
      dashDate.value = Storage.getLastUpdateDate();
    }

    const lastAuto = Storage.getLastAutoBackupDate();
    setVal('settingsLastAutoBackup', lastAuto ? Utils.formatDateDisplay(lastAuto) + ' (date)' : 'Never');
    setVal('settingsNextBackup', Storage.getNextAutoBackupLabel());
    setVal('settingsBackupTime', Storage.getAutoBackupTime());

    setVal('settingsBackupLocation', Utils.getBackupLocationLabel(settings));
    const locInput = document.getElementById('backupLocationInput');
    if (locInput) {
      locInput.value = settings.backupFolderName || '';
      if (!locInput.value) locInput.placeholder = 'Browser Downloads (default)';
    }

    const timeInput = document.getElementById('autoBackupTime');
    if (timeInput && document.activeElement !== timeInput) {
      timeInput.value = Storage.getAutoBackupTime();
    }

    const toggle = document.getElementById('autoBackupToggle');
    if (toggle) toggle.checked = !!settings.autoBackup;
  }

  function onLastUpdateDateChange(e) {
    const value = e.target.value;
    if (!value) {
      Utils.showToast('Please select a date.', 'warning');
      e.target.value = Storage.getLastUpdateDate();
      return;
    }
    Storage.setLastUpdateDate(value);
    Utils.showToast('Last update date saved.', 'success');
    renderBackupStatus();
  }

  function render() {
    updateMonthLabel();
    renderStats();
    renderExcelView();
    renderBackupStatus();
  }

  function bindEvents() {
    populateMonthSelect();
    document.getElementById('btnPrevMonth')?.addEventListener('click', prevMonth);
    document.getElementById('btnNextMonth')?.addEventListener('click', nextMonth);
    document.getElementById('monthSelect')?.addEventListener('change', (e) => setMonth(e.target.value));
    document.getElementById('dashLastUpdateDate')?.addEventListener('change', onLastUpdateDateChange);
  }

  return {
    bindEvents,
    render,
    populateMonthSelect,
    setMonth,
    prevMonth,
    nextMonth,
    renderExcelView,
    renderBackupStatus
  };
})();
