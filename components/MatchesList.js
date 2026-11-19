"use client";

import { useEffect, useState } from "react";
import { fetchMatches } from "@/lib/client-api";

export default function MatchesList({ onLoaded }) {
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchMatches()
      .then((list) => {
        if (cancelled) return;
        setMatches(list);
        onLoaded?.(list);
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
    // Load once per mount; onLoaded is only a notification callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <p className="note note-error">{error}</p>;
  if (!matches) return <p className="note">Loading matches…</p>;
  if (matches.length === 0) {
    return (
      <div className="empty">
        <div className="empty-emoji" aria-hidden="true">💌</div>
        <h2>No matches yet</h2>
        <p>When you like someone who likes you back, they will show up here.</p>
      </div>
    );
  }

  return (
    <ul className="matches" aria-label="Your matches">
      {matches.map((m) => (
        <li key={m.id} className="match-row">
          <img src={m.photoUrl} alt="" width="64" height="64" className="match-photo" />
          <div className="match-info">
            <strong>
              {m.name}, {m.age}
            </strong>
            <span>{m.place}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
