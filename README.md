# Stock AI Platform

A stock analysis platform for price forecasting, global market data, and portfolio tracking. It includes a Flask API, a Next.js dashboard, local sample data, and container deployment manifests.

## Run locally

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m backend.app
```

The API runs at `http://localhost:5000`. In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

The dashboard runs at `http://localhost:3000`.

## API

- `GET /api/health`
- `GET /api/predict/<symbol>?horizon=5`
- `GET /api/portfolio`
- `POST /api/portfolio` with `{ "symbol": "AAPL", "shares": 10, "average_price": 230 }`

## Global tickers

The analysis API automatically fetches and caches daily history for tickers that are not already in `sample_data`, using Yahoo Finance chart data. Use exchange-qualified symbols where needed: `RELIANCE.NS` for India, `7203.T` for Japan, or `0005.HK` for Hong Kong. The same date filters, portfolio inputs, and forecast models are applied to global and uploaded datasets.

Global fetching requires internet access. If the provider is unavailable, upload a CSV for that ticker instead.

The LSTM and Transformer modules currently provide deterministic momentum baselines. Replace their `predict` functions with trained weights before using the platform for investment decisions.

## Docker

From the `deployment` directory, run `docker compose up --build`. This starts the API on port 5000 and the dashboard on port 3000.
"# Stock-AI-Platform" 
