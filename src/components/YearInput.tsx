import { useRef, useState, useEffect } from "react";

interface Props {
  onSubmit: (signedYear: number) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * Year entry: a numeric field plus a small tappable AD/BC toggle. AD is the
 * default. Typing a minus sign jumps straight to BC (and "+" back to AD).
 */
export default function YearInput({ onSubmit, disabled, autoFocus = true }: Props) {
  const [digits, setDigits] = useState("");
  const [era, setEra] = useState<"AD" | "BC">("AD");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const submit = () => {
    if (disabled) return;
    const n = parseInt(digits, 10);
    if (!Number.isFinite(n) || n <= 0) return;
    onSubmit(era === "BC" ? -n : n);
  };

  const handleChange = (raw: string) => {
    if (raw.includes("-")) setEra("BC");
    if (raw.includes("+")) setEra("AD");
    const cleaned = raw.replace(/[^0-9]/g, "").slice(0, 4);
    setDigits(cleaned);
  };

  const valid = digits.length > 0 && parseInt(digits, 10) > 0;

  return (
    <form
      className="year-input"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="year-field">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          className="year-number"
          placeholder="Year"
          value={digits}
          disabled={disabled}
          aria-label="Year"
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "-") setEra("BC");
            else if (e.key === "+") setEra("AD");
          }}
        />
        <button
          type="button"
          className="era-toggle"
          disabled={disabled}
          onClick={() => setEra((x) => (x === "AD" ? "BC" : "AD"))}
          aria-label={`Era: ${era}. Tap to switch.`}
          title="Tap to switch AD / BC (or type a minus sign)"
        >
          {era}
        </button>
      </div>
      <button type="submit" className="btn-primary guess-btn" disabled={disabled || !valid}>
        Guess
      </button>
    </form>
  );
}
