import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Chart from '../components/Chart';
import PredictionCard from '../components/PredictionCard';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function Home() {
  const router = useRouter();
  const [symbol, setSymbol] = useState('AAPL');
  const [symbolInput, setSymbolInput] = useState('AAPL');
  const [horizon, setHorizon] = useState(5);
  const [stockCount, setStockCount] = useState(6);
  const [stockInputs, setStockInputs] = useState(['AAPL', 'TSLA', 'MSFT', 'NVDA', 'AMZN', 'GOOGL']);
  const [portfolioInputs, setPortfolioInputs] = useState(Array.from({ length: 6 }, () => ({ shares: '', average_price: '' })));
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [riskTolerance, setRiskTolerance] = useState('balanced');
  const [objective, setObjective] = useState('growth');
  const [symbols, setSymbols] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [analysis, setAnalysis] = useState([]);
  const [uploadMessage, setUploadMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;
    const initialSymbol = typeof router.query.symbol === 'string' ? router.query.symbol.toUpperCase() : 'AAPL';
    fetch(`${API}/symbols`).then((response) => response.json()).then((data) => setSymbols(data.symbols || []));
    setSymbolInput(initialSymbol);
    loadForecast(initialSymbol, 5);
  }, [router.isReady, router.query.symbol]);

  async function loadForecast(nextSymbol, nextHorizon) {
    const cleanSymbol = nextSymbol.trim().toUpperCase();
    setError('');
    const response = await fetch(`${API}/predict/${encodeURIComponent(cleanSymbol)}?horizon=${nextHorizon}`);
    const data = await response.json();
    if (!response.ok) { setForecast(null); setError(data.error || 'Dataset not found'); return; }
    setSymbol(cleanSymbol);
    setForecast(data);
  }

  function submit(event) {
    event.preventDefault();
    loadForecast(symbolInput, horizon);
  }

  function changeStockCount(event) {
    const count = Math.min(Math.max(Number(event.target.value) || 1, 1), 20);
    setStockCount(count);
    setStockInputs((current) => Array.from({ length: count }, (_, index) => current[index] || ''));
    setPortfolioInputs((current) => Array.from({ length: count }, (_, index) => current[index] || { shares: '', average_price: '' }));
  }

  function updateStock(index, value) {
    setStockInputs((current) => current.map((item, itemIndex) => itemIndex === index ? value : item));
  }

  function updatePortfolio(index, field, value) {
    setPortfolioInputs((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  }

  async function runAnalysis(stockList) {
    setError('');
    const portfolio = stockList.map((stock, index) => ({ symbol: stock, ...portfolioInputs[index] })).filter((item) => item.shares || item.average_price);
    const firstSymbol = stockList.find((item) => item.trim());
    if (firstSymbol) await loadForecast(firstSymbol, horizon);
    const response = await fetch(`${API}/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ symbols: stockList, horizon, start_date: startDate || null, end_date: endDate || null, portfolio, preferences: { risk_tolerance: riskTolerance, objective } }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || 'Analysis failed'); return; }
    setAnalysis(data.results || []);
    if (data.errors?.length) setError(data.errors.join(' | '));
  }

  function analyzeStocks(event) {
    event.preventDefault();
    runAnalysis(stockInputs);
  }

  async function uploadFiles(event) {
    const files = [...event.target.files];
    if (!files.length) return;
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    const response = await fetch(`${API}/upload`, { method: 'POST', body: formData });
    const data = await response.json();
    setUploadMessage(data.saved?.length ? `Added datasets: ${data.saved.join(', ')}` : 'No files were added');
    if (data.errors?.length) setError(data.errors.join(' | '));
    if (data.saved?.length) {
      const uploadedSymbols = [...new Set(data.saved)];
      setStockCount(uploadedSymbols.length);
      setStockInputs(uploadedSymbols);
      setPortfolioInputs(uploadedSymbols.map(() => ({ shares: '', average_price: '' })));
      setSymbolInput(uploadedSymbols[0]);
      await loadForecast(uploadedSymbols[0], horizon);
      await runAnalysis(uploadedSymbols);
      setUploadMessage(`Added and analyzed: ${uploadedSymbols.join(', ')}`);
    }
    const symbolsResponse = await fetch(`${API}/symbols`);
    setSymbols((await symbolsResponse.json()).symbols || []);
  }

  return <main className="shell app-shell">
    <header className="topbar"><div><span className="eyebrow">SIGNAL DESK / 01</span><h1>Market intelligence, without the noise.</h1></div><nav style={{ display: 'flex', gap: 12 }}><a href="/stocks">Stocks</a><a href="/portfolio">Portfolio</a></nav></header>
    <section className="panel" style={{ margin: '22px 0 16px' }}><div className="panel-heading"><div><span className="eyebrow">ANALYSIS INPUT</span><h2>Build a multi-stock report</h2></div><span className="metric">Global tickers or CSV</span></div><form onSubmit={analyzeStocks} style={{ marginTop: 24 }}><div style={{ display: 'flex', gap: 18, alignItems: 'end', flexWrap: 'wrap' }}><label>NUMBER OF STOCKS<input className="days" type="number" min="1" max="10" value={stockCount} onChange={changeStockCount} /></label><label>FORECAST DAYS<input className="days" type="number" min="1" max="30" value={horizon} onChange={(event) => setHorizon(Number(event.target.value))} /></label><label>FROM<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>TO<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label><label>RISK<select value={riskTolerance} onChange={(event) => setRiskTolerance(event.target.value)}><option value="conservative">Conservative</option><option value="balanced">Balanced</option><option value="aggressive">Aggressive</option></select></label><label>OBJECTIVE<select value={objective} onChange={(event) => setObjective(event.target.value)}><option value="growth">Growth</option><option value="income">Income</option><option value="preservation">Capital preservation</option></select></label><button type="submit">Analyze stocks</button><label style={{ border: '1px dashed var(--line)', padding: '10px 14px', cursor: 'pointer' }}>ADD CSV FILES<input type="file" accept=".csv,text/csv" multiple onChange={uploadFiles} style={{ display: 'none' }} /></label></div><p className="status">Examples: AAPL, MSFT, RELIANCE.NS, 7203.T, 0005.HK</p><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10, marginTop: 18 }}>{stockInputs.map((item, index) => <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}><input list="symbols" value={item} onChange={(event) => updateStock(index, event.target.value)} placeholder={`Ticker ${index + 1}`} aria-label={`Ticker ${index + 1} symbol`} /><input type="number" min="0" value={portfolioInputs[index]?.shares || ''} onChange={(event) => updatePortfolio(index, 'shares', event.target.value)} placeholder="Shares" aria-label={`${item || `Stock ${index + 1}`} shares`} /><input type="number" min="0" step="0.01" value={portfolioInputs[index]?.average_price || ''} onChange={(event) => updatePortfolio(index, 'average_price', event.target.value)} placeholder="Avg price" aria-label={`${item || `Stock ${index + 1}`} average price`} /></div>)}</div><datalist id="symbols">{symbols.map((item) => <option key={item} value={item} />)}</datalist></form>{uploadMessage && <p className="status" style={{ marginBottom: 0 }}>{uploadMessage}</p>}</section>
    <form className="controls" onSubmit={submit}><label>QUICK SYMBOL <input list="symbols" value={symbolInput} onChange={(event) => setSymbolInput(event.target.value)} placeholder="AAPL" /></label><button type="submit">Predict one</button><span className="status"><i /> Dataset-backed signal</span></form>
    {error && <div className="error">{error}. Available datasets: {symbols.join(', ') || 'none'}.</div>}
    <section className="grid"><div className="panel chart-panel"><div className="panel-heading"><div><span className="eyebrow">PRICE TRAJECTORY</span><h2>{symbol} forecast</h2></div><span className="metric">{horizon}D horizon</span></div><Chart values={[...(forecast?.history || []).map((item) => item.close), ...(forecast?.ensemble || [])]} /></div><PredictionCard forecast={forecast} /></section>
    {analysis.length > 0 && <section className="panel" style={{ marginTop: 16, overflowX: 'auto' }}><div className="panel-heading"><div><span className="eyebrow">REPORT OUTPUT</span><h2>Stock analysis</h2></div><span className="metric">{analysis.length} analyzed</span></div><p className="status">Risk: {riskTolerance} / Objective: {objective} / Portfolio value: ${analysis.reduce((total, item) => total + item.position_value, 0).toFixed(2)}</p><table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 22, minWidth: 1550 }}><thead><tr>{['Symbol', 'Latest date', 'Rows', 'Shares', 'Position value', 'Weight', 'Open', 'High', 'Low', 'Close', 'Avg volume', 'Period change', 'Volatility', 'Predicted close', 'Forecast change'].map((heading) => <th key={heading} style={{ textAlign: 'left', borderBottom: '1px solid var(--line)', padding: '10px 8px' }}>{heading}</th>)}</tr></thead><tbody>{analysis.map((item) => <tr key={item.symbol}>{[item.symbol, item.latest_date, item.rows, item.owned_shares, `$${item.position_value}`, `${item.portfolio_weight_pct}%`, `$${item.open ?? '-'}`, `$${item.high ?? '-'}`, `$${item.low ?? '-'}`, `$${item.last_close}`, item.average_volume.toLocaleString(), `${item.period_change_pct}%`, `${item.volatility_pct}%`, `$${item.predicted_close}`, `${item.prediction_change_pct}%`].map((value, index) => <td key={index} style={{ borderBottom: '1px solid var(--line)', padding: '12px 8px' }}>{value}</td>)}</tr>)}</tbody></table></section>}
  </main>;
}
