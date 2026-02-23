import { Link } from 'react-router-dom';

function EmptyState({ title, message, ctaLabel, ctaTo }) {
  return (
    <div className="panel empty-panel">
      <h3>{title}</h3>
      <p>{message}</p>
      {ctaLabel && ctaTo ? (
        <Link className="btn btn-primary" to={ctaTo}>
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}

export default EmptyState;
