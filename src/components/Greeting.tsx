import { useState } from 'react';

export interface GreetingProps {
  /** Name shown in the greeting headline. */
  name: string;
  /** Optional subtitle rendered under the headline. */
  subtitle?: string;
}

/**
 * A small interactive React island. Astro renders it to static HTML and, with
 * a `client:*` directive, hydrates it in the browser so the counter button
 * works. It exists so the component-scenario isolation path has a real,
 * stateful subject to capture.
 */
export default function Greeting({ name, subtitle }: GreetingProps) {
  const [count, setCount] = useState(0);
  return (
    <section
      style={{
        padding: 'var(--space-lg)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)',
      }}
    >
      <h2 style={{ margin: 0 }}>Hello, {name}!</h2>
      {subtitle ? (
        <p style={{ color: 'var(--color-muted)', marginTop: 'var(--space-sm)' }}>{subtitle}</p>
      ) : null}
      <button
        type="button"
        onClick={() => setCount((c) => c + 1)}
        style={{
          marginTop: 'var(--space-md)',
          padding: 'var(--space-sm) var(--space-md)',
          borderRadius: 'var(--radius)',
          border: 'none',
          background: 'var(--color-accent)',
          color: '#fff',
          cursor: 'pointer',
        }}
      >
        Clicked {count} {count === 1 ? 'time' : 'times'}
      </button>
    </section>
  );
}
