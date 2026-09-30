/**
 * Expense Management - Chart.js Charts
 */

const ChartsModule = (() => {
  let categoryChart = null;
  let incomeExpenseChart = null;
  let dailyChart = null;

  function destroyChart(chart) {
    if (chart) {
      chart.destroy();
    }
    return null;
  }

  function renderCategoryChart() {
    const canvas = document.getElementById('categoryChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const monthKey = Storage.getSelectedMonth();
    const totals = Storage.getMonthTotals(monthKey);
    const categories = Storage.getCategories();
    const labels = [];
    const values = [];
    const colors = [];

    categories.forEach((c, i) => {
      const amt = totals.categoryTotals[c.name] || 0;
      if (amt > 0) {
        labels.push(c.name);
        values.push(amt);
        colors.push(c.color || Utils.categoryColor(i));
      }
    });

    categoryChart = destroyChart(categoryChart);

    if (values.length === 0) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    categoryChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${Utils.formatCurrency(ctx.raw)}`
            }
          }
        }
      }
    });
  }

  function renderIncomeExpenseChart() {
    const canvas = document.getElementById('incomeExpenseChart');
    if (!canvas || typeof Chart === 'undefined') return;

    // Last 6 months including selected
    const selected = Storage.getSelectedMonth();
    const labels = [];
    const incomeData = [];
    const expenseData = [];

    for (let i = -5; i <= 0; i++) {
      const key = Utils.shiftMonth(selected, i);
      const t = Storage.getMonthTotals(key);
      labels.push(Utils.formatMonthShort(key));
      incomeData.push(t.totalIncome);
      expenseData.push(t.totalExpense);
    }

    incomeExpenseChart = destroyChart(incomeExpenseChart);

    incomeExpenseChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Income',
            data: incomeData,
            backgroundColor: 'rgba(25, 135, 84, 0.75)',
            borderRadius: 4
          },
          {
            label: 'Expenses',
            data: expenseData,
            backgroundColor: 'rgba(220, 53, 69, 0.75)',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (v) => '₹' + v
            }
          }
        },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${Utils.formatCurrency(ctx.raw)}`
            }
          }
        }
      }
    });
  }

  function renderDailyChart() {
    const canvas = document.getElementById('dailyExpenseChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const monthKey = Storage.getSelectedMonth();
    const daily = Storage.getDailySummary(monthKey);
    const dates = Utils.getDatesInMonth(monthKey);
    const expenseMap = {};
    daily.forEach((d) => { expenseMap[d.date] = d.expense; });

    const labels = dates.map((d) => d.split('-')[2]);
    const values = dates.map((d) => expenseMap[d] || 0);

    dailyChart = destroyChart(dailyChart);

    dailyChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Daily Expenses',
          data: values,
          borderColor: '#dc3545',
          backgroundColor: 'rgba(220, 53, 69, 0.12)',
          fill: true,
          tension: 0.3,
          pointRadius: 2,
          pointHoverRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { title: { display: true, text: 'Day of month' } },
          y: {
            beginAtZero: true,
            ticks: { callback: (v) => '₹' + v }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => {
                const day = items[0].label;
                return Utils.formatDateDisplay(`${monthKey}-${Utils.pad2(day)}`);
              },
              label: (ctx) => ` Expenses: ${Utils.formatCurrency(ctx.raw)}`
            }
          }
        }
      }
    });
  }

  function render() {
    renderCategoryChart();
    renderIncomeExpenseChart();
    renderDailyChart();
  }

  return { render };
})();
