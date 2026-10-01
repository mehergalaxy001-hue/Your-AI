import { Logo } from "./Icons";

const EXAMPLES = [
  { title: "Explain a concept", prompt: "Explain how HTTPS keeps my data safe, in simple terms." },
  { title: "Write some code", prompt: "Write a TypeScript function that debounces another function, with a short usage example." },
  { title: "Plan something", prompt: "Plan a productive 3-day study schedule for learning SQL basics." },
  { title: "Improve writing", prompt: "Rewrite this to sound more professional: \"hey, can u send the report asap?\"" },
];

export function Welcome({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="welcome">
      <Logo size={52} />
      <h1>How can I help you today?</h1>
      <p className="muted">Ask anything — Your-AI streams answers in real time.</p>
      <div className="examples">
        {EXAMPLES.map((e) => (
          <button key={e.title} className="example" onClick={() => onPick(e.prompt)}>
            <strong>{e.title}</strong>
            <span>{e.prompt}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
