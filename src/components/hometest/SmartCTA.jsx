import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { unrufld } from '@/api/unrufldClient';

export default function SmartCTA({ children, className, style, onClick, loggedInTo = '/subscription', loggedOutTo = '/login' }) {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  const handleClick = async (e) => {
    if (onClick) onClick(e);
    setChecking(true);
    try {
      const authed = await unrufld.auth.isAuthenticated();
      navigate(authed ? loggedInTo : loggedOutTo);
    } catch {
      navigate(loggedOutTo);
    } finally {
      setChecking(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={checking}
      className={`${className || ''} ${checking ? 'opacity-60 pointer-events-none' : ''}`}
      style={style}
    >
      {children}
    </button>
  );
}