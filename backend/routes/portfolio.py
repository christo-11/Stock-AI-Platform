from flask import Blueprint, jsonify, request

from backend.db import list_positions, upsert_position

portfolio_api = Blueprint("portfolio", __name__)


@portfolio_api.get("/portfolio")
def get_portfolio():
    return jsonify({"positions": list_positions()})


@portfolio_api.post("/portfolio")
def save_position():
    payload = request.get_json(silent=True) or {}
    try:
        symbol = str(payload["symbol"]).upper()
        shares = float(payload["shares"])
        average_price = float(payload["average_price"])
        if not symbol or shares < 0 or average_price < 0:
            raise ValueError
    except (KeyError, TypeError, ValueError):
        return jsonify({"error": "symbol, non-negative shares, and average_price are required"}), 400
    upsert_position(symbol, shares, average_price)
    return jsonify({"saved": True, "positions": list_positions()}), 201
