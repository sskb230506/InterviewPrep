import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ErrorState from '../components/common/ErrorState';
import PageHeader from '../components/common/PageHeader';
import { useAuth } from '../context/AuthContext';
import { uploadResume } from '../services/resumeService';
import { changePassword, deleteAccount, updateProfile } from '../services/settingsService';
import { ROLE_OPTIONS, STORAGE_KEYS } from '../utils/constants';

function SettingsPage() {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [defaultRole, setDefaultRole] = useState(
    localStorage.getItem(STORAGE_KEYS.defaultRole) || user?.defaultRole || ROLE_OPTIONS[0],
  );
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const resetMessage = () => {
    setMessage('');
    setError('');
  };

  const handleProfileUpdate = async (event) => {
    event.preventDefault();
    resetMessage();

    if (!name.trim()) {
      setError('Name cannot be empty.');
      return;
    }

    setProfileLoading(true);
    try {
      const payload = { name: name.trim(), defaultRole };
      await updateProfile(payload);
      updateUser({ ...user, ...payload });
      localStorage.setItem(STORAGE_KEYS.defaultRole, defaultRole);
      setMessage('Profile updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordUpdate = async (event) => {
    event.preventDefault();
    resetMessage();

    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setError('Both current and new password are required.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    setPasswordLoading(true);
    try {
      await changePassword(passwordForm);
      setPasswordForm({ currentPassword: '', newPassword: '' });
      setMessage('Password changed successfully.');
    } catch (err) {
      setError(err.message || 'Could not change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleResumeUpload = async (event) => {
    event.preventDefault();
    resetMessage();

    if (!resumeFile) {
      setError('Select a resume file first.');
      return;
    }

    setResumeLoading(true);
    try {
      await uploadResume(resumeFile);
      setMessage('Resume uploaded successfully.');
      setResumeFile(null);
    } catch (err) {
      setError(err.message || 'Resume upload failed');
    } finally {
      setResumeLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm('Delete account permanently? This action cannot be undone.');
    if (!confirmDelete) return;

    resetMessage();
    try {
      await deleteAccount();
      logout();
      navigate('/signup', { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to delete account');
    }
  };

  return (
    <div className="stack-lg">
      <PageHeader
        title="Profile Settings"
        subtitle="Update profile details, password, resume, and account preferences"
      />

      {error ? <ErrorState message={error} /> : null}
      {message ? <p className="form-success panel">{message}</p> : null}

      <form className="panel stack-md" onSubmit={handleProfileUpdate}>
        <h3>Profile</h3>
        <label>
          Name
          <input type="text" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          Default Role
          <select value={defaultRole} onChange={(event) => setDefaultRole(event.target.value)}>
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-primary" disabled={profileLoading}>
          {profileLoading ? 'Saving...' : 'Save Profile'}
        </button>
      </form>

      <form className="panel stack-md" onSubmit={handlePasswordUpdate}>
        <h3>Change Password</h3>
        <label>
          Current Password
          <input
            type="password"
            value={passwordForm.currentPassword}
            onChange={(event) =>
              setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
            }
          />
        </label>
        <label>
          New Password
          <input
            type="password"
            value={passwordForm.newPassword}
            onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={passwordLoading}>
          {passwordLoading ? 'Updating...' : 'Change Password'}
        </button>
      </form>

      <form className="panel stack-md" onSubmit={handleResumeUpload}>
        <h3>Upload New Resume</h3>
        <input type="file" accept=".pdf,.doc,.docx" onChange={(event) => setResumeFile(event.target.files?.[0] || null)} />
        <button type="submit" className="btn btn-outline" disabled={resumeLoading}>
          {resumeLoading ? 'Uploading...' : 'Upload Resume'}
        </button>
      </form>

      <section className="panel stack-md">
        <h3>Danger Zone</h3>
        <p className="muted">Permanently delete your account and all interview data.</p>
        <button type="button" className="btn btn-danger" onClick={handleDeleteAccount}>
          Delete Account
        </button>
      </section>
    </div>
  );
}

export default SettingsPage;
