# Financial Advisor System

This directory contains two separate financial reporting systems for thepopebot:

## 1. Market Research Reports (Pre-Market Briefings)

**Purpose:** Generate daily pre-market financial briefings covering major indices, global markets, commodities, currencies, and economic news.

**Files:**
- `FINANCIAL_ADVISOR.md` - Main instructions for market research
- `FINANCIAL_REPORT_TEMPLATE.md` - Template structure
- `FINANCIAL_REPORT.md` - Latest generated market report

**Schedule:** Daily at 07:00 ET / 12:00 UTC (weekdays only)

**Data Source:** Brave Search API (fresh public market data)

**Output:** Markdown report updated in repository

**Cron Entry:** `daily-financial-premarket-research`

---

## 2. Business Financial Reports

**Purpose:** Generate daily business financial reports tracking revenue, expenses, cash flow, invoices, and transactions.

**Files:**
- `DAILY_BUSINESS_FINANCIAL_REPORT.md` - Instructions for report generation
- `BUSINESS_FINANCIAL_REPORT_TEMPLATE.md` - Template structure

**Schedule:** Daily at 04:00 CST / 10:00 UTC

**Data Source:** 
- Currently: Brave Search (public data proxy) + sample data structure
- Production: Would integrate with accounting APIs (QuickBooks, Xero, Stripe, Plaid)

**Outputs:** 
- `logs/daily_reports/YYYY-MM-DD/report.xlsx` - Excel workbook with multiple sheets
- `logs/daily_reports/YYYY-MM-DD/summary.pdf` - One-page PDF summary
- `logs/daily_reports/YYYY-MM-DD/transactions.csv` - Normalized transaction log

**Cron Entry:** `generate-daily-financial-report`

---

## Setup & Configuration

### Dependencies

The report generator requires Node.js packages:

```bash
cd /job/tmp/daily-financial-report
npm install exceljs pdfkit
```

These are installed automatically when the agent runs the job.

### Enabling/Disabling Jobs

Edit `/job/operating_system/CRONS.json`:

```json
{
  "name": "generate-daily-financial-report",
  "enabled": true  // Set to false to disable
}
```

### Timezone Note

The cron schedule uses UTC. For CST (Central Standard Time):
- CST = UTC-6
- CDT (daylight) = UTC-5

Current schedule `0 10 * * *` = 10:00 UTC = 04:00 CST (05:00 CDT)

---

## Integration with Real Financial Data

The business financial report system is designed to integrate with real accounting systems. To connect:

### 1. Add API Credentials to LLM_SECRETS

Update your repository's `LLM_SECRETS` secret (GitHub Actions):

```json
{
  "QUICKBOOKS_ACCESS_TOKEN": "your_token_here",
  "STRIPE_API_KEY": "sk_live_...",
  "PLAID_CLIENT_ID": "your_client_id",
  "PLAID_SECRET": "your_secret",
  "XERO_ACCESS_TOKEN": "your_token_here"
}
```

### 2. Modify Report Generator

Update `/job/tmp/daily-financial-report/generate-report.js`:

```javascript
// Example: Fetch real Stripe transactions
const stripe = require('stripe')(process.env.STRIPE_API_KEY);

async function fetchStripeTransactions(date) {
  const startOfDay = new Date(date).setHours(0,0,0,0) / 1000;
  const endOfDay = new Date(date).setHours(23,59,59,999) / 1000;
  
  const charges = await stripe.charges.list({
    created: { gte: startOfDay, lte: endOfDay },
    limit: 100
  });
  
  return charges.data.map(charge => ({
    date: new Date(charge.created * 1000).toISOString().split('T')[0],
    type: 'Revenue',
    category: 'Payment Processing',
    description: charge.description || 'Stripe charge',
    amount: charge.amount / 100,
    status: charge.status === 'succeeded' ? 'Completed' : 'Pending',
    notes: `Charge ID: ${charge.id}`
  }));
}

// Replace sample data with real data
const data = {
  ...generateSampleData(reportDate),
  transactions: await fetchStripeTransactions(reportDate)
};
```

### 3. Supported Integrations

| System | API Docs | Data Available |
|--------|----------|----------------|
| **Stripe** | https://stripe.com/docs/api | Charges, payouts, balance transactions |
| **QuickBooks** | https://developer.intuit.com/ | Invoices, expenses, P&L, cash flow |
| **Xero** | https://developer.xero.com/ | Bank transactions, invoices, bills |
| **Plaid** | https://plaid.com/docs/ | Bank account balances, transactions |
| **PayPal** | https://developer.paypal.com/ | Payments, invoices |
| **FreshBooks** | https://www.freshbooks.com/api | Time tracking, expenses, invoices |

---

## Output Structure

### Excel Report (report.xlsx)

**Sheets:**
1. **Summary** - Key metrics, operational stats
2. **Transactions** - Full transaction log (all line items)
3. **Revenue** - Revenue by category with percentages
4. **Expenses** - Expenses by category with percentages
5. **Cash Flow** - Daily cash movements (opening, in, out, closing)

### PDF Summary (summary.pdf)

**Sections:**
- Key Financial Metrics (revenue, expenses, net income, cash)
- Top Revenue Categories (top 5)
- Top Expense Categories (top 5)
- Cash Flow Summary
- Accounts Receivable Aging
- Data Limitations & Disclaimer

### CSV Transactions (transactions.csv)

**Columns:**
- Date, Type, Category, Description, Amount, Status, Notes

All transactions in a normalized format for import into other systems.

---

## Notifications

After each report generation, the system automatically:

1. ✅ Commits files to a `job/*` branch
2. ✅ Opens a PR with report summary
3. ✅ Auto-merges PR (if `AUTO_MERGE` enabled and files in `ALLOWED_PATHS`)
4. ✅ Sends Telegram notification with:
   - Report date
   - Key metrics (revenue, expenses, net income)
   - Links to generated files
   - Note about data sources/limitations

---

## Troubleshooting

### Missing Dependencies

```bash
cd /job/tmp/daily-financial-report
npm install exceljs pdfkit
```

### Date Calculation Issues

The script automatically skips weekends:
- Reports on Friday if run on Saturday/Sunday/Monday
- Reports on previous day otherwise

Override with environment variable:
```bash
REPORT_DATE=2026-02-14 node generate-report.js
```

### File Permission Errors

Ensure `/job/logs/daily_reports/` is writable:
```bash
mkdir -p /job/logs/daily_reports/
chmod -R 755 /job/logs/daily_reports/
```

### Invalid Cron Schedule

Current schedule: `0 10 * * *` (10:00 UTC daily)

Validate at: https://crontab.guru/#0_10_*_*_*

---

## Development & Testing

### Generate Report Manually

```bash
cd /job/tmp/daily-financial-report
npm install
node generate-report.js
```

### Customize Report Date

```bash
REPORT_DATE=2026-02-01 node generate-report.js
```

### View Generated Files

```bash
ls -lh /job/logs/daily_reports/YYYY-MM-DD/
```

---

## Roadmap

- [ ] Add chart generation (PNG/SVG) for revenue trend and expense breakdown
- [ ] Integrate with real accounting systems (QuickBooks, Stripe, Plaid)
- [ ] Add email delivery option (SendGrid, AWS SES)
- [ ] Support multi-currency reporting
- [ ] Add year-over-year and month-over-month comparisons
- [ ] Budget vs. actual analysis
- [ ] Forecasting based on historical trends
- [ ] Custom report templates per business type

---

## Security Notes

- Never commit API keys or secrets to the repository
- Use GitHub Secrets for `LLM_SECRETS` (credentials the LLM can access)
- Use `SECRETS` for protected credentials (filtered from LLM)
- All generated reports are committed to the repository - ensure no sensitive data is included
- Consider encrypting reports if they contain confidential financial information

---

## Support

For questions or issues:
1. Check the job logs at `/job/logs/{JOB_ID}/`
2. Review the session logs (`.jsonl` files)
3. Verify cron schedule in `/job/operating_system/CRONS.json`
4. Test report generation manually before scheduling

---

*Last Updated: 2026-02-15*
