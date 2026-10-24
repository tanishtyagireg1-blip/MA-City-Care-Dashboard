"""Builds js/data.js (window.DASH) from the Excel model outputs. Run from this folder."""
import json, csv, openpyxl
P = "../dashboard_pack/"
d = json.load(open(P + "dashboard_data.json"))
ai = json.load(open("../out/ai_outputs.json"))
mc = json.load(open("../out/mc.json"))
wb = openpyxl.load_workbook("../out/AI_BudgetForecasting_Model_TanishTyagi.xlsx", data_only=True)

def rows(f):
    out = []
    for r in csv.DictReader(open(P + f)):
        o = {}
        for k, v in r.items():
            if v == "": o[k] = None
            else:
                try: o[k] = float(v) if k not in ("month", "phase") else v
                except ValueError: o[k] = v
        out.append(o)
    return out

S = wb["Scenarios"]
exact = {"base_sales": S["B17"].value, "mix": [S.cell(18, c).value for c in (2, 3, 4)], "purchase_cost": [S.cell(19, c).value for c in (2, 3, 4)],
         "other_variable": S["B20"].value, "base_fixed": S["B21"].value, "last_year_profit": S["B22"].value, "last_year_sales": S["B23"].value,
         "vr": S["B24"].value, "base_profit": S["B25"].value}
d["budget_drivers"]["exact"] = exact
d["budget_drivers"]["monthly_sales"] = [wb["Budget_FY27"][f"B{r}"].value for r in range(32, 44)]
d["budget_drivers"]["monthly_fixed"] = [wb["Budget_FY27"][f"S{r}"].value for r in range(32, 44)]
d["budget_drivers"]["monthly_label"] = [wb["Budget_FY27"][f"A{r}"].value.strftime("%Y-%m") for r in range(32, 44)]
mcs = wb["MonteCarlo"]
d["monte_carlo"]["params"] = mc["params"]
d["monte_carlo"]["draws_profit"] = [int(x) for x in mc["profit"]]
d["monte_carlo"]["draws_sales"] = [int(x) for x in mc["sales"]]

# per-model detail (backtest, forecast)
def pack(block):
    return {"month": [m[:7] if isinstance(m, str) else m for m in block["month"]],
            "sales": block["sales"], "var_cost": block["var_cost"], "fixed_cost": block["fixed_cost"]}
d["models"] = {"backtest": pack(ai["backtest"]), "forecast": pack(ai["forecast"]),
               "params_backtest": ai["params_backtest"], "params_forecast": ai["params_forecast"]}
T = wb["Traditional"]
d["trad_params"] = {"bt": {"slope": T["B7"].value, "intercept": T["B8"].value, "vr": T["B9"].value}, "fc": {"slope": T["C7"].value, "intercept": T["C8"].value, "vr": T["C9"].value, "rent": T["C11"].value, "salaries": T["C12"].value, "other_fixed": T["C13"].value, "rent_esc": T["C14"].value, "sal_inc": T["C15"].value}}
d["series"] = rows("monthly_series.csv")
d["detail"] = rows("monthly_detail.csv")

# learn content from the study guide
sg = wb["Study_Guide"]
d["learn"] = {
  "concepts": [{"name": sg.cell(r, 1).value, "plain": sg.cell(r, 2).value, "formula": sg.cell(r, 3).value, "number": sg.cell(r, 4).value, "where": sg.cell(r, 5).value} for r in range(6, 20)],
  "qa": [{"q": sg.cell(r, 1).value, "a": sg.cell(r, 2).value} for r in range(23, 36)],
  "script": sg.cell(38, 1).value}
open("js/data.js", "w").write("window.DASH = " + json.dumps(d, separators=(",", ":")) + ";\n")
print("ok", len(open("js/data.js").read()) // 1024, "KB;", list(d.keys()))
print(d["models"]["forecast"]["month"][:2], d["learn"]["concepts"][0]["name"], len(d["learn"]["qa"]))
