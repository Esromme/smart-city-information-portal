import Icon from './Icon.jsx';

export default function EmptyState({ icon = 'spark', title, description, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name={icon} size={26} />
      </span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {actionLabel && onAction && (
        <button type="button" className="btn primary" onClick={onAction}>
          <Icon name="plus" size={18} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
