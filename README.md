# Expense Management

**Personal Monthly Expense Tracker** — a fully client-side static web app inspired by a monthly Excel expense sheet.

No backend, database, or build step is required. Open `index.html` in a browser, or host the folder on GitHub Pages / Netlify.

---

## 1. Overview

Track daily and monthly **expenses**, **income**, and **bank balances** with:

- Category-wise summaries (HOME, BIG-EXPENSE, OTHER, FOOD, PETROL + custom)
- Dashboard totals and charts
- An Excel-style monthly sheet view
- Excel and JSON import/export
- Automatic daily JSON backup (when the site is opened)

All data is stored in the **browser LocalStorage** on the current device.

---

## 2. Features

- Add / edit / delete expenses and income
- Custom categories, income types, and bank accounts
- Monthly navigation and filtering
- Search and filter expenses
- Category summary, daily summary, calculation panel
- Chart.js: category doughnut, income vs expense bar, daily line
- Excel View (spreadsheet-like layout)
- Download multi-sheet Excel (SheetJS)
- Import Excel exported by this app
- Export / import full JSON backups
- Automatic daily backup (on open)
- Clear sample data / clear all data (with confirmations)
- Responsive Bootstrap 5 UI (sidebar desktop, collapsible mobile)

---

## 3. How Data Is Stored

```text
localStorage key: expenseManagementData
```

A single JSON document holds expenses, income, categories, bank accounts, settings, and metadata.

**Important**

- This is **not** a server database.
- Data belongs to **this browser on this device**.
- Another computer or phone will **not** see the same data automatically.
- Clearing site data / cache can wipe LocalStorage.

Use **Export JSON Backup** regularly.

---

## 4. How to Run

1. Download or clone this repository.
2. Open `expense-management/index.html` in Chrome, Edge, or Firefox.

Or use any static file server:

```bash
# Example (optional): Python
cd expense-management
python -m http.server 8080
# Visit http://localhost:8080
```

No Node.js, npm, Java, PHP, or database is required for the app itself.

---

## 5. Excel Export

1. Select the month you want.
2. Click **Download Excel**.
3. File name: `Expense-Management-YYYY-MM-DD.xlsx`

Worksheets:

| Sheet | Contents |
|-------|----------|
| Dashboard | Month totals + category summary |
| Expenses | Full expense rows |
| Income | Full income rows |
| Bank Balance | Opening / current balances |
| Daily Summary | Per-day income / expense / balance |
| Category Summary | Category totals |

---

## 6. JSON Export (Backup)

1. Go to **Backup & Restore** (or use the dashboard button).
2. Click **Export JSON Backup**.
3. File name: `Expense-Backup-YYYY-MM-DD-HH-mm.json`

The file includes version, backup date, expenses, income, categories, bank accounts, settings — everything needed for a full restore.

---

## 7. JSON Restore

1. Click **Import JSON Backup** and choose a `.json` file.
2. Review the preview (counts, date, version).
3. Confirm **Restore**.

Before overwrite, the app writes a short-lived **safety backup** in LocalStorage. After restore, the UI refreshes automatically.

Invalid files show: **Invalid backup file.**

---

## 8. Automatic Daily Backup

When **Automatic Daily Backup** is ON:

1. Opening the app checks `expenseManagement_lastAutoBackup`.
2. If today has not been backed up, a file downloads:  
   `Expense-AutoBackup-YYYY-MM-DD.json`
3. The last backup date is updated.

### Browser limitation

A static site **cannot** download files while the browser/tab is closed. Backup runs only when you visit the site. Keep this toggle on and open the app at least once per day if you want daily files.

---

## 9. Browser Storage Limitations

| Topic | Behavior |
|-------|----------|
| Persistence | Survives refresh and closing the tab (until storage is cleared) |
| Cross-device | Not synced — use JSON/Excel to transfer |
| Quota | LocalStorage is limited (~5–10 MB); export backups if data grows large |
| Private mode | Data may be discarded when the private session ends |
| Future | Code is structured so LocalStorage can later be swapped for IndexedDB |

---

## 10. Deploy to GitHub Pages

1. Push this project to a GitHub repository.
2. Ensure `index.html` is at the publish root, **or** set Pages to the `/expense-management` folder / `docs` folder if you move files.
3. **Settings → Pages → Source**: Deploy from branch (`main` / `/` or `/expense-management`).
4. Open the published URL.

Recommended layout for Pages (root = site):

```text
/
  index.html
  css/
  js/
  README.md
```

If you keep the `expense-management/` subfolder, set the Pages root to that folder or open `…/expense-management/`.

---

## 11. Deploy to Netlify

1. Drag-and-drop the `expense-management` folder onto [Netlify Drop](https://app.netlify.com/drop), **or**
2. Connect the GitHub repo and set:
   - **Publish directory:** `expense-management` (or `.` if index is at root)
   - **Build command:** leave empty
3. Deploy — no build tools needed.

---

## Sample / Demo Data

First visit loads sample September 2026 data matching the Excel reference (HOME, BIG-EXPENSE, FOOD, PETROL, IPO income, Yes Bank / ADC / JIO).

Use **Settings → Clear Sample Data** before entering real expenses, or **Clear All Data** for a full reset (double confirmation).

---

## Tech Stack

- HTML5, CSS3, Bootstrap 5, Bootstrap Icons
- Vanilla JavaScript (modular IIFEs) + jQuery (CDN, optional use)
- Chart.js, SheetJS (xlsx)
- LocalStorage

---

## Project Structure

```text
expense-management/
├── index.html
├── css/
│   ├── style.css
│   └── responsive.css
├── js/
│   ├── app.js
│   ├── storage.js
│   ├── expense.js
│   ├── income.js
│   ├── bank.js
│   ├── dashboard.js
│   ├── excel.js
│   ├── backup.js
│   ├── charts.js
│   ├── categories.js
│   └── utils.js
├── assets/
└── README.md
```

---

## License

Personal / educational use. Adapt freely for your own tracking.
