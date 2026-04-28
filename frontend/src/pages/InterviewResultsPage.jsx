import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ErrorState from '../components/common/ErrorState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PageHeader from '../components/common/PageHeader';
import FeedbackBlock from '../components/feedback/FeedbackBlock';
import ScoreBadge from '../components/feedback/ScoreBadge';
import { fetchInterviewResults } from '../services/interviewService';

function InterviewResultsPage() {
  const { sessionId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadResults = async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }

    try {
      const response = await fetchInterviewResults(sessionId);
      setData(response);
    } catch (err) {
      if (!silent) {
        setError(err.message || 'Unable to fetch results');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadResults();
  }, [sessionId]);

  useEffect(() => {
    if (!data?.status || data.status === 'completed') {
      return undefined;
    }

    const timeout = setTimeout(() => {
      loadResults({ silent: true });
    }, 2000);

    return () => clearTimeout(timeout);
  }, [data?.status, data?.pendingEvaluations, sessionId]);

  const downloadFeedback = () => {
    if (!data || data.status !== 'completed') return;
    const text = [
      `Interview Session: ${sessionId}`,
      `Overall: ${data.overallScore}`,
      `Confidence: ${data.confidenceScore}`,
      `Technical: ${data.technicalScore}`,
      `Clarity: ${data.clarityScore}`,
      '',
      'Strengths:',
      ...data.strengths.map((item) => `- ${item}`),
      '',
      'Weaknesses:',
      ...data.weaknesses.map((item) => `- ${item}`),
      '',
      'Improvements:',
      ...data.improvements.map((item) => `- ${item}`),
    ].join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `interview-feedback-${sessionId}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <LoadingSpinner label="Preparing your interview report..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadResults} />;
  }

  if (!data) {
    return <ErrorState message="No interview results found." />;
  }

  const isProcessing = data.status && data.status !== 'completed';

  return (
    <div className="stack-lg">
      <PageHeader
        title="Interview Results"
        subtitle="Structured AI evaluation for your latest session"
        actions={
          <div className="inline-row">
            <button
              type="button"
              className="btn btn-outline"
              onClick={downloadFeedback}
              disabled={isProcessing}
            >
              {isProcessing ? 'Waiting for Final Report' : 'Download Feedback'}
            </button>
            <Link className="btn btn-primary" to={`/interview/review/${sessionId}`}>
              Detailed Review
            </Link>
          </div>
        }
      />

      {isProcessing ? (
        <section className="panel stack-sm">
          <h3>Background evaluation in progress</h3>
          <p>
            {data.pendingEvaluations || 0} answer{data.pendingEvaluations === 1 ? '' : 's'} still
            being scored. This page refreshes automatically.
          </p>
        </section>
      ) : null}

      <section className="score-grid">
        <ScoreBadge label="Overall" value={data.overallScore} />
        <ScoreBadge label="Confidence" value={data.confidenceScore} />
        <ScoreBadge label="Technical" value={data.technicalScore} />
        <ScoreBadge label="Clarity" value={data.clarityScore} />
      </section>

      <section className="panel feedback-grid">
        <FeedbackBlock title="Strengths" points={data.strengths} keywords={['Strong', 'Impact', 'Clarity']} />
        <FeedbackBlock title="Weaknesses" points={data.weaknesses} keywords={['Filler words', 'Pacing', 'Closure']} />
      </section>

      <section className="panel">
        <h3>Improvement Suggestions</h3>
        {data.improvements.length ? (
          <ul>
            {data.improvements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p>Recommendations will appear here once all answer evaluations are complete.</p>
        )}
      </section>
    </div>
  );
}

export default InterviewResultsPage;
