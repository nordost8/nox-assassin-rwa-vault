"use client";

import Link from "next/link";
import { Newspaper, ArrowRight } from "lucide-react";
import { NEWS } from "@/data/news";

export default function NewsTicker() {
  const items = NEWS.slice(0, 3);
  return (
    <section className="panel-elevated overflow-hidden">
      <div className="flex items-stretch">
        <div className="flex items-center gap-2 px-4 bg-primary/10 border-r border-primary/30 shrink-0">
          <Newspaper className="w-3.5 h-3.5 text-primary" />
          <span className="terminal-label text-primary whitespace-nowrap">AI News · Live</span>
        </div>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border min-w-0">
          {items.map((n, i) => (
            <Link
              key={i}
              href="/advisor?tab=news"
              className="px-4 py-2.5 group hover:bg-surface-hover transition min-w-0"
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="chip text-primary border-primary/40 bg-primary/5 text-[9px]">{n.tag}</span>
                <span className="terminal-label text-[9px] truncate">{n.source} · {n.time}</span>
              </div>
              <div className="text-[12px] font-display leading-snug text-foreground group-hover:text-primary transition truncate">
                {n.title}
              </div>
            </Link>
          ))}
        </div>
        <Link
          href="/advisor?tab=news"
          className="hidden md:flex items-center gap-1.5 px-4 border-l border-border text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-primary transition shrink-0"
        >
          All news <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </section>
  );
}
