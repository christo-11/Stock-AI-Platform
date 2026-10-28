"""Feature preparation for forecasting models."""
import pandas as pd


def add_features(frame: pd.DataFrame) -> pd.DataFrame:
    data = frame.copy()
    data["return"] = data["Close"].pct_change().fillna(0)
    data["sma_7"] = data["Close"].rolling(7, min_periods=1).mean()
    data["sma_30"] = data["Close"].rolling(30, min_periods=1).mean()
    data["volatility"] = data["return"].rolling(14, min_periods=2).std().fillna(0)
    return data


def latest_features(frame: pd.DataFrame) -> dict:
    row = add_features(frame).iloc[-1]
    return {key: float(row[key]) for key in ("Close", "return", "sma_7", "sma_30", "volatility")}
