"""SQLite persistence for a small portfolio watchlist."""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "stock_ai.db"


def connect():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    with connect() as connection:
        connection.execute("""CREATE TABLE IF NOT EXISTS portfolio (
            symbol TEXT PRIMARY KEY,
            shares REAL NOT NULL DEFAULT 0,
            average_price REAL NOT NULL DEFAULT 0
        )""")
        connection.commit()


def list_positions():
    with connect() as connection:
        return [dict(row) for row in connection.execute("SELECT * FROM portfolio ORDER BY symbol")]


def upsert_position(symbol: str, shares: float, average_price: float):
    with connect() as connection:
        connection.execute(
            "INSERT INTO portfolio(symbol, shares, average_price) VALUES (?, ?, ?) "
            "ON CONFLICT(symbol) DO UPDATE SET shares=excluded.shares, average_price=excluded.average_price",
            (symbol.upper(), shares, average_price),
        )
        connection.commit()
