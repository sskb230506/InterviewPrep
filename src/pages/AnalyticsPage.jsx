import { useEffect, useState } from 'react';
import ErrorState from '../components/common/ErrorState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PageHeader from '../components/common/PageHeader';
import FillerWordChart from '../components/charts/FillerWordChart';
import ScoreTrendChart from '../components/charts/ScoreTrendChart';
import WeakTopicHeatmap from '../components/charts/WeakTopicHeatmap';
import { fetchAnalytics } from '../services/analyticsService';

function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchAnalytics();
      setData(response);
    } catch (err) {
      setError(err.message || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (loading) {
    return <LoadingSpinner label="Loading analytics..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadAnalytics} />;
  }

  if (!data) {
    return <ErrorState message="Analytics not available." />;
  }

  return (
    <div className="stack-lg">
      <PageHeader
        title="Progress Analytics"
        subtitle="Track score trend, confidence trend, weak topics, and filler words"
      />

      <ScoreTrendChart data={data.scoreTrend} />
      <FillerWordChart data={data.scoreTrend} />
      <WeakTopicHeatmap data={data.weakTopicHeatmap} />
    </div>
  );
}

export default AnalyticsPage;
