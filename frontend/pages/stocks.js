import { useEffect, useMemo, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function Stocks() {
  const [stocks, setStocks] = useState([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('symbol');
  const [direction, setDirection] = useState('asc');
  const [page, setPage] = useState(1);
  const [watchlist, setWatchlist] = useState([]);
  const pageSize = 25;

  useEffect(() => {
    fetch(`${API}/stocks`).then((response) => response.json()).then((data) => setStocks(data.stocks || []));
    setWatchlist(JSON.parse(window.localStorage.getItem('stock-watchlist') || '[]'));
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toUpperCase();
    return [...stocks].filter((item) => !normalized || item.symbol.includes(normalized)).sort((left, right) => {
      const a = left[sort]; const b = right[sort];
      const result = typeof a === 'string' ? a.localeCompare(b) : a - b;
      return direction === 'asc' ? result : -result;
    });
  }, [stocks, query, sort, direction]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  function chooseSort(column) {
    setPage(1);
    if (column === sort) setDirection((value) => value === 'asc' ? 'desc' : 'asc');
    else { setSort(column); setDirection('asc'); }
  }

  function toggleWatchlist(symbol) {
    const next = watchlist.includes(symbol) ? watchlist.filter((item) => item !== symbol) : [...watchlist, symbol];
    setWatchlist(next);
    window.localStorage.setItem('stock-watchlist', JSON.stringify(next));
  }

  function sortLabel(column, label) {
    return <button type="button" onClick={() => chooseSort(column)} style={{ background: 'none', color: 'var(--ink)', padding: 0, textTransform: 'none' }}>{label}{sort === column ? (direction === 'asc' ? ' ↑' : ' ↓') : ''}</button>;
  }

  return <main className="shell">
    <header className="topbar"><div><span className="eyebrow">MARKETS / DIRECTORY</span><h1>Stocks</h1><p className="status">A live view of the datasets available in your workspace.</p></div><nav style={{ display: 'flex', gap: 12 }}><a href="/">Analysis</a><a href="/portfolio">Portfolio</a></nav></header>
    <section className="panel" style={{ marginTop: 22 }}><div className="panel-heading"><div><span className="eyebrow">STOCK SCREENER</span><h2>Browse tracked companies</h2></div><span className="metric">{filtered.length} results</span></div><div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '22px 0 14px', flexWrap: 'wrap' }}><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search ticker symbol" aria-label="Search ticker symbol" style={{ flex: '1 1 260px', minWidth: 220 }} /><span className="status">Watchlist: {watchlist.length}</span><a href="/" style={{ background: 'var(--ink)', color: 'var(--paper)', padding: '10px 14px', textDecoration: 'none', font: '500 11px DM Mono, monospace', textTransform: 'uppercase' }}>Run analysis</a></div><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 950 }}><thead><tr>{[['symbol', 'Ticker'], ['last_close', 'Price'], ['period_change_pct', 'Period change'], ['volatility_pct', 'Volatility'], ['predicted_close', 'Forecast'], ['prediction_change_pct', 'Forecast change'], ['rows', 'Rows']].map(([column, label]) => <th key={column} style={{ textAlign: 'left', borderBottom: '1px solid var(--line)', padding: '12px 8px', whiteSpace: 'nowrap' }}>{sortLabel(column, label)}</th>)}<th style={{ borderBottom: '1px solid var(--line)' }} /></tr></thead><tbody>{visible.map((item) => <tr key={item.symbol}><td style={{ padding: '14px 8px', borderBottom: '1px solid var(--line)' }}><strong>{item.symbol}</strong></td><td style={{ padding: '14px 8px', borderBottom: '1px solid var(--line)' }}>${item.last_close}</td><td className={item.period_change_pct >= 0 ? 'positive' : 'negative'} style={{ padding: '14px 8px', borderBottom: '1px solid var(--line)' }}>{item.period_change_pct}%</td><td style={{ padding: '14px 8px', borderBottom: '1px solid var(--line)' }}>{item.volatility_pct}%</td><td style={{ padding: '14px 8px', borderBottom: '1px solid var(--line)' }}>${item.predicted_close}</td><td className={item.prediction_change_pct >= 0 ? 'positive' : 'negative'} style={{ padding: '14px 8px', borderBottom: '1px solid var(--line)' }}>{item.prediction_change_pct}%</td><td style={{ padding: '14px 8px', borderBottom: '1px solid var(--line)' }}>{item.rows}</td><td style={{ padding: '14px 8px', borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap' }}><button type="button" onClick={() => toggleWatchlist(item.symbol)} style={{ background: 'none', color: watchlist.includes(item.symbol) ? 'var(--accent)' : 'var(--muted)', padding: 4, fontSize: 18 }} aria-label={`Toggle ${item.symbol} watchlist`}>{watchlist.includes(item.symbol) ? '★' : '☆'}</button><a href={`/?symbol=${item.symbol}`} style={{ marginLeft: 8, color: 'var(--ink)', font: '500 11px DM Mono, monospace' }}>Analyze</a></td></tr>)}</tbody></table></div>{!visible.length && <p className="empty">No matching datasets. Upload a CSV from the analysis page.</p>}<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 }}><span className="status">Page {page} of {pages}</span><div style={{ display: 'flex', gap: 8 }}><button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><button type="button" disabled={page === pages} onClick={() => setPage((value) => value + 1)}>Next</button></div></div></section>
  </main>;
}
