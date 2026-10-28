import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function Portfolio() {
  const [positions, setPositions] = useState([]);
  useEffect(() => { fetch(`${API}/portfolio`).then((response) => response.json()).then((data) => setPositions(data.positions || [])); }, []);
  return <main className="shell narrow"><header className="topbar"><div><span className="eyebrow">ACCOUNT / 02</span><h1>Portfolio</h1></div><a href="/">Dashboard</a></header><section className="panel"><div className="panel-heading"><h2>Tracked positions</h2><span className="metric">{positions.length} assets</span></div>{positions.length ? positions.map((position) => <div className="position" key={position.symbol}><strong>{position.symbol}</strong><span>{position.shares} shares</span><span>${position.average_price.toFixed(2)} avg</span></div>) : <p className="empty">No positions yet. Use the API to add a holding.</p>}</section></main>;
}
