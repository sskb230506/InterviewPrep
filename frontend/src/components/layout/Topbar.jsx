import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="topbar">
      <div>
        <p className="topbar-kicker">AI Interview Preparation Platform</p>
        <h3>Welcome back, {user?.name || 'Candidate'}</h3>
      </div>
      <button type="button" className="btn btn-outline" onClick={handleLogout}>
        Logout
      </button>
    </header>
  );
}

export default Topbar;
