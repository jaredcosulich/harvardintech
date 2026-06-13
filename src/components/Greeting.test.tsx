import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Greeting from './Greeting';

describe('Greeting', () => {
  // The headline must include the provided name so the island renders the
  // prop, not a hardcoded string.
  it('renders the name in the headline', () => {
    render(<Greeting name="Ada" />);
    expect(screen.getByText('Hello, Ada!')).toBeTruthy();
  });

  // The subtitle is optional: when omitted the island must not render an empty
  // paragraph, which is what the "missing optional prop" scenario exercises.
  it('omits the subtitle when no subtitle prop is given', () => {
    const { container } = render(<Greeting name="Ada" />);
    expect(container.querySelector('p')).toBeNull();
  });

  // Clicking the button increments the hydrated counter, proving the island is
  // genuinely interactive and not a static render.
  it('increments the counter on click', () => {
    render(<Greeting name="Ada" />);
    const button = screen.getByRole('button');
    expect(button.textContent).toContain('Clicked 0 times');
    fireEvent.click(button);
    expect(button.textContent).toContain('Clicked 1 time');
  });
});
