function ErrorState({ message, onRetry }) {
  return (
    <div className="panel error-panel" role="alert">
      <p>{message || 'Something went wrong.'}</p>
      {onRetry ? (
        <button type="button" className="btn btn-outline" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

export default ErrorState;
