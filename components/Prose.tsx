// Renders the two inline-markdown constructs the vault's own prose actually
// uses — **bold** and `code` — as real <strong>/<code>, instead of showing the
// literal asterisks and backticks. Confirmed against real project files: goals,
// current-phase notes, and hard-deadline text all contain genuine emphasis
// ("**budgeting + forecasting**", "`roadmap.md`"), so stripping it (as NowTicker's
// marquee does, correctly, for its own single-line moving text) would erase
// meaning the owner put there on purpose. This is the opposite move — the vault's
// own formatting IS the product's material, so it renders as what it is.
//
// Deliberately narrow: no links, lists, or headings — those don't appear in the
// short fields this reads (a goal paragraph, a phase note, a deadline caption).
// A stray unmatched `*` or backtick is left as plain text rather than guessed at.

const TOKEN = /(\*\*[^*]+\*\*|`[^`]+`)/g;

export function Prose({ text }: { text: string }) {
  const parts = text.split(TOKEN).filter((s) => s !== "");
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return <code key={i}>{part.slice(1, -1)}</code>;
        }
        return part;
      })}
    </>
  );
}
