import Badge from '../common/Badge';

function QuestionPanel({ question, index }) {
  if (!question) {
    return (
      <div className="panel">
        <p>Waiting for the next question...</p>
      </div>
    );
  }

  return (
    <div className="panel question-panel">
      <div className="question-head">
        <Badge tone="neutral">Question {index + 1}</Badge>
        <Badge tone="info">{question.type}</Badge>
      </div>
      <h3>{question.text}</h3>
    </div>
  );
}

export default QuestionPanel;
