"use client";

import { useState, useRef, useEffect, useMemo, useCallback, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, Check, UserX, Crown } from "lucide-react";

type Person = { id: string; name: string; role?: string };

interface Props {
  leadId?: string;
  currentAssignment?: { id: string; name: string } | null | undefined;
  salespersons: Person[];
  onSelect: (leadId: string, personId: string) => void;
  bulkMode?: boolean;
}

const MENU_WIDTH = 224; // w-56
const MENU_MAX_HEIGHT = 320; // rough cap incl. search bar, keep in sync with max-h-64 + chrome
const VIEWPORT_MARGIN = 8;

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

// Deterministic muted hue per person so avatars stay distinguishable but calm
function avatarHue(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash % 360;
}

function Avatar({ person, isTL }: { person: Person; isTL: boolean }) {
  const hue = avatarHue(person.id);
  return (
    <span
      className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold ${
        isTL ? "ring-1 ring-[#D4AF37]/60" : ""
      }`}
      style={{
        background: isTL
          ? "linear-gradient(135deg, rgba(212,175,55,0.35), rgba(212,175,55,0.12))"
          : `hsl(${hue} 35% 22%)`,
        color: isTL ? "#D4AF37" : `hsl(${hue} 60% 78%)`,
      }}
    >
      {initials(person.name) || "?"}
      {isTL && (
        <Crown
          size={9}
          className="absolute -right-1 -top-1 fill-[#D4AF37] text-[#D4AF37] drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]"
        />
      )}
    </span>
  );
}

export default function AssignDropdown({ leadId, currentAssignment, salespersons, onSelect, bulkMode }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number; openUp: boolean } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const buttonWrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Guards against a phantom mouseenter firing on whatever row happens to
  // land under the (stationary) cursor when the menu opens — especially
  // when it flips upward and its last row ends up right where the trigger
  // button was. We only trust hover-driven activeIndex changes after a
  // real mouse movement inside the menu.
  const mouseActiveRef = useRef(false);

  const showSearch = salespersons.length > 6;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? salespersons.filter((p) => p.name.toLowerCase().includes(q)) : salespersons;
    const tls = list.filter((p) => p.role === "TEAM_LEAD");
    const sps = list.filter((p) => p.role !== "TEAM_LEAD");
    return { tls, sps, flat: [...tls, ...sps] };
  }, [salespersons, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const commit = useCallback(
    (personId: string) => {
      onSelect(leadId || "bulk", personId);
      close();
    },
    [leadId, onSelect, close],
  );

  // Compute fixed position relative to viewport, flipping up if there isn't
  // enough room below (this is what escapes the table's overflow container).
  const updatePosition = useCallback(() => {
    const trigger = buttonWrapRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < MENU_MAX_HEIGHT && spaceAbove > spaceBelow;

    let left = rect.right - MENU_WIDTH; // right-aligned to trigger, like before
    left = Math.min(Math.max(left, VIEWPORT_MARGIN), window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN);

    const top = openUp ? rect.top - 6 : rect.bottom + 6;

    setCoords({ top, left, openUp });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    mouseActiveRef.current = false;
    updatePosition();
    const onScrollOrResize = () => updatePosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      const insideTrigger = ref.current?.contains(target);
      const insideMenu = menuRef.current?.contains(target);
      if (!insideTrigger && !insideMenu) close();
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, close]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => (showSearch ? searchRef.current : menuRef.current)?.focus());
    }
  }, [open, showSearch]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Scrolling the active row into view should only happen for keyboard
  // navigation. Mouse hover updates activeIndex too (once real movement is
  // detected), but hovering over an already-visible row should never yank
  // the list's scroll position — that's what "scroll on mouse move" means.
  const scrollIndexIntoView = useCallback((idx: number) => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${idx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => {
        const next = Math.min(i + 1, filtered.flat.length - 1);
        scrollIndexIntoView(next);
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => {
        const next = Math.max(i - 1, 0);
        scrollIndexIntoView(next);
        return next;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const person = filtered.flat[activeIndex];
      if (person) commit(person.id);
    }
  }

  let runningIndex = -1;

  return (
    <div ref={ref} className="relative" onKeyDown={handleKeyDown}>
      <div ref={buttonWrapRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={`group flex items-center gap-1.5 rounded-md border border-transparent px-1.5 py-1 text-[11px] transition-all duration-150 hover:border-white/10 hover:bg-white/5 ${
            bulkMode
              ? "text-white/80 border border-white/10 bg-black/30 rounded-lg px-2 py-1 hover:text-white hover:border-white/20"
              : currentAssignment ? "text-white/80" : "text-white/30"
          } ${open ? "border-[#D4AF37]/30 bg-white/5" : ""}`}
        >
          {bulkMode ? (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-[#D4AF37]/30 text-[#D4AF37]/60">
              <UserX size={11} />
            </span>
          ) : currentAssignment ? (
            <Avatar
              person={currentAssignment}
              isTL={salespersons.find((p) => p.id === currentAssignment.id)?.role === "TEAM_LEAD"}
            />
          ) : (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-white/15 text-white/20">
              <UserX size={11} />
            </span>
          )}
          {!bulkMode && <span className="max-w-[80px] truncate">{currentAssignment?.name || "Unassigned"}</span>}
          {bulkMode && <span>Assign to…</span>}
          <ChevronDown
            size={10}
            className={`shrink-0 text-white/30 transition-transform duration-200 group-hover:text-white/50 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {open &&
        coords &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            tabIndex={-1}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: MENU_WIDTH,
              transform: coords.openUp ? "translateY(-100%)" : undefined,
            }}
            className="z-50 origin-top-right animate-[dropdownIn_140ms_ease-out] overflow-hidden rounded-xl border border-white/10 bg-[#111111]/95 shadow-2xl shadow-black/50 backdrop-blur-xl outline-none"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />

            {showSearch && (
              <div className="border-b border-white/5 p-1.5">
                <div className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1.5">
                  <Search size={11} className="shrink-0 text-white/30" />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search team..."
                    className="w-full bg-transparent text-[11px] text-white/80 placeholder:text-white/25 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div
              ref={listRef}
              className="assign-dropdown-scroll max-h-64 overflow-y-auto py-1"
              onMouseMove={() => {
                mouseActiveRef.current = true;
              }}
            >
              <button
                onClick={() => commit("")}
                className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] text-red-400/80 transition-colors hover:bg-red-500/10 hover:text-red-400"
              >
                <UserX size={12} />
                Unassign
              </button>

              {filtered.tls.length > 0 && (
                <Group label="Team Leaders">
                  {filtered.tls.map((p) => {
                    runningIndex++;
                    return (
                      <Row
                        key={p.id}
                        idx={runningIndex}
                        active={runningIndex === activeIndex}
                        selected={currentAssignment?.id === p.id}
                        person={p}
                        isTL
                        onClick={() => commit(p.id)}
                        onHover={() => {
                          if (mouseActiveRef.current) setActiveIndex(runningIndex);
                        }}
                      />
                    );
                  })}
                </Group>
              )}

              {filtered.sps.length > 0 && (
                <Group label="Salespersons">
                  {filtered.sps.map((p) => {
                    runningIndex++;
                    return (
                      <Row
                        key={p.id}
                        idx={runningIndex}
                        active={runningIndex === activeIndex}
                        selected={currentAssignment?.id === p.id}
                        person={p}
                        isTL={false}
                        onClick={() => commit(p.id)}
                        onHover={() => {
                          if (mouseActiveRef.current) setActiveIndex(runningIndex);
                        }}
                      />
                    );
                  })}
                </Group>
              )}

              {filtered.flat.length === 0 && (
                <div className="px-2.5 py-4 text-center text-[11px] text-white/25">No one matches &ldquo;{query}&rdquo;</div>
              )}
            </div>
          </div>,
          document.body,
        )}

      <style jsx>{`
        @keyframes dropdownIn {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(-4px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .assign-dropdown-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(212, 175, 55, 0.35) transparent;
        }

        .assign-dropdown-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .assign-dropdown-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .assign-dropdown-scroll::-webkit-scrollbar-thumb {
          background-color: rgba(212, 175, 55, 0.35);
          border-radius: 999px;
        }

        .assign-dropdown-scroll::-webkit-scrollbar-thumb:hover {
          background-color: rgba(212, 175, 55, 0.55);
        }
      `}</style>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-white/5 pt-1 first:border-t-0 first:pt-0">
      <div className="px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-white/25">{label}</div>
      {children}
    </div>
  );
}

function Row({
  idx,
  active,
  selected,
  person,
  isTL,
  onClick,
  onHover,
}: {
  idx: number;
  active: boolean;
  selected: boolean;
  person: Person;
  isTL: boolean;
  onClick: () => void;
  onHover: () => void;
}) {
  return (
    <button
      data-idx={idx}
      role="option"
      aria-selected={selected}
      onClick={onClick}
      onMouseEnter={onHover}
      className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] transition-colors ${
        active ? "bg-white/[0.07]" : "hover:bg-white/5"
      } ${selected ? "text-[#D4AF37]" : "text-white/70"}`}
    >
      <Avatar person={person} isTL={isTL} />
      <span className="flex-1 truncate">{person.name}</span>
      {selected && <Check size={12} className="shrink-0 text-[#D4AF37]" />}
    </button>
  );
}