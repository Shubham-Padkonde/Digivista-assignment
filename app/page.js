"use client";

import { useState } from "react";
import TabBar from "@/components/TabBar";
import Discover from "@/components/Discover";

export default function Page() {
  const [tab, setTab] = useState("discover");

  return (
    <div className="shell">
      <main className="shell-main">
        {tab === "home" ? <section aria-label="Home" className="home-placeholder" /> : <Discover />}
      </main>
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}
