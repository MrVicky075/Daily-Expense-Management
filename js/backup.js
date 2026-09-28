/**
 * Expense Management - JSON Backup / Restore / Auto Backup
 */

const BackupModule = (() => {
  let pendingRestore = null;

  function exportJSON() {
    const backup = Storage.exportBackupObject();
    const filename = `Expense-Backup-${Utils.timestampForFilename()}.json`;
    Utils.downloadJSON(backup, filename);
    Storage.markBackupDone(false);
    Utils.showToast('JSON backup exported successfully.', 'success');
    Dashboard.renderBackupStatus();
  }

  function exportAutoBackup() {
    const backup = Storage.exportBackupObject();
    const filename = `Expense-AutoBackup-${Utils.dateForFilename()}.json`;
    Utils.downloadJSON(backup, filename);
    Storage.markBackupDone(true);
    Dashboard.renderBackupStatus();
  }

  function checkAutoBackup() {
    if (!Storage.needsAutoBackup()) return;
    try {
      exportAutoBackup();
      Utils.showToast('Automatic daily backup downloaded.', 'info');
    } catch (err) {
      console.error('Auto backup failed', err);
    }
  }

  function handleJSONFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed || typeof parsed !== 'object') {
          Utils.showToast('Invalid backup file.', 'danger');
          return;
        }
        if (!Array.isArray(parsed.expenses) || !Array.isArray(parsed.income)) {
          Utils.showToast('Invalid backup file.', 'danger');
          return;
        }

        pendingRestore = parsed;

        document.getElementById('jsonBackupDate').textContent = parsed.backupDate
          ? Utils.formatDateTime(parsed.backupDate)
          : 'Unknown';
        document.getElementById('jsonBackupVersion').textContent = parsed.version || '—';
        document.getElementById('jsonBackupExpCount').textContent = (parsed.expenses || []).length;
        document.getElementById('jsonBackupIncCount').textContent = (parsed.income || []).length;
        document.getElementById('jsonBackupBankCount').textContent = (parsed.bankAccounts || []).length;
        document.getElementById('jsonBackupCatCount').textContent = (parsed.categories || []).length;

        bootstrap.Modal.getOrCreateInstance(document.getElementById('jsonImportModal')).show();
      } catch (err) {
        console.error(err);
        Utils.showToast('Invalid backup file.', 'danger');
      }
    };
    reader.readAsText(file);
  }

  function confirmRestore() {
    if (!pendingRestore) return;
    const result = Storage.restoreFromBackup(pendingRestore);
    pendingRestore = null;
    bootstrap.Modal.getInstance(document.getElementById('jsonImportModal')).hide();
    if (result.error) {
      Utils.showToast(result.error, 'danger');
      return;
    }
    Utils.showToast('Data restored successfully.', 'success');
    App.refreshAll();
  }

  async function clearSampleData() {
    const ok = await Utils.confirmModal({
      title: 'Clear Sample Data',
      message: 'This will remove demo/sample expenses and income. Your other data stays. Continue?',
      okText: 'Clear Sample Data',
      okClass: 'btn-warning'
    });
    if (!ok) return;
    Storage.clearSampleData();
    Utils.showToast('Sample data cleared. You can start entering real expenses.', 'success');
    App.refreshAll();
  }

  async function clearAllData() {
    const ok1 = await Utils.confirmModal({
      title: 'WARNING',
      message: '<strong>This will permanently remove all locally stored expense data from this browser.</strong><p class="mb-0 mt-2">A safety backup will be kept briefly in local storage, but you should export a JSON backup first.</p>',
      okText: 'Continue',
      okClass: 'btn-warning'
    });
    if (!ok1) return;

    const ok2 = await Utils.confirmModal({
      title: 'Final Confirmation',
      message: 'Are you absolutely sure? This cannot be undone easily.',
      okText: 'Delete Everything',
      okClass: 'btn-danger'
    });
    if (!ok2) return;

    Storage.clearAllData();
    Utils.showToast('All data cleared.', 'warning');
    App.refreshAll();
  }

  function bindEvents() {
    document.getElementById('btnExportJSON')?.addEventListener('click', exportJSON);
    document.getElementById('btnExportJSON2')?.addEventListener('click', exportJSON);
    document.getElementById('btnConfirmJSONRestore')?.addEventListener('click', confirmRestore);
    document.getElementById('btnClearSample')?.addEventListener('click', clearSampleData);
    document.getElementById('btnClearAllData')?.addEventListener('click', clearAllData);

    const fileInput = document.getElementById('jsonImportFile');
    document.getElementById('btnImportJSON')?.addEventListener('click', () => fileInput?.click());
    document.getElementById('btnImportJSON2')?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      handleJSONFile(file);
      e.target.value = '';
    });

    document.getElementById('autoBackupToggle')?.addEventListener('change', (e) => {
      Storage.updateSettings({ autoBackup: e.target.checked });
      Utils.showToast(
        e.target.checked ? 'Automatic daily backup enabled.' : 'Automatic daily backup disabled.',
        'info'
      );
      Dashboard.renderBackupStatus();
    });

    document.getElementById('btnManualAutoBackup')?.addEventListener('click', () => {
      exportAutoBackup();
      Utils.showToast('Backup downloaded.', 'success');
    });
  }

  return {
    bindEvents,
    exportJSON,
    exportAutoBackup,
    checkAutoBackup,
    handleJSONFile,
    confirmRestore,
    clearSampleData,
    clearAllData
  };
})();
