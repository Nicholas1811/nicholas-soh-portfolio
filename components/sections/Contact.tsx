"use client";

import { motion } from "motion/react";
import { contact } from "@/lib/data";
import SectionHeading from "@/components/ui/SectionHeading";
import LightsCord from "@/components/eggs/LightsCord";

const links = [
  { label: "github", value: `@${contact.githubHandle}`, href: contact.github },
  { label: "linkedin", value: "nicholas soh", href: contact.linkedin },
  { label: "email · school", value: contact.emailSchool, href: `mailto:${contact.emailSchool}` },
  { label: "email · personal", value: contact.emailPersonal, href: `mailto:${contact.emailPersonal}` },
];

export default function Contact() {
  return (
    <section id="contact" className="relative mx-auto max-w-6xl px-6 pb-16 pt-28 md:px-14 md:pt-40">
      <SectionHeading index="06" label="contact" title="Say hi." />

      <motion.a
        data-interactive
        href={`mailto:${contact.emailPersonal}?subject=hi%20nicholas`}
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        whileHover={{ x: 12 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="font-display group block text-[9vw] font-medium italic leading-none text-accent md:text-7xl"
      >
        write me a letter
        <span className="ml-4 inline-block transition-transform group-hover:translate-x-3 group-hover:-translate-y-2">
          ↗
        </span>
      </motion.a>

      <div className="mt-16 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        {links.map((link, i) => (
          <motion.a
            key={link.label}
            data-interactive
            href={link.href}
            target={link.href.startsWith("mailto") ? undefined : "_blank"}
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="group border-t hairline pt-4"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] opacity-50">
              {link.label}
            </p>
            <p className="scribble-underline mt-2 inline-block break-all text-sm md:text-base">
              {link.value}
            </p>
          </motion.a>
        ))}
      </div>

      <footer className="mt-28 flex items-end justify-between border-t hairline pt-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] opacity-50">
          © {new Date().getFullYear()} nicholas soh · built by hand, thrown around on purpose
        </p>
        <LightsCord />
      </footer>
    </section>
  );
}
