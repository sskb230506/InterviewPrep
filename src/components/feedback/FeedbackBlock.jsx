import Badge from '../common/Badge';

function FeedbackBlock({ title, points = [], keywords = [] }) {
  return (
    <section className="feedback-block">
      <h4>{title}</h4>
      <ul>
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>

      {keywords.length ? (
        <div className="keyword-wrap">
          {keywords.map((keyword) => (
            <Badge key={keyword} tone="info">
              {keyword}
            </Badge>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default FeedbackBlock;
