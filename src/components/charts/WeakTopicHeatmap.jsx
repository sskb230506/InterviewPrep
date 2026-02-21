function toneClass(value) {
  if (value >= 4) return 'heat-high';
  if (value >= 3) return 'heat-medium';
  return 'heat-low';
}

function WeakTopicHeatmap({ data }) {
  return (
    <div className="panel">
      <h3>Weak Topic Heatmap</h3>
      <div className="heatmap-grid">
        {data.map((item) => (
          <div key={item.topic} className={`heatmap-item ${toneClass(item.value)}`}>
            <p>{item.topic}</p>
            <strong>Risk {item.value}/5</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WeakTopicHeatmap;
