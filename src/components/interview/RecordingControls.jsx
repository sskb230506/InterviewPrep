import { formatSeconds } from '../../utils/helpers';

function RecordingControls({
  isRecording,
  duration,
  audioUrl,
  onStart,
  onStop,
  onClear,
  onSubmit,
  submitting,
  disabled,
}) {
  return (
    <div className="panel recording-panel">
      <div className="recording-head">
        <h3>Answer Recorder</h3>
        <span className={`record-dot ${isRecording ? 'active' : ''}`}>
          {isRecording ? 'Recording' : 'Idle'}
        </span>
      </div>

      <p className="timer">{formatSeconds(duration)}</p>

      <div className="recording-actions">
        {!isRecording ? (
          <button type="button" className="btn btn-primary" onClick={onStart} disabled={disabled}>
            Start Recording
          </button>
        ) : (
          <button type="button" className="btn btn-warning" onClick={onStop}>
            Stop Recording
          </button>
        )}

        <button type="button" className="btn btn-outline" onClick={onClear} disabled={isRecording || !audioUrl}>
          Clear
        </button>
      </div>

      {audioUrl ? (
        <div className="audio-preview">
          <p>Playback Preview</p>
          <audio controls src={audioUrl} />
        </div>
      ) : null}

      <button
        type="button"
        className="btn btn-success"
        onClick={onSubmit}
        disabled={!audioUrl || submitting || disabled}
      >
        {submitting ? 'Submitting...' : 'Submit Answer'}
      </button>
    </div>
  );
}

export default RecordingControls;
