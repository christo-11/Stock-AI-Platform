"""Market data loading helpers."""
import json
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
SAMPLE_DIR = ROOT / "sample_data"


def _safe_symbol(symbol: str) -> str:
    return "".join(character if character.isalnum() or character in ".-_" else "_" for character in symbol.upper())


def _fetch_global_history(symbol: str, start_date: str | None = None, end_date: str | None = None) -> pd.DataFrame:
    """Fetch daily prices from Yahoo Finance and cache them as a local CSV."""
    end = pd.Timestamp(end_date) if end_date else pd.Timestamp.now(tz="UTC")
    start = pd.Timestamp(start_date) if start_date else end - pd.Timedelta(days=365 * 5)
    period1 = int(start.timestamp())
    period2 = int((end + pd.Timedelta(days=2)).timestamp())
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{quote(symbol)}?period1={period1}&period2={period2}&interval=1d&events=history"
    request = Request(url, headers={"User-Agent": "stock-ai-platform/1.0"})
    try:
        with urlopen(request, timeout=15) as response:
            payload = json.load(response)
    except (HTTPError, URLError, TimeoutError) as error:
        raise FileNotFoundError(f"Global market data unavailable for {symbol.upper()}: {error}") from error

    result = (payload.get("chart", {}).get("result") or [None])[0]
    if not result or not result.get("timestamp"):
        raise FileNotFoundError(f"No global market data found for {symbol.upper()}")
    quote_data = result.get("indicators", {}).get("quote", [{}])[0]
    rows = []
    for index, timestamp in enumerate(result["timestamp"]):
        close = quote_data.get("close", [None])[index]
        if close is None:
            continue
        rows.append({
            "Date": pd.to_datetime(timestamp, unit="s", utc=True).tz_convert(None).normalize(),
            "Open": quote_data.get("open", [None])[index],
            "High": quote_data.get("high", [None])[index],
            "Low": quote_data.get("low", [None])[index],
            "Close": close,
            "Volume": quote_data.get("volume", [0])[index] or 0,
        })
    frame = validate_dataset(pd.DataFrame(rows))
    SAMPLE_DIR.mkdir(exist_ok=True)
    frame.to_csv(SAMPLE_DIR / f"{_safe_symbol(symbol)}.csv", index=False)
    return frame


def available_symbols() -> list[str]:
    return sorted(path.stem.upper() for path in SAMPLE_DIR.glob("*.csv"))


def load_price_history(symbol: str, rows: int = 120, start_date: str | None = None, end_date: str | None = None) -> pd.DataFrame:
    """Load price history from the local dataset."""
    normalized_symbol = symbol.strip().upper()
    path = SAMPLE_DIR / f"{_safe_symbol(normalized_symbol)}.csv"
    if not path.exists():
        frame = _fetch_global_history(normalized_symbol, start_date, end_date)
    else:
        frame = pd.read_csv(path, parse_dates=["Date"])
    if start_date:
        frame = frame[frame["Date"] >= pd.Timestamp(start_date)]
    if end_date:
        frame = frame[frame["Date"] <= pd.Timestamp(end_date)]
    if frame.empty:
        raise ValueError(f"No {symbol.upper()} data exists in the selected date range")
    if not start_date and not end_date:
        frame = frame.tail(rows)
    return frame.reset_index(drop=True)


def validate_dataset(frame: pd.DataFrame) -> pd.DataFrame:
    required = {"Date", "Close"}
    missing = required - set(frame.columns)
    if missing:
        raise ValueError(f"CSV requires columns: {', '.join(sorted(missing))}")
    frame = frame.copy()
    frame["Date"] = pd.to_datetime(frame["Date"], errors="raise")
    frame["Close"] = pd.to_numeric(frame["Close"], errors="raise")
    return frame.sort_values("Date").reset_index(drop=True)
