export default function Chart({ values }) {
  if (!values.length) return <div className="chart-empty">Loading forecast...</div>;
  const min = Math.min(...values); const max = Math.max(...values); const spread = max - min || 1;
  const points = values.map((value, index) => `${(index / Math.max(values.length - 1, 1)) * 100},${92 - ((value - min) / spread) * 70}`).join(' ');
  return <div className="chart-wrap"><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Forecast chart"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" /></svg><div className="chart-labels"><span>Now</span><span>Day 5</span></div></div>;
}
