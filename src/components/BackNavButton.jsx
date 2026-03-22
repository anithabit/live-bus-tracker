import { ArrowLeft } from 'lucide-react';

/**
 * Small top-left back control for sub-views (not main dashboards).
 */
export default function BackNavButton({ onClick, label = 'Go back', style = {} }) {
  return (
    <button
      type="button"
      className="back-nav-btn"
      onClick={onClick}
      aria-label={label}
      title={label}
      style={style}
    >
      <ArrowLeft size={20} strokeWidth={2.5} />
    </button>
  );
}
