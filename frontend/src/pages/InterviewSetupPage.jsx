import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import { useAuth } from '../context/AuthContext';
import { createInterviewSession } from '../services/interviewService';
import {
  DIFFICULTY_OPTIONS,
  INTERVIEW_TYPE_OPTIONS,
  ROLE_OPTIONS,
  STORAGE_KEYS,
} from '../utils/constants';

function InterviewSetupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState({
    role: localStorage.getItem(STORAGE_KEYS.defaultRole) || user?.defaultRole || ROLE_OPTIONS[0],
    difficulty: DIFFICULTY_OPTIONS[1],
    interviewType: INTERVIEW_TYPE_OPTIONS[2],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSelect = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      localStorage.setItem(STORAGE_KEYS.defaultRole, form.role);
      const data = await createInterviewSession(form);
      navigate(`/interview/session/${data.sessionId}`, { state: { config: form } });
    } catch (err) {
      setError(err.message || 'Could not start interview');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stack-lg">
      <PageHeader
        title="Interview Setup"
        subtitle="Configure role, difficulty, and interview style before starting"
      />

      <form className="panel stack-md" onSubmit={handleSubmit}>
        <label>
          Select Role
          <select name="role" value={form.role} onChange={handleSelect}>
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>

        <label>
          Difficulty Level
          <select name="difficulty" value={form.difficulty} onChange={handleSelect}>
            {DIFFICULTY_OPTIONS.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {difficulty}
              </option>
            ))}
          </select>
        </label>

        <label>
          Interview Type
          <select name="interviewType" value={form.interviewType} onChange={handleSelect}>
            {INTERVIEW_TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Initializing...' : 'Start Interview'}
        </button>
      </form>
    </div>
  );
}

export default InterviewSetupPage;
