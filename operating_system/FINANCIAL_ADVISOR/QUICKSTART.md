# Quick Start Guide - Daily Business Financial Reports

Get your daily business financial reports up and running in minutes.

---

## What You Get

Every day at 04:00 CST (10:00 UTC), you'll receive:

1. **Excel Workbook** (`report.xlsx`) with 5 sheets:
   - Summary (key metrics)
   - Transactions (all line items)
   - Revenue (by category)
   - Expenses (by category)
   - Cash Flow (daily movements)

2. **PDF Summary** (`summary.pdf`) - One-page executive summary

3. **CSV File** (`transactions.csv`) - Normalized transaction log

All files automatically committed to: `/logs/daily_reports/YYYY-MM-DD/`

---

## Already Working ✅

The system is **already enabled and running** with sample data. Check for reports in:

```bash
ls -la logs/daily_reports/
```

You should see a directory for 2026-02-13 with example reports.

---

## Using Sample Data (Current)

**No setup needed!** The system runs daily with sample/proxy data from Brave Search.

**What this is good for:**
- Testing the system
- Seeing the report format
- Verifying notifications work
- Understanding the structure

**Limitations:**
- Data is simulated/proxy-based
- Not your real business financials
- Good for demo/testing only

---

## Connecting Real Financial Data

To get **your actual business data**, integrate with your accounting systems:

### Option 1: Stripe (Payment Processing)

**What you get:** Revenue from card charges, subscription payments

1. Get your API key: https://dashboard.stripe.com/apikeys

2. Add to GitHub Secrets (`LLM_SECRETS`):
```json
{
  "STRIPE_API_KEY": "sk_live_..."
}
```

3. The system will automatically use it (instructions include Stripe integration)

### Option 2: QuickBooks (Full Accounting)

**What you get:** Complete P&L, invoices, expenses, bank transactions

1. Create app: https://developer.intuit.com/

2. Add credentials to `LLM_SECRETS`:
```json
{
  "QUICKBOOKS_CLIENT_ID": "...",
  "QUICKBOOKS_CLIENT_SECRET": "...",
  "QUICKBOOKS_REALM_ID": "...",
  "QUICKBOOKS_ACCESS_TOKEN": "..."
}
```

3. Update the report generator to call QuickBooks API (example in DAILY_BUSINESS_FINANCIAL_REPORT.md)

### Option 3: Xero (Accounting)

**What you get:** Invoices, bills, bank transactions, reports

1. Create app: https://developer.xero.com/

2. Add to `LLM_SECRETS`:
```json
{
  "XERO_CLIENT_ID": "...",
  "XERO_CLIENT_SECRET": "...",
  "XERO_ACCESS_TOKEN": "..."
}
```

### Option 4: Plaid (Bank Balances)

**What you get:** Real-time bank account balances, transactions

1. Sign up: https://plaid.com/

2. Add to `LLM_SECRETS`:
```json
{
  "PLAID_CLIENT_ID": "...",
  "PLAID_SECRET": "...",
  "PLAID_ACCESS_TOKEN": "..."
}
```

---

## Changing the Schedule

Current schedule: **04:00 CST (10:00 UTC) daily**

To change:

1. Edit `/job/operating_system/CRONS.json`

2. Find `generate-daily-financial-report`

3. Update the `schedule` field:
```json
{
  "schedule": "0 10 * * *"  // Cron format (hour, minute, day, month, weekday)
}
```

**Examples:**
- `0 10 * * *` - 10:00 UTC daily
- `0 8 * * 1-5` - 08:00 UTC weekdays only
- `0 12 * * *` - 12:00 UTC daily

Use https://crontab.guru/ to create custom schedules.

---

## Disabling Reports

To temporarily stop generating reports:

1. Edit `/job/operating_system/CRONS.json`

2. Find `generate-daily-financial-report`

3. Set `enabled` to `false`:
```json
{
  "name": "generate-daily-financial-report",
  "enabled": false
}
```

4. Commit the change

---

## Where Reports Are Stored

```
logs/daily_reports/
├── 2026-02-13/
│   ├── report.xlsx
│   ├── summary.pdf
│   └── transactions.csv
├── 2026-02-14/
│   ├── report.xlsx
│   ├── summary.pdf
│   └── transactions.csv
└── ...
```

Each day gets its own directory with three files.

---

## Notifications

After each report generation, you'll receive a **Telegram notification** with:

- Report date
- Key metrics (revenue, expenses, net income)
- Link to files in the repository
- Note about data sources

**Setup Telegram notifications:** See main repository documentation.

---

## Viewing Reports

### In GitHub

1. Navigate to repository
2. Go to `logs/daily_reports/YYYY-MM-DD/`
3. Click on files to download

### Locally (if cloned)

```bash
git pull origin main
cd logs/daily_reports/
ls -la
```

### Opening Files

- **Excel (.xlsx)**: Microsoft Excel, Google Sheets, LibreOffice Calc
- **PDF (.pdf)**: Any PDF viewer
- **CSV (.csv)**: Excel, Google Sheets, text editor

---

## Troubleshooting

### No reports appearing?

Check:
1. Is the cron job enabled? (`enabled: true` in CRONS.json)
2. Check recent PRs - reports create automatic PRs
3. Look in `logs/` directories for job logs
4. Verify schedule is correct (UTC timezone)

### Wrong data in reports?

- **Sample data?** → Add real accounting credentials (see above)
- **Wrong date?** → Reports use previous business day (skips weekends)
- **Missing categories?** → Customize template in BUSINESS_FINANCIAL_REPORT_TEMPLATE.md

### Reports not merging?

Check repository settings:
- `AUTO_MERGE` variable (should not be `false`)
- `ALLOWED_PATHS` variable (should include `/logs`)

---

## Customization

### Change Report Format

Edit `/job/operating_system/FINANCIAL_ADVISOR/BUSINESS_FINANCIAL_REPORT_TEMPLATE.md`

### Modify Categories

Update the report generator logic in DAILY_BUSINESS_FINANCIAL_REPORT.md:
- Revenue categories
- Expense categories
- Metrics tracked

### Add Custom Charts

Enhance the PDF generator to include:
- Revenue trend charts (7-day)
- Expense pie charts
- Cash flow graphs

Example libraries: Chart.js (Node), D3.js, or matplotlib (Python)

---

## Next Steps

1. ✅ **You're done!** System is running with sample data

2. 📊 **Review example reports** in `logs/daily_reports/2026-02-13/`

3. 🔌 **Connect accounting system** (Stripe, QuickBooks, Xero) for real data

4. 📱 **Verify notifications** are working (check Telegram)

5. 🎨 **Customize** report format if needed

---

## Support

- **Full documentation:** `operating_system/FINANCIAL_ADVISOR/README.md`
- **Template structure:** `BUSINESS_FINANCIAL_REPORT_TEMPLATE.md`
- **Agent instructions:** `DAILY_BUSINESS_FINANCIAL_REPORT.md`
- **Job logs:** `logs/{JOB_ID}/` for each execution

---

## Summary

✅ System enabled and running  
✅ Daily reports at 04:00 CST  
✅ Excel, PDF, and CSV outputs  
✅ Auto-merge and notifications configured  
⏳ Connect accounting APIs for real data  

**You're all set!** Check `logs/daily_reports/` tomorrow morning for your first scheduled report.
