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

  const loadResults = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchInterviewResults(sessionId);
      setData(response);
    } catch (err) {
      setError(err.message || 'Unable to fetch results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResults();
  }, [sessionId]);

  const downloadFeedback = () => {
    if (!data) return;
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

  return (
    <div className="stack-lg">
      <PageHeader
        title="Interview Results"
        subtitle="Structured AI evaluation for your latest session"
        actions={
          <div className="inline-row">
            <button type="button" className="btn btn-outline" onClick={downloadFeedback}>
              Download Feedback
            </button>
            <Link className="btn btn-primary" to={`/interview/review/${sessionId}`}>
              Detailed Review
            </Link>
          </div>
        }
      />

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
        <ul>
          {data.improvements.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default InterviewResultsPage;
