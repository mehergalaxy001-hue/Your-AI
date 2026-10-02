import { memo } from "react";

function WelcomeImpl() {
  return (
    <div className="welcome">
      <h1>How can I help you today?</h1>
    </div>
  );
}

export const Welcome = memo(WelcomeImpl);
