# CityCare Pharmacy: AI budget forecasting dashboard

An interactive dashboard for the Managerial Accounting WAI project "AI-Driven Budget Forecasting for Small Businesses" (Tanish Tyagi, M56D-26, IIM Ranchi). CityCare Pharmacy is a hypothetical business and all data are simulated. Every figure matches the companion Excel model.

## What is in it

| Tab | What you can do |
|---|---|
| Overview | Headline numbers, actual vs forecast chart (switch measure and range), annual comparison, findings |
| Business and data | Category sales, cost structure, seasonality, data-quality checks, sortable data explorer |
| Traditional method | Trend line (24 or 18 month window), residuals, traditional budget, CVP lab with sliders |
| AI forecast | Holt-Winters, Ridge and ensemble; ensemble weight lab; monthly AI budget |
| Accuracy | MAPE, MAE, RMSE, benchmark vs seasonal naive, tracking signal, bias |
| Variance analysis | Static vs flexible budget bridge, F/U variances on the traditional or AI budget |
| Budget lab | Five sliders and scenario presets, profit grid (click a cell), live tornado, monthly budget |
| Risk | Python Monte Carlo and a live in-browser simulation, target-profit slider, distribution |
| Learn | Concept cards, viva practice, two-minute script (hide before submission, see below) |

Every chart has a Table view and Save image button. Theme can be system, light or dark. "Download data (CSV)" exports the series, monthly detail and simulation draws.

## Put it on GitHub Pages

1. Create a new public repository, for example `citycare-dashboard`.
2. Upload everything in this folder to the repository root (`index.html` must be at the top level; keep the `.nojekyll` file).
3. In the repository go to Settings, then Pages. Under "Build and deployment" choose "Deploy from a branch", pick `main` and `/ (root)`, and save.
4. After a minute the site is live at `https://<your-username>.github.io/citycare-dashboard/`.

It is plain HTML, CSS and JavaScript with no build step. Chart.js and the fonts are included, so it works offline and by double-clicking `index.html`.

## Customise

- Hide the Learn tab: set `showLearn: false` in `js/config.js`.
- Change title, name or course: edit `js/config.js`.
- Refresh the numbers after changing the Excel model: run `python tools/build_data.py` (edit the paths at the top to point at your workbook and data pack). It rewrites `js/data.js`.

## Files

- `index.html`, `css/style.css`: page and styling
- `js/core.js`: chart framework, formatters, what-if engine
- `js/s-*.js`: one file per tab
- `js/data.js`: all model outputs (generated)
- `vendor/chart.umd.js`: Chart.js 4.4.1
- `fonts/`: Bricolage Grotesque and Public Sans
