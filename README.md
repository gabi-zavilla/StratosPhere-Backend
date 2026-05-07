# StratoSphere Resilience Intelligence

Backend API and static dashboard prototype for the StratoSphere resilience testing platform.

## What is included

- Executive portfolio dashboard based on the Apps Script dashboard logic
- Workbook-backed data from `Resilience Testing 2026 Calendar (5).xlsx`
- Service catalogue YAML reader for catalogue-style imports
- Service catalogue list with search and tier filtering
- Evenly distributed schedule rebalance
- TechOps evaluation queue
- Evidence upload/extraction simulation
- Evaluation engine simulation using the custom scoring dimensions
- Auto-refreshing portfolio graph
- Jira RT ticket generation simulation
- Admin mapping controls for folders, Jira, and workflow status

## Run locally

Open `index.html` in a browser.

For the YAML fetch to work locally, run any static file server from this folder, for example:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## Deploy to GitHub Pages

1. Create a GitHub repository.
2. Push these files to the repository root.
3. In GitHub, go to `Settings > Pages`.
4. Select `Deploy from a branch`.
5. Select your default branch and `/root`.
6. Save and open the published Pages URL.

## Replace workbook data

The deployed app currently reads:

```text
data/workbook-data.json
```

That JSON was extracted from:

```text
Resilience Testing 2026 Calendar (5).xlsx
```

To refresh it after changing the workbook, run:

```bash
python3 tools/extract-workbook.py "/path/to/Resilience Testing 2026 Calendar.xlsx" data/workbook-data.json
```

The extractor reads the `Product Services 2026 schedule`, `Risk Engine`, and `DashboardData` sheets.

## Replace catalogue YAML

Edit `data/service-catalogue.yaml` with your real service catalogue fields:

```yaml
- id: svc-example
  name: Example Service
  pillar: Customer
  tier: Tier 1
  owner: Example Team
  service_type: Internal
  status: TechOps Review
  due_date: 2026-06-01
  completed_on_time:
```

The app stores runtime state in browser `localStorage`, so refreshes preserve evaluations, evidence records, schedules, and generated Jira tickets.

## Next production step

This prototype is front-end only. To turn it into the real agentic platform, add a backend service for:

- enterprise SSO and RBAC
- GitHub service catalogue API sync
- document storage and text extraction
- model-based evaluation orchestration
- Jira OAuth/API integration
- audit logs and persistent database storage
