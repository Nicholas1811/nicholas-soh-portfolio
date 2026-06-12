import IntroSequence from "@/components/intro/IntroSequence";
import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import Experience from "@/components/sections/Experience";
import Projects from "@/components/sections/Projects";
import TechPlayground from "@/components/sections/TechPlayground";
import MazeDetour from "@/components/sections/MazeDetour";
import Contact from "@/components/sections/Contact";
import Eggs from "@/components/eggs/Eggs";

export default function Home() {
  return (
    <main>
      <IntroSequence />
      <Hero />
      <About />
      <Experience />
      <Projects />
      <TechPlayground />
      <MazeDetour />
      <Contact />
      <Eggs />
    </main>
  );
}
