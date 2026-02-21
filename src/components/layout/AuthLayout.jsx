import { Link } from 'react-router-dom';

function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-page">
      <section className="auth-hero">
        <p className="auth-kicker">InterviewLab</p>
        <h1>Practice interviews with realtime AI feedback</h1>
        <p>Train role-specific responses, voice confidence, and technical articulation before real interviews.</p>
      </section>

      <section className="auth-card">
        <h2>{title}</h2>
        {subtitle ? <p className="muted">{subtitle}</p> : null}
        {children}
        {footer ? <div className="auth-footer">{footer}</div> : null}
        <Link to="/" className="hidden-home-link" aria-hidden="true" tabIndex={-1}>
          Home
        </Link>
      </section>
    </div>
  );
}

export default AuthLayout;
