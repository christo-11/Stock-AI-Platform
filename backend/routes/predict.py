from pathlib import Path

from flask import Blueprint, jsonify, request
from werkzeug.utils import secure_filename

from data_pipeline.fetch_data import ROOT, available_symbols, load_price_history, validate_dataset
from models.ensemble import predict

predict_api = Blueprint("predict", __name__)


@predict_api.get("/symbols")
def symbols():
    return jsonify({"symbols": available_symbols()})


@predict_api.get("/stocks")
def stocks():
    rows = []
    for symbol in available_symbols():
        try:
            rows.append(analysis_for(symbol, 5))
        except (FileNotFoundError, ValueError):
            continue
    return jsonify({"stocks": rows, "total": len(rows)})


@predict_api.post("/upload")
def upload_datasets():
    files = request.files.getlist("files")
    if not files:
        return jsonify({"error": "Select at least one CSV file"}), 400
    saved = []
    errors = []
    sample_dir = ROOT / "sample_data"
    sample_dir.mkdir(exist_ok=True)
    for uploaded in files:
        filename = secure_filename(uploaded.filename or "")
        if not filename.lower().endswith(".csv"):
            errors.append(f"{filename or 'Unnamed file'} is not a CSV")
            continue
        symbol = Path(filename).stem.upper()
        try:
            import pandas as pd
            frame = validate_dataset(pd.read_csv(uploaded))
            frame.to_csv(sample_dir / f"{symbol}.csv", index=False)
            saved.append(symbol)
        except (ValueError, pd.errors.ParserError) as error:
            errors.append(f"{filename}: {error}")
    status = 201 if saved else 400
    return jsonify({"saved": saved, "errors": errors, "symbols": available_symbols()}), status


def analysis_for(symbol: str, horizon: int, start_date: str | None = None, end_date: str | None = None, position: dict | None = None) -> dict:
    history = load_price_history(symbol, start_date=start_date, end_date=end_date)
    closes = history["Close"].astype(float)
    returns = closes.pct_change().dropna()
    result = predict(history, horizon)
    latest = history.iloc[-1]
    volume = history["Volume"].mean() if "Volume" in history else 0
    volatility_pct = round(float(returns.std() * 100) if not returns.empty else 0, 2)
    shares = float((position or {}).get("shares", 0) or 0)
    average_price = float((position or {}).get("average_price", 0) or 0)
    return {
        "symbol": symbol.upper(),
        "rows": len(history),
        "latest_date": latest["Date"].strftime("%Y-%m-%d"),
        "open": round(float(latest["Open"]), 2) if "Open" in history else None,
        "high": round(float(latest["High"]), 2) if "High" in history else None,
        "low": round(float(latest["Low"]), 2) if "Low" in history else None,
        "average_volume": round(float(volume), 0),
        "last_close": round(float(closes.iloc[-1]), 2),
        "period_change_pct": round(float((closes.iloc[-1] / closes.iloc[0] - 1) * 100), 2),
        "average_close": round(float(closes.mean()), 2),
        "volatility_pct": volatility_pct,
        "risk_score": min(round(volatility_pct * 20), 100),
        "risk_level": "low" if volatility_pct < 1 else "medium" if volatility_pct < 2.5 else "high",
        "predicted_close": result["ensemble"][-1],
        "prediction_change_pct": round(float((result["ensemble"][-1] / closes.iloc[-1] - 1) * 100), 2),
        "forecast": result["ensemble"],
        "owned_shares": shares,
        "average_price": average_price,
        "position_value": round(float(closes.iloc[-1] * shares), 2),
    }


@predict_api.post("/analyze")
def analyze():
    payload = request.get_json(silent=True) or {}
    requested = payload.get("symbols", [])
    horizon = min(max(int(payload.get("horizon", 5)), 1), 30)
    start_date = payload.get("start_date") or None
    end_date = payload.get("end_date") or None
    preferences = payload.get("preferences") or {}
    portfolio = {str(item.get("symbol", "")).strip().upper(): item for item in payload.get("portfolio", []) if isinstance(item, dict)}
    if not isinstance(requested, list) or not requested:
        return jsonify({"error": "Provide at least one stock symbol"}), 400
    results = []
    errors = []
    for symbol in dict.fromkeys(str(item).strip().upper() for item in requested if str(item).strip()):
        try:
            results.append(analysis_for(symbol, horizon, start_date, end_date, portfolio.get(symbol)))
        except (FileNotFoundError, ValueError) as error:
            errors.append(str(error))
    invested_value = round(sum(item["position_value"] for item in results), 2)
    for item in results:
        item["portfolio_weight_pct"] = round(item["position_value"] / invested_value * 100, 2) if invested_value else 0
        item["preference_note"] = {
            "conservative": "Prioritize lower-volatility positions and review risk before acting.",
            "balanced": "Balance forecast potential with volatility and portfolio weight.",
            "aggressive": "Higher forecast potential may suit this preference, with increased risk.",
        }.get(preferences.get("risk_tolerance", "balanced"), "Balance forecast potential with volatility and portfolio weight.")
    return jsonify({
        "results": results,
        "errors": errors,
        "horizon": horizon,
        "date_range": {"start": start_date, "end": end_date},
        "preferences": preferences,
        "portfolio_value": invested_value,
    })


@predict_api.get("/predict/<symbol>")
def forecast(symbol):
    horizon = min(max(request.args.get("horizon", default=5, type=int), 1), 30)
    try:
        history = load_price_history(symbol.upper())
    except FileNotFoundError as error:
        return jsonify({"error": str(error), "available_symbols": available_symbols()}), 404
    result = predict(history, horizon)
    returns = history["Close"].astype(float).pct_change().dropna()
    volatility_pct = round(float(returns.std() * 100) if not returns.empty else 0, 2)
    return jsonify({
        "symbol": symbol.upper(),
        "last_close": float(history.iloc[-1]["Close"]),
        "history": [{"date": row.Date.strftime("%Y-%m-%d"), "close": float(row.Close)} for row in history.itertuples()],
        "volatility_pct": volatility_pct,
        "risk_score": min(round(volatility_pct * 20), 100),
        "risk_level": "low" if volatility_pct < 1 else "medium" if volatility_pct < 2.5 else "high",
        **result,
    })
