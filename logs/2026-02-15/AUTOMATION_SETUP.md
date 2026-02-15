# Automation Setup for Daily Financial Reports

This document explains how to automate the daily financial report generation.

## Option 1: Cron Job Automation

Add this entry to `operating_system/CRONS.json`:

```json
{
  "name": "daily-financial-report",
  "schedule": "0 17 * * 1-5",
  "type": "agent",
  "job": "Create a comprehensive daily financial report following the format in /job/logs/2026-02-15/Daily_Financial_Report_2026-02-15.md. Include: market overview (major indices, international markets), economic data (CPI, Fed policy, calendar), sector analysis (best/worst performers), notable movers (gainers/losers), market news (AI trends, Fed policy, earnings, geopolitics), currencies, technical indicators (VIX, yields, commodities), risk assessment, and outlook. Save to logs/[TODAY_DATE]/ directory with three files: full report, executive summary, and data summary. Use Brave Search to gather current market data.",
  "enabled": true
}
```

**Schedule Explained:**
- `0 17 * * 1-5` = 5:00 PM UTC, Monday through Friday
- This is after U.S. market close (4:00 PM ET / 9:00 PM UTC)
- Adjust timezone as needed for your location

## Option 2: Manual Trigger

Send a webhook request to your event handler:

```bash
curl -X POST https://your-event-handler.com/webhook \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "job": "Create a comprehensive daily financial report following the format in /job/logs/2026-02-15/Daily_Financial_Report_2026-02-15.md. Use Brave Search to gather current market data and save to logs/ directory."
  }'
```

## Option 3: Telegram Command

If you have Telegram integration enabled, you can trigger reports on demand:

```
/create-job Create a comprehensive daily financial report following the format in /job/logs/2026-02-15/Daily_Financial_Report_2026-02-15.md
```

## Option 4: Custom Skill (Recommended)

Create a dedicated skill for financial reporting:

### File: `.pi/skills/financial-report/SKILL.md`

```markdown
---
name: financial-report
description: Generate comprehensive daily financial market reports with indices, sectors, movers, and analysis
---

# Financial Report Skill

Generate professional daily financial briefings suitable for investment professionals.

## Usage

When asked to create a financial report, follow this structure:

### 1. Data Collection

Use Brave Search to gather:
- Major index performance (S&P 500, Dow, NASDAQ, international)
- Economic releases and upcoming calendar
- Sector performance (best/worst)
- Notable stock movers (gainers/losers)
- Market news headlines
- Currency movements (USD, EUR, JPY, GBP)
- Technical indicators (VIX, 10-year yield, commodities)

### 2. Report Structure

Create three files in `/job/logs/[DATE]/`:

1. **Daily_Financial_Report_[DATE].md** - Comprehensive report (10-15 sections)
2. **Executive_Summary_[DATE].md** - Quick reference (1-2 pages)
3. **Market_Data_Summary_[DATE].txt** - Formatted data tables

### 3. Content Sections

- Executive Summary
- Market Overview (indices, sentiment, international)
- Economic Data (releases, Fed policy, calendar)
- Sector Analysis (performance, rotation, themes)
- Notable Movers (gainers, losers, volume)
- Market News Summary (major headlines, events)
- Currency Movements
- Technical Indicators (VIX, yields, commodities)
- Risk Assessment (prioritized risks)
- Outlook & Recommendations (near/medium-term)

### 4. Analysis Guidelines

- **Professional tone** - suitable for investment professionals
- **Data-driven** - cite specific numbers and sources
- **Context** - explain why moves matter
- **Actionable** - provide clear takeaways
- **Balanced** - include bull/bear perspectives

### 5. Search Strategy

Execute multiple focused searches:
```bash
cd /job/.pi/skills/brave-search

# Market indices
./search.js "S&P 500 Dow NASDAQ close [DATE]" --freshness pd -n 5

# Economic data
./search.js "CPI inflation Fed rate [DATE]" --freshness pd -n 5

# Sector performance
./search.js "sector performance best worst [DATE]" --freshness pd -n 5

# Stock movers
./search.js "top gainers losers high volume [DATE]" --freshness pd -n 5

# Technical indicators
./search.js "VIX treasury yield gold oil [DATE]" --freshness pd -n 5

# Market news
./search.js "market news headlines [DATE]" --freshness pd -n 5
```

## Example Reference

See `/job/logs/2026-02-15/` for a complete example report.
```

## Requirements

### 1. Brave Search API
- Must have `BRAVE_API_KEY` configured in `LLM_SECRETS`
- Free tier sufficient for daily reports (~6-8 searches per report)
- See `.pi/skills/brave-search/SKILL.md` for setup

### 2. Storage
- Reports saved to `/job/logs/[DATE]/` directory
- Automatically committed to repository
- Each report ~30-40KB total (3 files)

### 3. Time Considerations
- Generation time: 3-5 minutes per report
- Schedule after market close (4:00 PM ET / 9:00 PM UTC)
- Allow 30-minute buffer for data provider updates

## Distribution Options

### Email (Recommended)
Add email sending capability to event handler:

```javascript
// In operating_system/TRIGGERS.json
{
  "name": "email-financial-report",
  "watch_path": "/github/webhook",
  "actions": [
    {
      "type": "command",
      "command": "send-email.js --to investors@company.com --subject 'Daily Market Report' --attachment logs/[DATE]/Executive_Summary_[DATE].md"
    }
  ],
  "enabled": true
}
```

### Slack/Discord
Post summary to team channels:

```javascript
{
  "type": "http",
  "url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
  "method": "POST",
  "vars": {
    "text": "Daily Financial Report Ready",
    "attachments": "[Link to report]"
  }
}
```

### Telegram
Automatic notification via existing integration:
- Report completion triggers Telegram message
- Link to GitHub commit with reports
- Executive summary preview

## Monitoring

### Success Metrics
- Report generated within 5 minutes of scheduled time
- All 3 files created successfully
- Data sources current (within 24 hours)
- No API rate limit errors

### Failure Handling
- If Brave Search fails, use cached data + disclaimer
- Email notification on generation failure
- Retry logic with exponential backoff

## Maintenance

### Weekly
- Review report quality and accuracy
- Check for broken data sources
- Update search queries if patterns change

### Monthly
- Review automation success rate
- Update sector/theme templates as markets evolve
- Optimize search efficiency

### Quarterly
- Review and update risk assessment framework
- Adjust outlook methodology
- Solicit user feedback

## Cost Estimation

**Per Report:**
- Brave Search: ~6-8 queries (free tier: 2,000/month)
- LLM API: ~30-40K tokens (~$0.05-0.10 depending on model)
- GitHub Actions: ~5 minutes compute time

**Monthly (20 trading days):**
- Brave Search: ~160 queries (well within free tier)
- LLM API: ~$1-2
- GitHub Actions: ~100 minutes (within free tier)

**Total Monthly Cost: ~$1-2**

## Customization

### Add Specific Stocks
Track specific holdings:

```json
{
  "name": "portfolio-focus",
  "stocks": ["AAPL", "MSFT", "GOOGL", "NVDA"],
  "include_in_section": "Notable Movers"
}
```

### Industry Focus
Customize for specific industries:

```json
{
  "name": "sector-focus",
  "sectors": ["Technology", "Healthcare", "Financials"],
  "deep_analysis": true
}
```

### Geographic Expansion
Include specific international markets:

```json
{
  "name": "geographic-focus",
  "markets": ["Europe", "Asia", "Emerging Markets"],
  "currency_pairs": ["EUR/USD", "USD/JPY", "GBP/USD"]
}
```

## Support

For issues:
1. Check `/job/logs/[DATE]/job.md` for error details
2. Review session logs in the same directory
3. Verify Brave Search API key is valid
4. Confirm markets are open (trading days only)

---

*Last Updated: February 15, 2026*
