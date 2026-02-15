JOB NAME
- generate-daily-financial-report

DATA SOURCES & CADENCE
- Data source: Brave Search (web search for public/market data relevant to the report)
- Cadence: daily at 04:00 CST (cron: 0 4 * * * with CST timezone)

TEMPLATE / LOCATION
- Use template at /operating_system/Financial_advisor/financial_report.md

GOAL
- Produce a concise daily financial report for the previous business day following the provided template and save outputs to the repository.

OUTPUTS & DESTINATION
- Save artifacts to repo path: logs/daily_reports/YYYY-MM-DD/
- Files produced:
  - report.xlsx (raw data + summary sheet)
  - summary.pdf (one-page summary with key metrics and charts)
  - transactions.csv (normalized transactions for the period)
  - optional small PNG/SVG charts (revenue trend, expense breakdown, cash balance)
- Commit files on a job/* branch and open a PR (auto-merge governed by repo settings)

STEPS THE AGENT WILL PERFORM
- Read and follow /operating_system/Financial_advisor/financial_report.md.
- Use Brave Search to collect publicly available market/financial signals needed by the template for the target date (previous business day).
- Normalize and aggregate any found data into a transactions dataset.
- Compute metrics: total revenue, total expenses, net income, cash balance estimate, new/overdue invoices (best-effort from public data), top 5 expense/revenue categories, day-over-day and 7-day change where applicable.
- Generate Excel, CSV, and a one-page PDF summary with 2–3 charts.
- Create or update operating_system/CRONS.json to include a cron entry that runs this job daily at 04:00 CST (if not already present).
- Commit all outputs and changes, push a job/* branch, and open a PR. Include details in the commit/PR message about data sources used (Brave Search) and the report date.
- Leave a job log in logs/{JOB_ID}/ (job.md + session logs). The repo’s existing workflows will notify the event handler/Telegram when the job completes.

ASSUMPTIONS & DEFAULTS
- No private credentials required (Brave Search only).
- If some metrics cannot be computed from web search (e.g., private bank balances), agent will note gaps in the report and provide best-effort estimates where reasonable.
- Notifications: rely on repo’s update-event-handler.yml to send Telegram summary; no email recipients configured.

DELIVERABLES
- Repo files: logs/daily_reports/YYYY-MM-DD/report.xlsx, summary.pdf, transactions.csv, charts
- PR that creates the above files and updates CRONS.json
- Job log at logs/{JOB_ID}/ with session transcripts and a one-paragraph summary