"""Training entry point placeholder for replacing baseline adapters with weights."""
from data_pipeline.fetch_data import load_price_history
from data_pipeline.preprocess import add_features


def build_training_frame(symbol: str = "AAPL"):
    return add_features(load_price_history(symbol))


if __name__ == "__main__":
    print(build_training_frame().tail())
