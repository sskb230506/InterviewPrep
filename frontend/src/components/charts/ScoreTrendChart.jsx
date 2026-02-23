import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function ScoreTrendChart({ data }) {
  return (
    <div className="panel chart-panel">
      <h3>Score & Confidence Trend</h3>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="4 4" stroke="rgba(9, 36, 81, 0.15)" />
            <XAxis dataKey="label" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="score" stroke="#003049" strokeWidth={3} dot={{ r: 3 }} />
            <Line
              type="monotone"
              dataKey="confidence"
              stroke="#f77f00"
              strokeWidth={3}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default ScoreTrendChart;
