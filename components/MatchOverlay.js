"use client";

import { useEffect, useRef } from "react";

export default function MatchOverlay({ profile, onKeepSwiping, onViewMatches }) {
  const primary = useRef(null);

  useEffect(() => {
    primary.current?.focus();
    const onKey = (e) => e.key === "Escape" && onKeepSwiping();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKeepSwiping]);

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="match-title">
      <div className="match-card">
        <div className="confetti" aria-hidden="true">
          {Array.from({ length: 14 }, (_, i) => (
            <i key={i} style={{ "--i": i }} />
          ))}
        </div>
        <h2 id="match-title">It&apos;s a match!</h2>
        <img src={profile.photoUrl} alt="" className="match-hero" width="140" height="140" />
        <p>
          You and <strong>{profile.name}</strong> liked each other.
        </p>
        <div className="match-actions">
          <button ref={primary} className="btn btn-primary" onClick={onViewMatches}>
            View matches
          </button>
          <button className="btn btn-ghost" onClick={onKeepSwiping}>
            Keep swiping
          </button>
        </div>
      </div>
    </div>
  );
}
