import { memo } from "react";
import { BookIcon, BulbIcon, CodeIcon, Logo, PenIcon } from "../UI/Icons";

const SUGGESTIONS = [
  { icon: PenIcon, title: "Write something", prompt: "Write a short, friendly email inviting my team to a project kickoff meeting next Monday at 10am." },
  { icon: BookIcon, title: "Explain a topic", prompt: "Explain how black holes form, in simple terms, with a quick analogy." },
  { icon: CodeIcon, title: "Help me code", prompt: "Write a TypeScript function that debounces another function, and show a short usage example." },
  { icon: BulbIcon, title: "Brainstorm ideas", prompt: "Brainstorm 10 creative names and taglines for a space-themed coffee shop." },
];

function WelcomeImpl({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="welcome">
      <Logo size={56} />
      <h1>How can I help you today?</h1>
      <p className="muted">Ask anything — answers stream in real time. Pick a suggestion to get started.</p>
      <div className="examples">
        {SUGGESTIONS.map(({ icon: Icon, title, prompt }) => (
          <button key={title} className="example" onClick={() => onPick(prompt)}>
            <span className="example-icon"><Icon width={18} height={18} /></span>
            <strong>{title}</strong>
            <span className="example-text">{prompt}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export const Welcome = memo(WelcomeImpl);
