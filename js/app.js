/**
 * Expense Management - Main Application Controller
 */

const App = (() => {
  function navigate(page) {
    document.querySelectorAll('.page-section').forEach((el) => el.classList.remove('active'));
    document.querySelectorAll('.app-sidebar .nav-link').forEach((el) => el.classList.remove('active'));

    const section = document.getElementById(`page-${page}`);
    if (section) section.classList.add('active');

    const link = document.querySelector(`.app-sidebar .nav-link[data-page="${page}"]`);
    if (link) link.classList.add('active');

    // Close mobile sidebar
    document.getElementById('appSidebar')?.classList.remove('show');
    document.getElementById('sidebarOverlay')?.classList.remove('show');

    // Update page title in header
    const titles = {
      dashboard: 'Dashboard',
      expenses: 'Expenses',
      income: 'Income',
      banks: 'Bank Accounts',
      reports: 'Reports',
      excel: 'Excel View',
      backup: 'Backup & Restore',
      settings: 'Settings'
    };
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = titles[page] || 'Dashboard';

    window.scrollTo(0, 0);
  }

  function refreshAll() {
    Dashboard.populateMonthSelect();
    Dashboard.render();
    ExpenseModule.populateFormSelects();
    ExpenseModule.renderTable();
    IncomeModule.renderTable();
    BankModule.render();
    CategoriesModule.render();
    ChartsModule.render();
  }

  function bindNavigation() {
    document.querySelectorAll('[data-page]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(el.dataset.page);
      });
    });

    document.getElementById('btnToggleSidebar')?.addEventListener('click', () => {
      document.getElementById('appSidebar')?.classList.toggle('show');
      document.getElementById('sidebarOverlay')?.classList.toggle('show');
    });

    document.getElementById('sidebarOverlay')?.addEventListener('click', () => {
      document.getElementById('appSidebar')?.classList.remove('show');
      document.getElementById('sidebarOverlay')?.classList.remove('show');
    });
  }

  function bindSearch() {
    const syncAndFilter = Utils.debounce((sourceId, value) => {
      const q = value.trim();
      const global = document.getElementById('globalSearch');
      const expenseSearch = document.getElementById('expenseSearch');
      if (sourceId !== 'globalSearch' && global) global.value = value;
      if (sourceId !== 'expenseSearch' && expenseSearch) expenseSearch.value = value;
      ExpenseModule.setFilters({ search: q });
      if (q) navigate('expenses');
    }, 200);

    document.getElementById('globalSearch')?.addEventListener('input', (e) => {
      syncAndFilter('globalSearch', e.target.value);
    });
    document.getElementById('expenseSearch')?.addEventListener('input', (e) => {
      syncAndFilter('expenseSearch', e.target.value);
    });
  }

  function init() {
    // Load data (creates sample data on first visit)
    Storage.loadData();

    // Ensure selected month is set
    if (!Storage.getSettings().selectedMonth) {
      // Prefer sample month if sample data, else current
      if (Storage.getSettings().isSampleData) {
        Storage.setSelectedMonth('2026-09');
      } else {
        Storage.setSelectedMonth(Utils.currentMonthKey());
      }
    }

    bindNavigation();
    bindSearch();

    Dashboard.bindEvents();
    ExpenseModule.bindEvents();
    IncomeModule.bindEvents();
    BankModule.bindEvents();
    CategoriesModule.bindEvents();
    ExcelModule.bindEvents();
    BackupModule.bindEvents();

    refreshAll();
    navigate('dashboard');

    // Automatic daily backup (browser limitation: only when app is opened)
    setTimeout(() => BackupModule.checkAutoBackup(), 800);
  }

  return {
    init,
    navigate,
    refreshAll
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
