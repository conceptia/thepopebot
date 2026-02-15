- Name: daily-financial-premarket-research
- Type: agent (Docker Pi agent job)
- Schedule: daily at 07:00 ET (start next run after job created)
- Output file: operating_system/FINANCIAL_ADVISOR/FINANCIAL_REPORT.md (overwrite)

- JOB STEPS (exact actions Pi should perform):
  1. Run Brave Search skill commands to collect fresh data (use --freshness pd, -n 5, --content):
     - .pi/skills/brave-search/search.js "S&P 500 Dow Jones Nasdaq pre-market today" --freshness pd -n 5 --content
     - .pi/skills/brave-search/search.js "US economic indicators news today" --freshness pd -n 5 --content
     - .pi/skills/brave-search/search.js "US treasury yields federal reserve today" --freshness pd -n 5 --content
     - .pi/skills/brave-search/search.js "Asian European stock markets today" --freshness pd -n 5 --content
     - .pi/skills/brave-search/search.js "oil gold USD forex markets today" --freshness pd -n 5 --content
     - .pi/skills/brave-search/search.js "stock market sector movers earnings today" --freshness pd -n 5 --content
  2. Read operating_system/FINANCIAL_ADVISOR/FINANCIAL_REPORT_TEMPLATE.md (resolve includes).
  3. Extract factual data & sources from search outputs. Do NOT invent numbers; if data unavailable or stale, state that explicitly.
  4. Fill the template with concise factual analysis. Keep each section to 3–5 bullets. Include timestamps and source citations for key data points.
  5. Append the required legal disclaimer at the bottom of the report.
  6. Save/overwrite operating_system/FINANCIAL_ADVISOR/FINANCIAL_REPORT.md.
  7. Commit changes and open a job/* branch PR (use repo commit + PR flow). Include job log and summary in commit message.
  8. Send a Telegram notification after each run with a 3-line summary (top 3 market takeaways), a note if any data was stale/unavailable, and a link to the updated file in the repo.

- RULES & FAILURE MODES:
  - Accuracy-first: only include data found via the Brave Search commands.
  - Timeliness: flag search results older than "pd" or obviously prior-day sources.
  - Brevity & tone: professional, neutral; no investment recommendations.
  - If searches return no fresh results, write a short report stating searches failed or returned stale data and list attempted queries.

- SECRETS / PERMISSIONS:
  - The job will require SECRETS (base64 JSON) with GH_TOKEN for committing/PR. No other secrets expected for web searches.

- SUCCESS CRITERIA:
  - operating_system/FINANCIAL_ADVISOR/FINANCIAL_REPORT.md created/updated.
  - Commit/PR opened and Telegram notification sent with summary and link.
  - Job log saved under logs/{JOB_ID}/