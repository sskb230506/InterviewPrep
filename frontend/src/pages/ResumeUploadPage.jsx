import { useMemo, useState } from 'react';
import ErrorState from '../components/common/ErrorState';
import PageHeader from '../components/common/PageHeader';
import { ACCEPTED_RESUME_TYPES } from '../utils/constants';
import { updateSkills, uploadResume } from '../services/resumeService';

function ResumeUploadPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsingStatus, setParsingStatus] = useState('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [saveSkillLoading, setSaveSkillLoading] = useState(false);

  const fileLabel = useMemo(() => {
    if (!selectedFile) return 'No file selected';
    return `${selectedFile.name} (${Math.round(selectedFile.size / 1024)} KB)`;
  }, [selectedFile]);

  const validateFile = (file) => {
    if (!file) return 'Please select a file.';
    if (!ACCEPTED_RESUME_TYPES.includes(file.type)) {
      return 'Only PDF or DOCX files are allowed.';
    }
    if (file.size > 10 * 1024 * 1024) {
      return 'File size should be under 10MB.';
    }
    return '';
  };

  const handleFileSelection = (file) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }

    setError('');
    setSelectedFile(file);
    setUploadProgress(0);
    setParsingStatus('idle');
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    handleFileSelection(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please choose a valid resume file.');
      return;
    }

    setLoading(true);
    setParsingStatus('uploading');
    setError('');

    const interval = setInterval(() => {
      setUploadProgress((value) => {
        if (value >= 92) return value;
        return value + 8;
      });
    }, 120);

    try {
      const data = await uploadResume(selectedFile);
      setUploadProgress(100);
      setParsingStatus('parsing');
      await new Promise((resolve) => setTimeout(resolve, 500));
      setParsingStatus('parsed');
      setSkills(data.skills || []);
    } catch (err) {
      setError(err.message || 'Upload failed');
      setParsingStatus('failed');
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    if (skills.includes(trimmed)) {
      setSkillInput('');
      return;
    }
    setSkills((prev) => [...prev, trimmed]);
    setSkillInput('');
  };

  const removeSkill = (skill) => {
    setSkills((prev) => prev.filter((item) => item !== skill));
  };

  const handleSaveSkills = async () => {
    setSaveSkillLoading(true);
    setError('');
    try {
      await updateSkills(skills);
    } catch (err) {
      setError(err.message || 'Failed to save skills');
    } finally {
      setSaveSkillLoading(false);
    }
  };

  return (
    <div className="stack-lg">
      <PageHeader
        title="Resume Upload"
        subtitle="Upload your resume to personalize interview questions"
      />

      <section className="panel stack-md">
        <div
          className="dropzone"
          onDrop={handleDrop}
          onDragOver={(event) => event.preventDefault()}
          role="button"
          tabIndex={0}
        >
          <h3>Drag & Drop Resume</h3>
          <p>Supported formats: PDF, DOCX</p>
          <p className="muted">{fileLabel}</p>
          <label className="btn btn-outline" htmlFor="resume-file">
            Select File
          </label>
          <input
            id="resume-file"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(event) => handleFileSelection(event.target.files?.[0])}
            hidden
          />
        </div>

        <div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
          </div>
          <p className="muted">Upload Progress: {uploadProgress}%</p>
        </div>

        <div className="inline-row">
          <button type="button" className="btn btn-primary" onClick={handleUpload} disabled={!selectedFile || loading}>
            {loading ? 'Uploading...' : 'Upload Resume'}
          </button>
          <span className="status-chip">Status: {parsingStatus}</span>
        </div>

        {error ? <ErrorState message={error} /> : null}
      </section>

      <section className="panel stack-md">
        <h3>Extracted Skills (Editable)</h3>
        <div className="skill-list">
          {skills.map((skill) => (
            <span key={skill} className="skill-chip">
              {skill}
              <button type="button" onClick={() => removeSkill(skill)} aria-label={`Remove ${skill}`}>
                x
              </button>
            </span>
          ))}
          {!skills.length ? <p className="muted">No skills extracted yet.</p> : null}
        </div>

        <div className="inline-row">
          <input
            type="text"
            value={skillInput}
            onChange={(event) => setSkillInput(event.target.value)}
            placeholder="Add skill"
          />
          <button type="button" className="btn btn-outline" onClick={addSkill}>
            Add Skill
          </button>
          <button type="button" className="btn btn-success" onClick={handleSaveSkills} disabled={saveSkillLoading}>
            {saveSkillLoading ? 'Saving...' : 'Save Skills'}
          </button>
        </div>
      </section>
    </div>
  );
}

export default ResumeUploadPage;
