"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ProfileCard from "./ProfileCard";
import MatchOverlay from "./MatchOverlay";
import { fetchFeed, postSwipe } from "@/lib/client-api";

const DISTANCE_THRESHOLD = 110; // px of horizontal drag that counts as a swipe
const FLY_MS = 280;

export default function SwipeDeck({ onMatch, onViewMatches }) {
  const [queue, setQueue] = useState(null); // null = first load in progress
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [match, setMatch] = useState(null);
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const [leaving, setLeaving] = useState(null); // "like" | "pass" while the card flies off

  const busy = useRef(false); // true while a card is animating off
  const pending = useRef(new Set()); // swipe requests still in flight
  const seen = useRef(new Set()); // ids swiped this session, so a refetch can never resurface them
  const start = useRef(null);

  const loadFeed = useCallback(async () => {
    setError(null);
    try {
      await Promise.allSettled([...pending.current]); // let in-flight swipes land first
      const profiles = await fetchFeed();
      setQueue(profiles.filter((p) => !seen.current.has(p.id)));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const showToast = (text) => {
    setToast(text);
    setTimeout(() => setToast(null), 2600);
  };

  const commit = useCallback(
    (action) => {
      if (busy.current || !queue || queue.length === 0 || match) return;
      busy.current = true;
      const profile = queue[0];
      seen.current.add(profile.id);
      setLeaving(action);

      const request = postSwipe(profile.id, action);
      pending.current.add(request);

      const wasLast = queue.length === 1;
      setTimeout(() => {
        setLeaving(null);
        if (wasLast) {
          // Local queue is used up. Ask the server whether there is more
          // before showing the empty state, so we never show it falsely.
          setQueue(null);
          loadFeed();
        } else {
          setQueue((q) => q.slice(1));
        }
        setDrag({ x: 0, y: 0, active: false });
        busy.current = false;
      }, FLY_MS);

      request
        .then((res) => {
          if (res.matched) {
            setMatch(res.match);
            onMatch?.();
          }
        })
        .catch((e) => {
          // The server did not record it, so put the card back and say so.
          seen.current.delete(profile.id);
          setQueue((q) => [profile, ...(q ?? [])]);
          showToast(`Could not save that swipe: ${e.message}`);
        })
        .finally(() => pending.current.delete(request));
    },
    [queue, match, onMatch, loadFeed]
  );

  // Keyboard support: arrow keys mirror the buttons.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") commit("like");
      if (e.key === "ArrowLeft") commit("pass");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commit]);

  const onPointerDown = (e) => {
    if (busy.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY };
    setDrag({ x: 0, y: 0, active: true });
  };
  const onPointerMove = (e) => {
    if (!start.current) return;
    setDrag({ x: e.clientX - start.current.x, y: (e.clientY - start.current.y) * 0.3, active: true });
  };
  const onPointerUp = () => {
    if (!start.current) return;
    start.current = null;
    if (drag.x > DISTANCE_THRESHOLD) commit("like");
    else if (drag.x < -DISTANCE_THRESHOLD) commit("pass");
    else setDrag({ x: 0, y: 0, active: false });
  };

  let content;
  if (error) {
    content = (
      <div className="empty">
        <h2>Could not load profiles</h2>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={loadFeed}>
          Try again
        </button>
      </div>
    );
  } else if (queue === null) {
    content = <p className="note">Loading profiles…</p>;
  } else if (queue.length === 0) {
    content = (
      <div className="empty">
        <div className="empty-emoji" aria-hidden="true">✨</div>
        <h2>You are all caught up</h2>
        <p>There is nobody left to show right now. Check back later, or see who you have matched with.</p>
        <button className="btn btn-primary" onClick={onViewMatches}>
          View matches
        </button>
      </div>
    );
  } else {
    // The top card follows the finger, or flies off in the chosen direction.
    const fly = leaving === "like" ? 1 : leaving === "pass" ? -1 : 0;
    const x = fly ? fly * 520 : drag.x;
    const rotate = x / 18;
    const likeOpacity = fly ? (fly > 0 ? 1 : 0) : Math.min(Math.max(drag.x / DISTANCE_THRESHOLD, 0), 1);
    const passOpacity = fly ? (fly < 0 ? 1 : 0) : Math.min(Math.max(-drag.x / DISTANCE_THRESHOLD, 0), 1);

    content = (
    <>
      <div className="deck">
        {queue[1] ? (
          <article className="card card-behind" key={queue[1].id} aria-hidden="true">
            <ProfileCard profile={queue[1]} />
          </article>
        ) : null}

        <article
          key={queue[0].id}
          className={`card card-top ${drag.active ? "dragging" : ""}`}
          style={{ transform: `translate(${x}px, ${drag.y}px) rotate(${rotate}deg)` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-label={`${queue[0].name}, ${queue[0].age}`}
        >
          <ProfileCard profile={queue[0]} />
          <span className="stamp stamp-like" style={{ opacity: likeOpacity }}>LIKE</span>
          <span className="stamp stamp-pass" style={{ opacity: passOpacity }}>PASS</span>
        </article>
      </div>

      <div className="actions">
        <button className="round round-pass" onClick={() => commit("pass")} aria-label={`Pass on ${queue[0].name}`}>
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
        </button>
        <button className="round round-like" onClick={() => commit("like")} aria-label={`Like ${queue[0].name}`}>
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
            <path
              d="M12 20.5C6 16.5 3 13.2 3 9.6 3 7 5 5 7.4 5c1.8 0 3.5 1 4.6 2.8C13.1 6 14.8 5 16.6 5 19 5 21 7 21 9.6c0 3.6-3 6.9-9 10.9z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
      <p className="hint">Drag the card or use the buttons. Arrow keys work too.</p>
    </>
    );
  }

  return (
    <div className="deck-wrap">
      {content}
      {toast ? <div className="toast" role="status">{toast}</div> : null}
      {match ? (
        <MatchOverlay
          profile={match}
          onKeepSwiping={() => setMatch(null)}
          onViewMatches={() => {
            setMatch(null);
            onViewMatches();
          }}
        />
      ) : null}
    </div>
  );
}
