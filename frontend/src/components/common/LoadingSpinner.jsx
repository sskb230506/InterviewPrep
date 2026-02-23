function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div className="loading-wrap" role="status" aria-live="polite">
      <div className="spinner" />
      <span>{label}</span>
    </div>
  );
}

export default LoadingSpinner;
