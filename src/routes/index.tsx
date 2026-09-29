import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { Composer } from "../components/Composer";
import { Theater } from "../components/Theater";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "A Little Chance Music — for Bob Pisani" },
      { name: "description", content: "A musical dice-game gift for Bob Pisani, presented by Span." },
      { property: "og:title", content: "A Little Chance Music — for Bob Pisani" },
      { property: "og:description", content: "Chance chooses. You compose. A private musical gift presented by Span." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});
function Index() {
  const [intro, setIntro] = useState(true);
  const close = useCallback(() => {
    setIntro(false);
    requestAnimationFrame(() => document.getElementById("composer")?.focus());
  }, []);
  return (
    <>
      <div inert={intro} aria-hidden={intro}>
        <Composer onReplay={() => setIntro(true)} />
      </div>
      <Theater open={intro} onClose={close} />
    </>
  );
}
