/**
 * Expense Management - JSON Backup / Restore / Auto Backup
 */

const BackupModule = (() => {
  let pendingRestore = null;
  let scheduleTimer = null;
  let runningAuto = false;

  function refreshLocationUI() {
    const settings = Storage.getSettings();
    const folderOk = Utils.canUseFolderPicker();
    const label = Utils.getBackupLocationLabel(settings);
    const input = document.getElementById('backupLocationInput');
    const status = document.getElementById('settingsBackupLocation');
    const timeInput = document.getElementById('autoBackupTime');
    const timeStatus = document.getElementById('settingsBackupTime');
    const time = Storage.getAutoBackupTime();
    const chooseBtn = document.getElementById('btnChooseBackupFolder');
    const clearBtn = document.getElementById('btnClearBackupFolder');
    const uploadBtn = document.getElementById('btnUploadJsonToData');
    const desktopHelp = document.getElementById('jsonBackupDesktopHelp');
    const mobileHelp = document.getElementById('jsonBackupMobileHelp');
    const locationHelp = document.getElementById('backupLocationHelp');

    if (input) {
      input.value = folderOk && settings.backupFolderName ? settings.backupFolderName : '';
      input.placeholder = folderOk ? 'Browser Downloads (default)' : Utils.getMobileDownloadsLabel();
    }
    if (status) status.textContent = label;
    if (timeInput && document.activeElement !== timeInput) timeInput.value = time;
    if (timeStatus) timeStatus.textContent = time;

    // Mobile / unsupported browsers: hide folder picker, keep Downloads flow
    if (chooseBtn) chooseBtn.classList.toggle('d-none', !folderOk);
    if (clearBtn) clearBtn.classList.toggle('d-none', !folderOk);
    if (uploadBtn) uploadBtn.classList.toggle('d-none', !folderOk);
    if (desktopHelp) desktopHelp.classList.toggle('d-none', !folderOk);
    if (mobileHelp) mobileHelp.classList.toggle('d-none', folderOk);
    if (locationHelp) {
      locationHelp.textContent = folderOk
        ? 'Computer (Chrome/Edge): select the project data folder. Backups and uploads save there.'
        : 'On mobile, Choose Folder is not available. Download / Auto backup files go to your phone Downloads or Files app.';
    }
  }

  async function chooseBackupFolder() {
    try {
      if (!Utils.canUseFolderPicker()) {
        Utils.showToast(
          'On mobile, folder pick is not available. Use Download JSON — the file saves to your phone Downloads / Files.',
          'info'
        );
        return;
      }
      const handle = await Utils.chooseBackupDirectory();
      Storage.updateSettings({ backupFolderName: handle.name });
      refreshLocationUI();
      Dashboard.renderBackupStatus();
      Utils.showToast(`Backup location set to: ${handle.name}. Tip: choose the project "data" folder.`, 'success');
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      console.error(err);
      Utils.showToast(err.message || 'Could not choose folder.', 'danger');
    }
  }

  async function exportJSON() {
    const backup = Storage.exportBackupObject();
    const filename = `Expense-Backup-${Utils.timestampForFilename()}.json`;
    const result = await Utils.saveJSONBackup(backup, filename, { interactive: true });
    Storage.markBackupDone(false);
    if (result.method === 'folder') {
      Utils.showToast(`JSON backup saved to folder: ${result.folderName}`, 'success');
    } else {
      Utils.showToast(`JSON backup saved to ${Utils.getBackupLocationLabel(Storage.getSettings())}.`, 'success');
    }
    Dashboard.renderBackupStatus();
    refreshLocationUI();
  }

  async function exportAutoBackup({ interactive = false } = {}) {
    const backup = Storage.exportBackupObject();
    const filename = `Expense-AutoBackup-${Utils.dateForFilename()}.json`;
    const result = await Utils.saveJSONBackup(backup, filename, { interactive });
    Storage.markBackupDone(true);
    Dashboard.renderBackupStatus();
    refreshLocationUI();
    return result;
  }

  async function checkAutoBackup() {
    if (runningAuto) return;
    if (!Storage.needsAutoBackup()) return;
    runningAuto = true;
    try {
      const result = await exportAutoBackup({ interactive: false });
      if (result.method === 'folder') {
        Utils.showToast(`Automatic daily backup saved to: ${result.folderName}`, 'info');
      } else {
        Utils.showToast(`Automatic daily backup saved to ${Utils.getBackupLocationLabel(Storage.getSettings())}.`, 'info');
      }
    } catch (err) {
      console.error('Auto backup failed', err);
    } finally {
      runningAuto = false;
    }
  }

  function startAutoBackupScheduler() {
    if (scheduleTimer) clearInterval(scheduleTimer);
    setTimeout(() => checkAutoBackup(), 800);
    scheduleTimer = setInterval(() => checkAutoBackup(), 30000);
  }

  function stopAutoBackupScheduler() {
    if (scheduleTimer) {
      clearInterval(scheduleTimer);
      scheduleTimer = null;
    }
  }

  async function clearBackupFolder() {
    try {
      await Utils.clearBackupDirectoryHandle();
    } catch (err) {
      console.warn(err);
    }
    Storage.updateSettings({ backupFolderName: '' });
    refreshLocationUI();
    Dashboard.renderBackupStatus();
    Utils.showToast('Backup location reset to Browser Downloads.', 'info');
  }

  function saveBackupTime(value) {
    const time = /^\d{2}:\d{2}$/.test(value) ? value : '20:00';
    Storage.updateSettings({ autoBackupTime: time });
    refreshLocationUI();
    Dashboard.renderBackupStatus();
    Utils.showToast(`Daily backup time set to ${time}.`, 'success');
    checkAutoBackup();
  }

  async function uploadJsonToDataFolder(file) {
    if (!file) return;
    try {
      if (!Utils.canUseFolderPicker()) {
        Utils.showToast(
          'On mobile, use Restore into App to pick a JSON file from your phone. Folder upload is for computer only.',
          'info'
        );
        return;
      }

      let handle = await Utils.getBackupDirectoryHandle();
      if (!handle) {
        Utils.showToast('Select the project data folder…', 'info');
        handle = await Utils.chooseBackupDirectory();
        Storage.updateSettings({ backupFolderName: handle.name });
        refreshLocationUI();
      }

      const result = await Utils.uploadFileToBackupFolder(file, { interactive: true });
      if (!result.saved) {
        if (result.reason === 'permission') {
          Utils.showToast('Permission denied for folder. Choose the data folder again.', 'danger');
        } else {
          Utils.showToast('Could not upload file to data folder.', 'danger');
        }
        return;
      }

      Storage.updateSettings({ backupFolderName: result.folderName || Storage.getSettings().backupFolderName || 'data' });
      refreshLocationUI();
      Dashboard.renderBackupStatus();
      Utils.showToast(`Uploaded "${result.filename}" into folder: ${result.folderName}`, 'success');
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      console.error(err);
      Utils.showToast(err.message || 'Upload failed.', 'danger');
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

  async function clearAllData() {
    const ok1 = await Utils.confirmModal({
      title: 'WARNING',
      message: '<strong>This will permanently remove all locally stored Expense data from this browser.</strong><p class="mb-0 mt-2">A safety backup will be kept briefly in local storage, but you should export a JSON backup first.</p>',
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
    document.getElementById('btnExportJSON')?.addEventListener('click', () => exportJSON());
    document.getElementById('btnExportJSON2')?.addEventListener('click', () => exportJSON());
    document.getElementById('btnConfirmJSONRestore')?.addEventListener('click', confirmRestore);
    document.getElementById('btnClearAllData')?.addEventListener('click', clearAllData);
    document.getElementById('btnChooseBackupFolder')?.addEventListener('click', chooseBackupFolder);
    document.getElementById('btnClearBackupFolder')?.addEventListener('click', clearBackupFolder);

    const fileInput = document.getElementById('jsonImportFile');
    const uploadToDataInput = document.getElementById('jsonUploadToDataFile');
    document.getElementById('btnImportJSON')?.addEventListener('click', () => fileInput?.click());
    document.getElementById('btnImportJSON2')?.addEventListener('click', () => fileInput?.click());
    document.getElementById('btnUploadJsonToData')?.addEventListener('click', () => uploadToDataInput?.click());
    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      handleJSONFile(file);
      e.target.value = '';
    });
    uploadToDataInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      await uploadJsonToDataFolder(file);
      e.target.value = '';
    });

    document.getElementById('autoBackupToggle')?.addEventListener('change', (e) => {
      Storage.updateSettings({ autoBackup: e.target.checked });
      Utils.showToast(
        e.target.checked ? 'Automatic daily backup enabled.' : 'Automatic daily backup disabled.',
        'info'
      );
      Dashboard.renderBackupStatus();
      if (e.target.checked) checkAutoBackup();
    });

    document.getElementById('autoBackupTime')?.addEventListener('change', (e) => {
      saveBackupTime(e.target.value);
    });

    document.getElementById('btnManualAutoBackup')?.addEventListener('click', async () => {
      const result = await exportAutoBackup({ interactive: true });
      if (result.method === 'folder') {
        Utils.showToast(`Backup saved to: ${result.folderName}`, 'success');
      } else {
        Utils.showToast(`Backup saved to ${Utils.getBackupLocationLabel(Storage.getSettings())}.`, 'success');
      }
    });

    refreshLocationUI();
    startAutoBackupScheduler();
  }

  return {
    bindEvents,
    exportJSON,
    exportAutoBackup,
    checkAutoBackup,
    startAutoBackupScheduler,
    stopAutoBackupScheduler,
    handleJSONFile,
    confirmRestore,
    clearAllData,
    refreshLocationUI
  };
})();
