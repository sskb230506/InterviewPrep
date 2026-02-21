import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PageHeader from '../components/common/PageHeader';
import StatCard from '../components/common/StatCard';
import ScoreTrendChart from '../components/charts/ScoreTrendChart';
import { fetchDashboard } from '../services/dashboardService';

function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchDashboard();
      setData(response);
    } catch (err) {
      setError(err.message || 'Unable to fetch dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return <LoadingSpinner label="Loading dashboard..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadDashboard} />;
  }

  if (!data) {
    return (
      <EmptyState
        title="No dashboard data"
        message="Start a new interview to see your analytics."
        ctaLabel="Start Interview"
        ctaTo="/interview/setup"
      />
    );
  }

  const { profileSummary, sessions, scoreTrend } = data;

  return (
    <div className="stack-lg">
      <PageHeader
        title="Dashboard"
        subtitle="Track your interview progress and identify weak areas"
        actions={
          <Link className="btn btn-primary" to="/interview/setup">
            Start New Interview
          </Link>
        }
      />

      {!profileSummary.resumeUploaded ? (
        <div className="panel warning-panel">
          <p>No resume uploaded yet. Upload your resume for role-aware interview questions.</p>
          <Link className="btn btn-warning" to="/resume">
            Upload Resume
          </Link>
        </div>
      ) : null}

      <section className="stat-grid">
        <StatCard label="Completed Sessions" value={profileSummary.completedInterviews} helper="Total mock interviews" />
        <StatCard label="Average Score" value={`${profileSummary.averageScore}/100`} tone="success" helper="Across all sessions" />
        <StatCard label="Weakest Skill" value={profileSummary.weakestArea} tone="warning" helper="Focus area" />
        <StatCard label="Resume Status" value={profileSummary.resumeUploaded ? 'Uploaded' : 'Missing'} tone={profileSummary.resumeUploaded ? 'success' : 'danger'} />
      </section>

      <ScoreTrendChart data={scoreTrend} />

      <section className="panel">
        <h3>Past Interview Sessions</h3>
        {!sessions.length ? (
          <p>No sessions yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Role</th>
                  <th>Score</th>
                  <th>Confidence</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id}>
                    <td>{session.date}</td>
                    <td>{session.role}</td>
                    <td>{session.score}</td>
                    <td>{session.confidence}</td>
                    <td>
                      <Link to={`/interview/results/${session.id}`}>View Results</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default DashboardPage;
