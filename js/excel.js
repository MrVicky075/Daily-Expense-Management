/**
 * Expense Management - Excel Export / Import (SheetJS)
 */

const ExcelModule = (() => {
  function exportExcel() {
    if (typeof XLSX === 'undefined') {
      Utils.showToast('SheetJS library not loaded.', 'danger');
      return;
    }

    const monthKey = Storage.getSelectedMonth();
    const totals = Storage.getMonthTotals(monthKey);
    const categories = Storage.getCategories();
    const expenses = Storage.getExpensesByMonth(monthKey);
    const incomes = Storage.getIncomeByMonth(monthKey);
    const banks = Storage.getBankAccounts();
    const daily = Storage.getDailySummary(monthKey);
    const wb = XLSX.utils.book_new();

    // Worksheet 1: Dashboard
    const dashRows = [
      ['Expense Management - Dashboard'],
      ['Month', Utils.formatMonthLabel(monthKey)],
      [],
      ['Total Income', totals.totalIncome],
      ['Total Expenses', totals.totalExpense],
      ['Balance', totals.balance],
      ['Total Bank Balance', Storage.getTotalBankBalance()],
      [],
      ['Category Summary'],
      ['Category', 'Amount']
    ];
    categories.forEach((c) => {
      dashRows.push([c.name, totals.categoryTotals[c.name] || 0]);
    });
    dashRows.push(['TOTAL', totals.totalExpense]);
    const wsDash = XLSX.utils.aoa_to_sheet(dashRows);
    wsDash['!cols'] = [{ wch: 24 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsDash, 'Dashboard');

    // Worksheet 2: Expenses
    const expRows = [
      ['ID', 'Date', 'Category', 'Amount', 'Description', 'Payment Method', 'Bank Account', 'Notes']
    ];
    expenses.forEach((e) => {
      expRows.push([e.id, e.date, e.category, e.amount, e.description, e.paymentMethod, e.bankAccount, e.notes]);
    });
    const wsExp = XLSX.utils.aoa_to_sheet(expRows);
    wsExp['!cols'] = [{ wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsExp, 'Expenses');

    // Worksheet 3: Income
    const incRows = [
      ['ID', 'Date', 'Type', 'Amount', 'Description', 'Bank Account', 'Notes']
    ];
    incomes.forEach((i) => {
      incRows.push([i.id, i.date, i.type, i.amount, i.description, i.bankAccount, i.notes]);
    });
    const wsInc = XLSX.utils.aoa_to_sheet(incRows);
    wsInc['!cols'] = [{ wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 20 }, { wch: 14 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsInc, 'Income');

    // Worksheet 4: Bank Balance
    const bankRows = [['Account', 'Opening Balance', 'Current Balance']];
    banks.forEach((b) => {
      bankRows.push([b.name, b.openingBalance, b.currentBalance]);
    });
    const wsBank = XLSX.utils.aoa_to_sheet(bankRows);
    wsBank['!cols'] = [{ wch: 18 }, { wch: 16 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsBank, 'Bank Balance');

    // Worksheet 5: Daily Summary
    const dailyRows = [['Date', 'Total Expense', 'Total Income', 'Balance']];
    daily.forEach((d) => {
      dailyRows.push([d.date, d.expense, d.income, d.balance]);
    });
    const wsDaily = XLSX.utils.aoa_to_sheet(dailyRows);
    wsDaily['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsDaily, 'Daily Summary');

    // Worksheet 6: Category Summary
    const catRows = [['Category', 'Total']];
    categories.forEach((c) => {
      catRows.push([c.name, totals.categoryTotals[c.name] || 0]);
    });
    catRows.push(['TOTAL', totals.totalExpense]);
    const wsCat = XLSX.utils.aoa_to_sheet(catRows);
    wsCat['!cols'] = [{ wch: 16 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsCat, 'Category Summary');

    const filename = `Expense-Management-${Utils.dateForFilename()}.xlsx`;
    XLSX.writeFile(wb, filename);
    Storage.markBackupDone(false);
    Utils.showToast('Excel file exported successfully.', 'success');
    Dashboard.renderBackupStatus();
  }

  let pendingImport = null;

  function sheetToObjects(ws) {
    return XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
  }

  /** Normalize Excel/SheetJS date cells to YYYY-MM-DD */
  function normalizeDate(value) {
    if (value == null || value === '') return '';
    if (typeof value === 'number' && typeof XLSX !== 'undefined' && XLSX.SSF) {
      try {
        const parsed = XLSX.SSF.parse_date_code(value);
        if (parsed) {
          return `${parsed.y}-${Utils.pad2(parsed.m)}-${Utils.pad2(parsed.d)}`;
        }
      } catch (e) { /* fall through */ }
    }
    const str = String(value).trim();
    // Already ISO-like
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10);
    // DD/MM/YYYY or MM/DD/YYYY — prefer Day-Month-Year for this app
    const m = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (m) {
      return `${m[3]}-${Utils.pad2(m[2])}-${Utils.pad2(m[1])}`;
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) return Utils.formatISODate(d);
    return '';
  }

  function handleExcelFile(file) {
    if (!file) return;
    if (typeof XLSX === 'undefined') {
      Utils.showToast('SheetJS library not loaded.', 'danger');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const names = wb.SheetNames;

        const required = ['Expenses', 'Income', 'Bank Balance'];
        const missing = required.filter((n) => !names.includes(n));
        if (missing.length) {
          Utils.showToast(`Invalid Excel file. Missing sheets: ${missing.join(', ')}`, 'danger');
          return;
        }

        const expensesRaw = sheetToObjects(wb.Sheets['Expenses']);
        const incomeRaw = sheetToObjects(wb.Sheets['Income']);
        const banksRaw = sheetToObjects(wb.Sheets['Bank Balance']);

        const expenses = expensesRaw
          .filter((r) => r.Date || r.date || r.Amount || r.amount)
          .map((r, i) => {
            const date = normalizeDate(r.Date || r.date);
            return {
              id: r.ID || r.id || Utils.generateId('EXP'),
              date,
              month: Utils.getMonthKey(date),
              category: r.Category || r.category || 'OTHER',
              amount: Number(r.Amount || r.amount) || 0,
              description: r.Description || r.description || '',
              paymentMethod: r['Payment Method'] || r.paymentMethod || '',
              bankAccount: r['Bank Account'] || r.bankAccount || '',
              notes: r.Notes || r.notes || '',
              createdAt: Utils.nowISO(),
              updatedAt: Utils.nowISO()
            };
          })
          .filter((e) => e.date && e.amount > 0);

        const income = incomeRaw
          .filter((r) => r.Date || r.date || r.Amount || r.amount)
          .map((r) => {
            const date = normalizeDate(r.Date || r.date);
            return {
              id: r.ID || r.id || Utils.generateId('INC'),
              date,
              month: Utils.getMonthKey(date),
              type: r.Type || r.type || 'Other Income',
              amount: Number(r.Amount || r.amount) || 0,
              description: r.Description || r.description || '',
              bankAccount: r['Bank Account'] || r.bankAccount || '',
              notes: r.Notes || r.notes || '',
              createdAt: Utils.nowISO(),
              updatedAt: Utils.nowISO()
            };
          })
          .filter((i) => i.date && i.amount > 0);

        const bankAccounts = banksRaw
          .filter((r) => r.Account || r.account || r.Name || r.name)
          .map((r) => {
            const name = r.Account || r.account || r.Name || r.name;
            const opening = Number(r['Opening Balance'] || r.openingBalance || 0) || 0;
            return {
              id: Utils.generateId('BANK'),
              name: String(name).trim(),
              openingBalance: opening,
              currentBalance: opening,
              transactions: [],
              createdAt: Utils.nowISO(),
              updatedAt: Utils.nowISO()
            };
          });

        pendingImport = { expenses, income, bankAccounts };

        document.getElementById('excelImportExpCount').textContent = expenses.length;
        document.getElementById('excelImportIncCount').textContent = income.length;
        document.getElementById('excelImportBankCount').textContent = bankAccounts.length;

        bootstrap.Modal.getOrCreateInstance(document.getElementById('excelImportModal')).show();
      } catch (err) {
        console.error(err);
        Utils.showToast('Failed to read Excel file.', 'danger');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function confirmExcelImport() {
    if (!pendingImport) return;

    Storage.createSafetyBackup();

    const data = Storage.getData();
    // Merge strategy: replace expenses/income/banks from import for a clean restore of exported file
    // Ensure categories cover imported expense categories
    pendingImport.expenses.forEach((e) => {
      if (!data.categories.some((c) => c.name === e.category)) {
        Storage.addCategory(e.category);
      }
    });
    pendingImport.income.forEach((i) => {
      if (!data.incomeTypes.some((t) => t.name === i.type)) {
        Storage.addIncomeType(i.type);
      }
    });

    // Replace core transactional data
    const fresh = Storage.getData();
    fresh.expenses = pendingImport.expenses;
    fresh.income = pendingImport.income;
    if (pendingImport.bankAccounts.length) {
      fresh.bankAccounts = pendingImport.bankAccounts;
    }
    fresh.settings.isSampleData = false;
    Storage.recalculateBankBalances(fresh);
    Storage.persist();

    pendingImport = null;
    bootstrap.Modal.getInstance(document.getElementById('excelImportModal')).hide();
    Utils.showToast('Excel data imported successfully.', 'success');
    App.refreshAll();
  }

  function bindEvents() {
    document.getElementById('btnDownloadExcel')?.addEventListener('click', exportExcel);
    document.getElementById('btnDownloadExcel2')?.addEventListener('click', exportExcel);
    document.getElementById('btnConfirmExcelImport')?.addEventListener('click', confirmExcelImport);

    const fileInput = document.getElementById('excelImportFile');
    document.getElementById('btnImportExcel')?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      handleExcelFile(file);
      e.target.value = '';
    });
  }

  return {
    bindEvents,
    exportExcel,
    handleExcelFile,
    confirmExcelImport
  };
})();
