export function Loader() {
  return <div className="loader">Загрузка...</div>;
}

export function ErrorBox({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="error">
      {message} {onRetry && <button className="link" onClick={onRetry}>Повторить</button>}
    </div>
  );
}

export function State({ loading, error, onRetry, children }) {
  if (loading) return <Loader />;
  if (error) return <ErrorBox message={error} onRetry={onRetry} />;
  return children;
}


export function Field({ label, error, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} className={error ? 'invalid' : ''} />
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}
