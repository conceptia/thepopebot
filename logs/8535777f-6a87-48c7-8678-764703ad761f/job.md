Generate a daily financial report for the previous business day.
• Data: load transactions and balances from data/daily_transactions.csv in the repo (if not found, stop and report).
• Cleaning: validate and reconcile totals; flag missing fields.
• Metrics: compute total revenue, total expenses, gross profit, net income, cash balance, AR, AP, top 5 customers by revenue, top 5 expense categories, and % change vs prior day.
• Output: create a one-page PDF summary + CSV of metrics + 3 charts (revenue vs expenses, 7-day cash trend, top categories).
• Save outputs to logs/daily-reports/YYYY-MM-DD/ (report.pdf, metrics.csv, charts/) and commit to the repo.
• Notification: post a short summary message to Telegram with the report link.
• If any external credentials or different data source required, stop and request access instructions.