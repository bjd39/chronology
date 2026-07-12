import { useState } from "react";
import { shareOrCopy } from "../game/share";

export default function ShareButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "shared" | "failed">("idle");

  const onClick = async () => {
    const result = await shareOrCopy(text);
    setState(result);
    if (result !== "failed") setTimeout(() => setState("idle"), 2000);
  };

  const label =
    state === "copied"
      ? "Copied to clipboard ✓"
      : state === "shared"
        ? "Shared ✓"
        : state === "failed"
          ? "Couldn't copy"
          : "Share result";

  return (
    <button className="btn-primary share-btn" onClick={onClick}>
      {label}
    </button>
  );
}
