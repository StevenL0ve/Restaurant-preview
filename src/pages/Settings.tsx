import { useStore } from "../state/store";
import { useAuth } from "../state/auth";
import { buildPalate } from "../lib/taste";
import { COLOR_META } from "../lib/wine";

export function Settings() {
  const { state, exportAll, resetDemo, clearAll } = useStore();
  const { user, signOut } = useAuth();
  const palate = buildPalate(state.wines);

  return (
    <div className="page settings-page">
      <section className="card">
        <h3>Signed in as</h3>
        <p className="kv"><span>{user?.name}</span><span className="muted">{user?.email}</span></p>
        <button className="btn" onClick={signOut}>Sign out</button>
      </section>

      <section className="card">
        <h3>Your palate</h3>
        {palate.confidence === 0 ? (
          <p className="muted">Rate a few wines and I'll learn what you like.</p>
        ) : (
          <>
            <p className="muted">Learned from your rack and ratings.</p>
            {palate.topColors.length > 0 && (
              <p className="kv"><span>Favourite styles</span>
                <span>{palate.topColors.slice(0, 3).map((c) => COLOR_META[c].label).join(", ")}</span>
              </p>
            )}
            {palate.topTags.length > 0 && (
              <div className="chip-row wrap">
                {palate.topTags.slice(0, 6).map((t) => (
                  <span key={t} className="chip sm static">{t}</span>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <section className="card">
        <h3>Your data</h3>
        <p className="muted">Your cellar is yours. Export it as JSON any time.</p>
        <div className="btn-stack">
          <button className="btn" onClick={exportAll}>Export my cellar (JSON)</button>
          <button className="btn" onClick={resetDemo}>Reset to demo cellar</button>
          <button className="btn btn-ghost" onClick={() => { if (confirm("Empty your entire cellar?")) clearAll(); }}>
            Clear everything
          </button>
        </div>
      </section>

      <p className="version">My Cellar — preview build</p>
    </div>
  );
}
