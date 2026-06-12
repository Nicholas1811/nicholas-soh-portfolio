"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { contact, projects, skills } from "@/lib/data";

type Line = { text: string; kind: "input" | "output" | "accent" };

const COFFEE = String.raw`
      ( (
       ) )
    ........
    |      |]
    \      /
     '----'
  brewing... done. back to shipping.`;

const HELP = `available commands:
  whoami        who is this guy
  stack         what he builds with
  projects      what he has shipped
  coffee        essential infrastructure
  clear         wipe the slate
  exit          close terminal (~ also works)`;

function run(cmd: string): Line[] {
  const c = cmd.trim().toLowerCase();
  switch (c) {
    case "":
      return [];
    case "help":
      return [{ text: HELP, kind: "output" }];
    case "whoami":
      return [
        {
          text: "nicholas soh — software engineering @ SMU (Y2), SWE intern @ tan tock seng hospital, ex-paypal MLE intern. likes microservices, message queues, and teaching people things.",
          kind: "output",
        },
      ];
    case "stack":
      return [{ text: skills.join(" · "), kind: "output" }];
    case "projects":
      return [
        {
          text: projects.map((p) => `${p.title.padEnd(30)} ${p.link}`).join("\n"),
          kind: "output",
        },
      ];
    case "coffee":
      return [{ text: COFFEE, kind: "accent" }];
    case "sudo hire-me":
    case "sudo hire me":
      return [
        {
          text: `[sudo] password for recruiter: ********\npermission granted.\n→ ${contact.emailPersonal}\n→ ${contact.github}`,
          kind: "accent",
        },
      ];
    case "ls":
      return [{ text: "about/  experience/  projects/  stack/  contact/  .secrets", kind: "output" }];
    case "cat .secrets":
      return [{ text: "nice try. the konami code is older than you think.", kind: "accent" }];
    default:
      return [
        {
          text: `command not found: ${c} — try "help" (or "sudo hire-me")`,
          kind: "output",
        },
      ];
  }
}

export default function Terminal() {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([
    { text: 'nick@portfolio — type "help" to look around', kind: "accent" },
  ]);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      if (e.key === "`" || e.key === "~") {
        if (typing && !open) return;
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  const submit = useCallback(() => {
    const cmd = input;
    setInput("");
    if (cmd.trim().toLowerCase() === "clear") {
      setLines([]);
      return;
    }
    if (cmd.trim().toLowerCase() === "exit") {
      setOpen(false);
      return;
    }
    setLines((prev) => [...prev, { text: `$ ${cmd}`, kind: "input" }, ...run(cmd)]);
  }, [input]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: "-100%" }}
          animate={{ y: 0 }}
          exit={{ y: "-100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 32 }}
          className="fixed inset-x-0 top-0 z-[95] mx-auto max-w-3xl px-4 pt-4"
          onClick={() => inputRef.current?.focus()}
        >
          <div
            className="overflow-hidden border-2 border-ink bg-ink text-paper shadow-[6px_10px_0_rgba(24,22,17,0.3)]"
            style={{ borderRadius: "4px 18px 5px 14px" }}
          >
            <div className="flex items-center justify-between border-b border-paper/20 px-4 py-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] opacity-60">
                nick@portfolio:~
              </p>
              <button
                data-interactive
                onClick={() => setOpen(false)}
                className="font-mono text-[11px] uppercase tracking-[0.2em] opacity-60 hover:opacity-100"
              >
                esc ✕
              </button>
            </div>
            <div ref={scrollRef} className="max-h-[50vh] overflow-y-auto px-4 py-3">
              {lines.map((line, i) => (
                <pre
                  key={i}
                  className={`font-mono whitespace-pre-wrap text-[13px] leading-relaxed ${
                    line.kind === "accent"
                      ? "text-[#ff6a2b]"
                      : line.kind === "input"
                        ? "opacity-60"
                        : ""
                  }`}
                >
                  {line.text}
                </pre>
              ))}
              <div className="flex items-center gap-2">
                <span className="font-mono text-[13px] text-[#ff6a2b]">$</span>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  spellCheck={false}
                  autoComplete="off"
                  aria-label="Terminal input"
                  className="font-mono w-full bg-transparent text-[13px] text-paper outline-none placeholder:opacity-30"
                  placeholder="help"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
