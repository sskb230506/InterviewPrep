import { scoreTone } from '../../utils/helpers';

function ScoreBadge({ label, value }) {
  const tone = scoreTone(value);

  return (
    <div className={`score-badge score-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default ScoreBadge;
