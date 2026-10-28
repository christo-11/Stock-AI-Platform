"""Combine model forecasts into one prediction."""
from models.lstm_model import predict as lstm_predict
from models.transformer_model import predict as transformer_predict


def predict(frame, horizon: int = 5) -> dict:
    lstm = lstm_predict(frame, horizon)
    transformer = transformer_predict(frame, horizon)
    ensemble = [round((left + right) / 2, 2) for left, right in zip(lstm, transformer)]
    return {"ensemble": ensemble, "lstm": lstm, "transformer": transformer}
