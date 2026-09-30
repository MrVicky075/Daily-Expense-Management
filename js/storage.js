/**
 * Expense Management - Centralized Storage Manager
 * All LocalStorage access goes through this module.
 * Structured so IndexedDB can replace LocalStorage later.
 */

const Storage = (() => {
  const STORAGE_KEY = 'expenseManagementData';
  const LAST_AUTO_BACKUP_KEY = 'expenseManagement_lastAutoBackup';
  const VERSION = '1.0';

  let cache = null;

  function defaultData() {
    return {
      version: VERSION,
      expenses: [],
      income: [],
      rpd: [],
      categories: [
        { id: 'CAT-HOME', name: 'HOME', isDefault: true, color: '#198754' },
        { id: 'CAT-BIG', name: 'BIG-EXPENSE', isDefault: true, color: '#dc3545' },
        { id: 'CAT-OTHER', name: 'OTHER', isDefault: true, color: '#6c757d' },
        { id: 'CAT-FOOD', name: 'FOOD', isDefault: true, color: '#fd7e14' },
        { id: 'CAT-PETROL', name: 'PETROL', isDefault: true, color: '#0d6efd' }
      ],
      incomeTypes: [
        { id: 'INC-IPO', name: 'IPO', isDefault: true },
        { id: 'INC-SAL', name: 'Salary', isDefault: true },
        { id: 'INC-OTH', name: 'Other Income', isDefault: true }
      ],
      bankAccounts: [
        {
          id: 'BANK-JIO',
          name: 'JIO',
          openingBalance: 0,
          currentBalance: 0,
          transactions: [],
          createdAt: Utils.nowISO(),
          updatedAt: Utils.nowISO()
        },
        {
          id: 'BANK-YES',
          name: 'YES',
          openingBalance: 0,
          currentBalance: 0,
          transactions: [],
          createdAt: Utils.nowISO(),
          updatedAt: Utils.nowISO()
        },
        {
          id: 'BANK-ADC',
          name: 'ADC',
          openingBalance: 0,
          currentBalance: 0,
          transactions: [],
          createdAt: Utils.nowISO(),
          updatedAt: Utils.nowISO()
        }
      ],
      paymentMethods: ['Cash', 'UPI'],
      settings: {
        autoBackup: true,
        autoBackupTime: '20:00',
        currency: '₹',
        isSampleData: false,
        selectedMonth: null,
        backupFolderName: ''
      },
      meta: {
        lastSaved: null,
        lastBackup: null,
        lastAutoBackup: null,
        lastUpdateDate: null,
        createdAt: Utils.nowISO()
      }
    };
  }

  function recalculateBankBalances(data) {
    data.bankAccounts.forEach((bank) => {
      let balance = Number(bank.openingBalance) || 0;
      data.income.forEach((inc) => {
        if (inc.bankAccount === bank.name) balance += Number(inc.amount) || 0;
      });
      data.expenses.forEach((exp) => {
        if (exp.bankAccount === bank.name) balance -= Number(exp.amount) || 0;
      });
      bank.currentBalance = balance;
      bank.updatedAt = Utils.nowISO();
    });
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        cache = defaultData();
        cache.settings.selectedMonth = Utils.currentMonthKey();
        saveData(cache);
        return cache;
      }
      cache = JSON.parse(raw);
      // Ensure required keys exist (migration-safe)
      const defaults = defaultData();
      cache.version = cache.version || VERSION;
      cache.expenses = cache.expenses || [];
      cache.income = cache.income || [];
      cache.rpd = cache.rpd || [];
      cache.categories = cache.categories || defaults.categories;
      cache.incomeTypes = cache.incomeTypes || defaults.incomeTypes;
      cache.bankAccounts = cache.bankAccounts || [];
      cache.paymentMethods = cache.paymentMethods || defaults.paymentMethods;
      cache.settings = Object.assign({}, defaults.settings, cache.settings || {});
      cache.meta = Object.assign({}, defaults.meta, cache.meta || {});

      // Remove legacy "RPD Income" from income types (RPD has its own page)
      const beforeTypes = cache.incomeTypes.length;
      cache.incomeTypes = cache.incomeTypes.filter(
        (t) => t.id !== 'INC-RPD' && String(t.name).toLowerCase() !== 'rpd income'
      );
      let migrated = cache.incomeTypes.length !== beforeTypes;

      // Ensure default bank accounts JIO, YES, ADC exist
      const requiredBanks = ['JIO', 'YES', 'ADC'];
      requiredBanks.forEach((name) => {
        const exists = cache.bankAccounts.some(
          (b) => String(b.name).trim().toUpperCase() === name
        );
        if (!exists) {
          cache.bankAccounts.push({
            id: Utils.generateId('BANK'),
            name,
            openingBalance: 0,
            currentBalance: 0,
            transactions: [],
            createdAt: Utils.nowISO(),
            updatedAt: Utils.nowISO()
          });
          migrated = true;
        }
      });

      // Remove legacy demo/sample data so the app starts clean
      if (cache.settings.isSampleData) {
        cache = defaultData();
        cache.settings.selectedMonth = Utils.currentMonthKey();
        saveData(cache);
        return cache;
      }
      const hadSample =
        cache.expenses.some((e) => e.isSample) || cache.income.some((i) => i.isSample);
      if (hadSample) {
        cache.expenses = cache.expenses.filter((e) => !e.isSample);
        cache.income = cache.income.filter((i) => !i.isSample);
        cache.settings.isSampleData = false;
        recalculateBankBalances(cache);
        migrated = true;
      }

      if (migrated) {
        recalculateBankBalances(cache);
        saveData(cache);
      }

      return cache;
    } catch (err) {
      console.error('Failed to load data:', err);
      cache = defaultData();
      cache.settings.selectedMonth = Utils.currentMonthKey();
      return cache;
    }
  }

  function getData() {
    if (!cache) return loadData();
    return cache;
  }

  function saveData(data, options = {}) {
    try {
      if (data) cache = data;
      if (!cache) cache = defaultData();
      if (!cache.meta) cache.meta = {};
      cache.meta.lastSaved = Utils.nowISO();
      // Track the calendar day the sheet was last updated (Excel-style)
      if (!options.skipTouchUpdate) {
        cache.meta.lastUpdateDate = Utils.todayISO();
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
      return true;
    } catch (err) {
      console.error('Failed to save data:', err);
      Utils.showToast('Failed to save data. Storage may be full.', 'danger');
      return false;
    }
  }

  function persist(options) {
    return saveData(cache, options);
  }

  function getLastUpdateDate() {
    const meta = getMeta();
    return meta.lastUpdateDate || (meta.lastSaved ? Utils.formatISODate(new Date(meta.lastSaved)) : Utils.todayISO());
  }

  function setLastUpdateDate(dateStr) {
    const data = getData();
    if (!data.meta) data.meta = {};
    data.meta.lastUpdateDate = dateStr || Utils.todayISO();
    return persist({ skipTouchUpdate: true });
  }

  /* ---------- Expenses ---------- */

  function addExpense(expense) {
    const data = getData();
    const record = {
      id: expense.id || Utils.generateId('EXP'),
      date: expense.date,
      month: Utils.getMonthKey(expense.date),
      category: expense.category,
      subcategory: expense.subcategory || '',
      amount: Number(expense.amount),
      description: expense.description || '',
      paymentMethod: expense.paymentMethod || '',
      bankAccount: expense.bankAccount || '',
      notes: expense.notes || '',
      isSample: false,
      createdAt: Utils.nowISO(),
      updatedAt: Utils.nowISO()
    };
    data.expenses.push(record);
    recalculateBankBalances(data);
    persist();
    return record;
  }

  function updateExpense(id, updates) {
    const data = getData();
    const idx = data.expenses.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    const existing = data.expenses[idx];
    data.expenses[idx] = {
      ...existing,
      ...updates,
      id: existing.id,
      month: Utils.getMonthKey(updates.date || existing.date),
      amount: Number(updates.amount !== undefined ? updates.amount : existing.amount),
      updatedAt: Utils.nowISO()
    };
    recalculateBankBalances(data);
    persist();
    return data.expenses[idx];
  }

  function deleteExpense(id) {
    const data = getData();
    const before = data.expenses.length;
    data.expenses = data.expenses.filter((e) => e.id !== id);
    if (data.expenses.length === before) return false;
    recalculateBankBalances(data);
    persist();
    return true;
  }

  function getExpenseById(id) {
    return getData().expenses.find((e) => e.id === id) || null;
  }

  function getExpensesByMonth(monthKey) {
    return getData().expenses.filter((e) => e.month === monthKey);
  }

  /* ---------- Income ---------- */

  function addIncome(income) {
    const data = getData();
    const record = {
      id: income.id || Utils.generateId('INC'),
      date: income.date,
      month: Utils.getMonthKey(income.date),
      type: income.type,
      amount: Number(income.amount),
      description: income.description || '',
      bankAccount: income.bankAccount || '',
      notes: income.notes || '',
      isSample: false,
      createdAt: Utils.nowISO(),
      updatedAt: Utils.nowISO()
    };
    data.income.push(record);
    recalculateBankBalances(data);
    persist();
    return record;
  }

  function updateIncome(id, updates) {
    const data = getData();
    const idx = data.income.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    const existing = data.income[idx];
    data.income[idx] = {
      ...existing,
      ...updates,
      id: existing.id,
      month: Utils.getMonthKey(updates.date || existing.date),
      amount: Number(updates.amount !== undefined ? updates.amount : existing.amount),
      updatedAt: Utils.nowISO()
    };
    recalculateBankBalances(data);
    persist();
    return data.income[idx];
  }

  function deleteIncome(id) {
    const data = getData();
    const before = data.income.length;
    data.income = data.income.filter((i) => i.id !== id);
    if (data.income.length === before) return false;
    recalculateBankBalances(data);
    persist();
    return true;
  }

  function getIncomeById(id) {
    return getData().income.find((i) => i.id === id) || null;
  }

  function getIncomeByMonth(monthKey) {
    return getData().income.filter((i) => i.month === monthKey);
  }

  /* ---------- RPD ---------- */

  function addRpd(entry) {
    const data = getData();
    const record = {
      id: entry.id || Utils.generateId('RPD'),
      date: entry.date,
      month: Utils.getMonthKey(entry.date),
      amount: Number(entry.amount),
      type: entry.type,
      notes: entry.notes || '',
      createdAt: Utils.nowISO(),
      updatedAt: Utils.nowISO()
    };
    data.rpd.push(record);
    persist();
    return record;
  }

  function updateRpd(id, updates) {
    const data = getData();
    const idx = data.rpd.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    const existing = data.rpd[idx];
    data.rpd[idx] = {
      ...existing,
      ...updates,
      id: existing.id,
      month: Utils.getMonthKey(updates.date || existing.date),
      amount: Number(updates.amount !== undefined ? updates.amount : existing.amount),
      updatedAt: Utils.nowISO()
    };
    persist();
    return data.rpd[idx];
  }

  function deleteRpd(id) {
    const data = getData();
    const before = data.rpd.length;
    data.rpd = data.rpd.filter((r) => r.id !== id);
    if (data.rpd.length === before) return false;
    persist();
    return true;
  }

  function getRpdById(id) {
    return getData().rpd.find((r) => r.id === id) || null;
  }

  function getRpdByMonth(monthKey) {
    return getData().rpd.filter((r) => r.month === monthKey);
  }

  function getAllRpd() {
    return getData().rpd.slice();
  }

  /* ---------- Categories ---------- */

  function addCategory(name, color) {
    const data = getData();
    const trimmed = String(name).trim().toUpperCase();
    if (!trimmed) return { error: 'Category name is required.' };
    if (data.categories.some((c) => c.name.toUpperCase() === trimmed)) {
      return { error: 'Category already exists.' };
    }
    const cat = {
      id: Utils.generateId('CAT'),
      name: trimmed,
      isDefault: false,
      color: color || Utils.categoryColor(data.categories.length)
    };
    data.categories.push(cat);
    persist();
    return { category: cat };
  }

  function deleteCategory(id) {
    const data = getData();
    const cat = data.categories.find((c) => c.id === id);
    if (!cat) return { error: 'Category not found.' };
    if (cat.isDefault) return { error: 'Default categories cannot be deleted.' };
    const inUse = data.expenses.some((e) => e.category === cat.name);
    if (inUse) return { error: 'Cannot delete category that has Expenses. Reassign them first.' };
    data.categories = data.categories.filter((c) => c.id !== id);
    persist();
    return { success: true };
  }

  function getCategories() {
    return getData().categories;
  }

  /* ---------- Income Types ---------- */

  function addIncomeType(name) {
    const data = getData();
    const trimmed = String(name).trim();
    if (!trimmed) return { error: 'Income type is required.' };
    if (data.incomeTypes.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) {
      return { error: 'Income type already exists.' };
    }
    const type = { id: Utils.generateId('INCT'), name: trimmed, isDefault: false };
    data.incomeTypes.push(type);
    persist();
    return { incomeType: type };
  }

  function deleteIncomeType(id) {
    const data = getData();
    const type = data.incomeTypes.find((t) => t.id === id);
    if (!type) return { error: 'Income type not found.' };
    if (type.isDefault) return { error: 'Default Income types cannot be deleted.' };
    const inUse = data.income.some((i) => i.type === type.name);
    if (inUse) return { error: 'Cannot delete Income type that is in use.' };
    data.incomeTypes = data.incomeTypes.filter((t) => t.id !== id);
    persist();
    return { success: true };
  }

  /* ---------- Bank Accounts ---------- */

  function addBankAccount(name, openingBalance) {
    const data = getData();
    const trimmed = String(name).trim();
    if (!trimmed) return { error: 'Account name is required.' };
    if (data.bankAccounts.some((b) => b.name.toLowerCase() === trimmed.toLowerCase())) {
      return { error: 'Bank account already exists.' };
    }
    const now = Utils.nowISO();
    const opening = Number(openingBalance) || 0;
    const bank = {
      id: Utils.generateId('BANK'),
      name: trimmed,
      openingBalance: opening,
      currentBalance: opening,
      transactions: [],
      createdAt: now,
      updatedAt: now
    };
    data.bankAccounts.push(bank);
    recalculateBankBalances(data);
    persist();
    return { bank };
  }

  function updateBankAccount(id, updates) {
    const data = getData();
    const idx = data.bankAccounts.findIndex((b) => b.id === id);
    if (idx === -1) return { error: 'Account not found.' };
    const existing = data.bankAccounts[idx];
    if (updates.name) {
      const name = String(updates.name).trim();
      const clash = data.bankAccounts.some(
        (b) => b.id !== id && b.name.toLowerCase() === name.toLowerCase()
      );
      if (clash) return { error: 'Another account with this name exists.' };
      // Update references in expenses/income
      data.expenses.forEach((e) => {
        if (e.bankAccount === existing.name) e.bankAccount = name;
      });
      data.income.forEach((i) => {
        if (i.bankAccount === existing.name) i.bankAccount = name;
      });
      existing.name = name;
    }
    if (updates.openingBalance !== undefined) {
      existing.openingBalance = Number(updates.openingBalance) || 0;
    }
    existing.updatedAt = Utils.nowISO();
    recalculateBankBalances(data);
    persist();
    return { bank: existing };
  }

  function deleteBankAccount(id) {
    const data = getData();
    const bank = data.bankAccounts.find((b) => b.id === id);
    if (!bank) return { error: 'Account not found.' };
    const inUse =
      data.expenses.some((e) => e.bankAccount === bank.name) ||
      data.income.some((i) => i.bankAccount === bank.name);
    if (inUse) {
      return { error: 'Cannot delete account that has transactions. Clear references first.' };
    }
    data.bankAccounts = data.bankAccounts.filter((b) => b.id !== id);
    persist();
    return { success: true };
  }

  function getBankAccounts() {
    return getData().bankAccounts;
  }

  function getTotalBankBalance() {
    return getData().bankAccounts.reduce((sum, b) => sum + (Number(b.currentBalance) || 0), 0);
  }

  /* ---------- Calculations ---------- */

  function getMonthTotals(monthKey) {
    const expenses = getExpensesByMonth(monthKey);
    const incomes = getIncomeByMonth(monthKey);
    const totalExpense = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const totalIncome = incomes.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const categoryTotals = {};
    getCategories().forEach((c) => {
      categoryTotals[c.name] = 0;
    });
    expenses.forEach((e) => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + (Number(e.amount) || 0);
    });
    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      categoryTotals,
      expenseCount: expenses.length,
      incomeCount: incomes.length
    };
  }

  function getDailySummary(monthKey) {
    const expenses = getExpensesByMonth(monthKey);
    const incomes = getIncomeByMonth(monthKey);
    const map = {};
    expenses.forEach((e) => {
      if (!map[e.date]) map[e.date] = { date: e.date, expense: 0, income: 0 };
      map[e.date].expense += Number(e.amount) || 0;
    });
    incomes.forEach((i) => {
      if (!map[i.date]) map[i.date] = { date: i.date, expense: 0, income: 0 };
      map[i.date].income += Number(i.amount) || 0;
    });
    return Object.values(map)
      .map((d) => ({ ...d, balance: d.income - d.expense }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /* ---------- Settings ---------- */

  function getSettings() {
    return getData().settings;
  }

  function updateSettings(partial) {
    const data = getData();
    Object.assign(data.settings, partial);
    persist({ skipTouchUpdate: true });
    return data.settings;
  }

  function getMeta() {
    return getData().meta;
  }

  function setSelectedMonth(monthKey) {
    return updateSettings({ selectedMonth: monthKey });
  }

  function getSelectedMonth() {
    const settings = getSettings();
    return settings.selectedMonth || Utils.currentMonthKey();
  }

  /* ---------- Backup helpers ---------- */

  function exportBackupObject() {
    const data = getData();
    return {
      version: data.version || VERSION,
      backupDate: Utils.nowISO(),
      expenses: data.expenses,
      income: data.income,
      rpd: data.rpd,
      categories: data.categories,
      incomeTypes: data.incomeTypes,
      bankAccounts: data.bankAccounts,
      paymentMethods: data.paymentMethods,
      settings: data.settings,
      meta: data.meta
    };
  }

  function createSafetyBackup() {
    const backup = exportBackupObject();
    const key = `expenseManagement_safetyBackup_${Date.now()}`;
    try {
      localStorage.setItem(key, JSON.stringify(backup));
      // Keep only last 3 safety backups
      const safetyKeys = Object.keys(localStorage)
        .filter((k) => k.startsWith('expenseManagement_safetyBackup_'))
        .sort();
      while (safetyKeys.length > 3) {
        localStorage.removeItem(safetyKeys.shift());
      }
    } catch (e) {
      console.warn('Could not create safety backup in localStorage', e);
    }
    return backup;
  }

  function restoreFromBackup(backup) {
    if (!backup || typeof backup !== 'object') {
      return { error: 'Invalid backup file.' };
    }
    if (!Array.isArray(backup.expenses) || !Array.isArray(backup.income)) {
      return { error: 'Invalid backup file. Missing Expenses or Income.' };
    }

    createSafetyBackup();

    const data = defaultData();
    data.version = backup.version || VERSION;
    data.expenses = backup.expenses || [];
    data.income = backup.income || [];
    data.rpd = backup.rpd || [];
    data.categories = backup.categories || data.categories;
    data.incomeTypes = backup.incomeTypes || data.incomeTypes;
    data.bankAccounts = backup.bankAccounts || [];
    data.paymentMethods = backup.paymentMethods || data.paymentMethods;
    data.settings = Object.assign({}, data.settings, backup.settings || {});
    data.meta = Object.assign({}, data.meta, backup.meta || {});
    data.meta.lastBackup = Utils.nowISO();
    data.settings.isSampleData = false;

    recalculateBankBalances(data);
    cache = data;
    persist();
    return { success: true };
  }

  function markBackupDone(isAuto) {
    const data = getData();
    const now = Utils.nowISO();
    data.meta.lastBackup = now;
    if (isAuto) {
      data.meta.lastAutoBackup = now;
      localStorage.setItem(LAST_AUTO_BACKUP_KEY, Utils.todayISO());
    }
    persist({ skipTouchUpdate: true });
  }

  function getLastAutoBackupDate() {
    return localStorage.getItem(LAST_AUTO_BACKUP_KEY) || null;
  }

  function getAutoBackupTime() {
    const settings = getSettings();
    const time = settings.autoBackupTime || '20:00';
    return /^\d{2}:\d{2}$/.test(time) ? time : '20:00';
  }

  function isPastAutoBackupTime(now = new Date()) {
    const [hh, mm] = getAutoBackupTime().split(':').map(Number);
    const minutesNow = now.getHours() * 60 + now.getMinutes();
    const minutesTarget = hh * 60 + mm;
    return minutesNow >= minutesTarget;
  }

  function needsAutoBackup() {
    const settings = getSettings();
    if (!settings.autoBackup) return false;
    const last = getLastAutoBackupDate();
    if (last === Utils.todayISO()) return false;
    return isPastAutoBackupTime();
  }

  function getNextAutoBackupLabel() {
    const settings = getSettings();
    if (!settings.autoBackup) return 'Disabled';
    const time = getAutoBackupTime();
    const last = getLastAutoBackupDate();
    const today = Utils.todayISO();
    if (last === today) {
      const next = new Date();
      next.setDate(next.getDate() + 1);
      return `${Utils.formatDateDisplay(Utils.formatISODate(next))} at ${time}`;
    }
    if (isPastAutoBackupTime()) {
      return `Today at ${time} (due now)`;
    }
    return `Today at ${time}`;
  }

  function clearAllData() {
    createSafetyBackup();
    cache = defaultData();
    cache.settings.selectedMonth = Utils.currentMonthKey();
    persist();
    localStorage.removeItem(LAST_AUTO_BACKUP_KEY);
  }

  function replaceAllData(newData) {
    createSafetyBackup();
    cache = Object.assign(defaultData(), newData);
    recalculateBankBalances(cache);
    persist();
  }

  return {
    STORAGE_KEY,
    LAST_AUTO_BACKUP_KEY,
    VERSION,
    loadData,
    getData,
    saveData,
    persist,
    recalculateBankBalances,
    addExpense,
    updateExpense,
    deleteExpense,
    getExpenseById,
    getExpensesByMonth,
    addIncome,
    updateIncome,
    deleteIncome,
    getIncomeById,
    getIncomeByMonth,
    addRpd,
    updateRpd,
    deleteRpd,
    getRpdById,
    getRpdByMonth,
    getAllRpd,
    addCategory,
    deleteCategory,
    getCategories,
    addIncomeType,
    deleteIncomeType,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    getBankAccounts,
    getTotalBankBalance,
    getMonthTotals,
    getDailySummary,
    getSettings,
    updateSettings,
    getMeta,
    getLastUpdateDate,
    setLastUpdateDate,
    setSelectedMonth,
    getSelectedMonth,
    exportBackupObject,
    createSafetyBackup,
    restoreFromBackup,
    markBackupDone,
    getLastAutoBackupDate,
    getAutoBackupTime,
    isPastAutoBackupTime,
    needsAutoBackup,
    getNextAutoBackupLabel,
    clearAllData,
    replaceAllData
  };
})();
