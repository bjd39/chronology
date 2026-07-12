/** The row of coloured squares mirroring the shareable emoji. */
export default function ScoreDots({ scores }: { scores: number[] }) {
  return (
    <div className="score-dots" aria-hidden="true">
      {scores.map((s, i) => (
        <span key={i} className={`dot dot-${bucket(s)}`} title={String(s)} />
      ))}
    </div>
  );
}

function bucket(score: number): string {
  if (score >= 90) return "green";
  if (score >= 70) return "yellow";
  if (score >= 45) return "orange";
  if (score >= 20) return "red";
  return "black";
}
