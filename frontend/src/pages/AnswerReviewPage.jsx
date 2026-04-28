import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Badge from '../components/common/Badge';
import ErrorState from '../components/common/ErrorState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PageHeader from '../components/common/PageHeader';
import ScoreBadge from '../components/feedback/ScoreBadge';
import { fetchInterviewReview } from '../services/interviewService';

function AnswerReviewPage() {
  const { sessionId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const loadReview = async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }

    try {
      const response = await fetchInterviewReview(sessionId);
      setData(response);
    } catch (err) {
      if (!silent) {
        setError(err.message || 'Failed to load review');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadReview();
  }, [sessionId]);

  useEffect(() => {
    if (!data?.status || data.status === 'completed') {
      return undefined;
    }

    const timeout = setTimeout(() => {
      loadReview({ silent: true });
    }, 2000);

    return () => clearTimeout(timeout);
  }, [data?.status, data?.pendingEvaluations, sessionId]);

  if (loading) {
    return <LoadingSpinner label="Loading detailed review..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadReview} />;
  }

  if (!data?.perQuestion?.length) {
    return <ErrorState message="No answer review data available." />;
  }

  const isProcessing = data.status && data.status !== 'completed';

  return (
    <div className="stack-lg">
      <PageHeader
        title="Detailed Answer Review"
        subtitle="Question-wise transcript, AI feedback, and upgraded model answers"
      />

      {isProcessing ? (
        <section className="panel stack-sm">
          <h3>Some answers are still being evaluated</h3>
          <p>
            {data.pendingEvaluations || 0} answer{data.pendingEvaluations === 1 ? '' : 's'} are
            still queued or processing. This page refreshes automatically.
          </p>
        </section>
      ) : null}

      {data.perQuestion.map((item, index) => {
        const open = expandedId === item.id;
        return (
          <article key={item.id} className="panel stack-sm">
            <button
              type="button"
              className="accordion-toggle"
              onClick={() => setExpandedId(open ? null : item.id)}
            >
              <span>
                Q{index + 1}. {item.question}
              </span>
              <span>{open ? 'Hide' : 'Expand'}</span>
            </button>

            {open ? (
              <div className="stack-md">
                <section>
                  <h4>Your Transcript</h4>
                  <p>{item.transcript}</p>
                </section>

                <section>
                  <h4>AI Feedback</h4>
                  <ul>
                    {item.feedback.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h4>Suggested Better Answer</h4>
                  <p>{item.betterAnswer}</p>
                </section>

                <section className="inline-row wrap">
                  <ScoreBadge label="Technical" value={item.scores.technical} />
                  <ScoreBadge label="Clarity" value={item.scores.clarity} />
                  <ScoreBadge label="Confidence" value={item.scores.confidence} />
                </section>

                <section className="inline-row wrap">
                  {item.keywords.map((keyword) => (
                    <Badge key={keyword} tone="info">
                      {keyword}
                    </Badge>
                  ))}
                </section>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

export default AnswerReviewPage;
