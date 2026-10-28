"""LSTM-compatible forecasting adapter.

The baseline uses recent momentum until trained weights are supplied.
"""
from data_pipeline.preprocess import latest_features


def predict(frame, horizon: int = 5) -> list[float]:
    closes = frame["Close"].astype(float)
    last = float(closes.iloc[-1])
    daily_change = float(closes.pct_change().tail(3).mean()) if len(closes) > 1 else 0
    daily_change = max(min(daily_change, 0.03), -0.03)
    return [round(last * (1 + daily_change * (step + 1)), 2) for step in range(horizon)]
