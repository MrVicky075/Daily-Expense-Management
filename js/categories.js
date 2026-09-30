/**
 * Expense Management - Categories & Income Types
 */

const CategoriesModule = (() => {
  function render() {
    const categories = Storage.getCategories();
    const types = Storage.getData().incomeTypes.filter(
      (t) => t.id !== 'INC-RPD' && String(t.name).toLowerCase() !== 'rpd income'
    );
    const catList = document.getElementById('categoryList');
    const typeList = document.getElementById('incomeTypeList');

    if (catList) {
      catList.innerHTML = categories.map((c) => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
          <span>
            <span class="badge me-2" style="background:${Utils.escapeHtml(c.color || '#6c757d')}">&nbsp;</span>
            ${Utils.escapeHtml(c.name)}
            ${c.isDefault ? '<span class="badge text-bg-light text-muted ms-1">default</span>' : ''}
          </span>
          ${!c.isDefault ? `<button class="btn btn-outline-danger btn-sm" onclick="CategoriesModule.deleteCategory('${c.id}')"><i class="bi bi-trash"></i></button>` : ''}
        </li>
      `).join('');
    }

    if (typeList) {
      typeList.innerHTML = types.map((t) => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
          <span>
            ${Utils.escapeHtml(t.name)}
            ${t.isDefault ? '<span class="badge text-bg-light text-muted ms-1">default</span>' : ''}
          </span>
          ${!t.isDefault ? `<button class="btn btn-outline-danger btn-sm" onclick="CategoriesModule.deleteIncomeType('${t.id}')"><i class="bi bi-trash"></i></button>` : ''}
        </li>
      `).join('');
    }
  }

  function addCategory() {
    const input = document.getElementById('newCategoryName');
    const name = input.value.trim();
    if (!name) {
      Utils.showToast('Please enter a category name.', 'warning');
      return;
    }
    const result = Storage.addCategory(name);
    if (result.error) {
      Utils.showToast(result.error, 'danger');
      return;
    }
    input.value = '';
    Utils.showToast('Category added.', 'success');
    App.refreshAll();
  }

  async function deleteCategory(id) {
    const ok = await Utils.confirmModal({
      title: 'Delete Category',
      message: 'Delete this custom category?',
      okText: 'Delete',
      okClass: 'btn-danger'
    });
    if (!ok) return;
    const result = Storage.deleteCategory(id);
    if (result.error) {
      Utils.showToast(result.error, 'danger');
      return;
    }
    Utils.showToast('Category deleted.', 'success');
    App.refreshAll();
  }

  function addIncomeType() {
    const input = document.getElementById('newIncomeTypeName');
    const name = input.value.trim();
    if (!name) {
      Utils.showToast('Please enter an Income type.', 'warning');
      return;
    }
    const result = Storage.addIncomeType(name);
    if (result.error) {
      Utils.showToast(result.error, 'danger');
      return;
    }
    input.value = '';
    Utils.showToast('Income type added.', 'success');
    App.refreshAll();
  }

  async function deleteIncomeType(id) {
    const ok = await Utils.confirmModal({
      title: 'Delete Income Type',
      message: 'Delete this custom Income type?',
      okText: 'Delete',
      okClass: 'btn-danger'
    });
    if (!ok) return;
    const result = Storage.deleteIncomeType(id);
    if (result.error) {
      Utils.showToast(result.error, 'danger');
      return;
    }
    Utils.showToast('Income type deleted.', 'success');
    App.refreshAll();
  }

  function bindEvents() {
    document.getElementById('btnAddCategory')?.addEventListener('click', addCategory);
    document.getElementById('btnAddIncomeType')?.addEventListener('click', addIncomeType);
    document.getElementById('newCategoryName')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addCategory(); }
    });
    document.getElementById('newIncomeTypeName')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addIncomeType(); }
    });
  }

  return {
    bindEvents,
    render,
    addCategory,
    deleteCategory,
    addIncomeType,
    deleteIncomeType
  };
})();
