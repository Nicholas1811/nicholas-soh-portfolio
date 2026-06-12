"use client";

import { useEffect } from "react";
import Terminal from "@/components/eggs/Terminal";
import KonamiGravity from "@/components/eggs/KonamiGravity";
import { printConsoleArt } from "@/components/eggs/consoleArt";

export default function Eggs() {
  useEffect(() => {
    printConsoleArt();
  }, []);

  return (
    <>
      <Terminal />
      <KonamiGravity />
    </>
  );
}
