"use client";

import { useCallback, useEffect, useState } from "react";
import SwipeDeck from "./SwipeDeck";
import MatchesList from "./MatchesList";
import { fetchMatches } from "@/lib/client-api";

export default function Discover() {
  const [view, setView] = useState("swipe");
  const [matchCount, setMatchCount] = useState(0);

  const refreshMatchCount = useCallback(() => {
    fetchMatches()
      .then((list) => setMatchCount(list.length))
      .catch(() => {}); // the badge is cosmetic; the list view reports its own errors
  }, []);

  useEffect(refreshMatchCount, [refreshMatchCount]);

  return (
    <div className="discover">
      <div className="segmented" role="tablist" aria-label="Discover views">
        <button
          role="tab"
          aria-selected={view === "swipe"}
          className={view === "swipe" ? "seg seg-on" : "seg"}
          onClick={() => setView("swipe")}
        >
          Swipe
        </button>
        <button
          role="tab"
          aria-selected={view === "matches"}
          className={view === "matches" ? "seg seg-on" : "seg"}
          onClick={() => setView("matches")}
        >
          Matches
          {matchCount > 0 ? <span className="badge">{matchCount}</span> : null}
        </button>
      </div>

      {view === "swipe" ? (
        <SwipeDeck onMatch={refreshMatchCount} onViewMatches={() => setView("matches")} />
      ) : (
        <MatchesList onLoaded={(list) => setMatchCount(list.length)} />
      )}
    </div>
  );
}
