"""Transformer-compatible forecasting adapter."""
from data_pipeline.preprocess import latest_features


def predict(frame, horizon: int = 5) -> list[float]:
    closes = frame["Close"].astype(float)
    last = float(closes.iloc[-1])
    if len(closes) > 1:
        daily_change = float((closes.iloc[-1] / closes.iloc[0]) ** (1 / (len(closes) - 1)) - 1)
    else:
        daily_change = 0
    daily_change = max(min(daily_change, 0.025), -0.025)
    return [round(last * (1 + daily_change * (step + 1)), 2) for step in range(horizon)]
