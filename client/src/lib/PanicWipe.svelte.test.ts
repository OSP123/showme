import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import PanicWipe from './PanicWipe.svelte';

// Mock panicWipe module
vi.mock('./panicWipe', () => ({
  panicWipe: vi.fn(() => Promise.resolve()),
  canPerformPanicWipe: vi.fn(() => true),
}));

// Prevent actual page reload
const reloadMock = vi.fn();
Object.defineProperty(window, 'location', {
  value: { ...window.location, reload: reloadMock },
  writable: true,
});

describe('PanicWipe Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when open is false', () => {
    render(PanicWipe, { props: { open: false } });
    expect(screen.queryByText('Emergency Data Wipe')).not.toBeInTheDocument();
  });

  it('should render when open is true', () => {
    render(PanicWipe, { props: { open: true } });
    expect(screen.getByText('Emergency Data Wipe')).toBeInTheDocument();
  });

  it('should display warning text', () => {
    render(PanicWipe, { props: { open: true } });
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
  });

  it('should have disabled wipe button when confirmation text is not entered', () => {
    render(PanicWipe, { props: { open: true } });
    const wipeBtn = screen.getByText('Delete All Data');
    expect(wipeBtn).toBeDisabled();
  });

  it('should enable wipe button when "DELETE ALL" is typed', async () => {
    render(PanicWipe, { props: { open: true } });

    const input = screen.getByPlaceholderText('DELETE ALL');
    await fireEvent.input(input, { target: { value: 'DELETE ALL' } });

    const wipeBtn = screen.getByText('Delete All Data');
    expect(wipeBtn).not.toBeDisabled();
  });

  it('should keep wipe button disabled with wrong confirmation text', async () => {
    render(PanicWipe, { props: { open: true } });

    const input = screen.getByPlaceholderText('DELETE ALL');
    await fireEvent.input(input, { target: { value: 'DELETE' } });

    const wipeBtn = screen.getByText('Delete All Data');
    expect(wipeBtn).toBeDisabled();
  });

  it('should dispatch cancel event when cancel button is clicked', async () => {
    const cancelHandler = vi.fn();
    const { component } = render(PanicWipe, { props: { open: true } });
    component.$on('cancel', cancelHandler);

    const cancelBtn = screen.getByText('Cancel');
    await fireEvent.click(cancelBtn);

    expect(cancelHandler).toHaveBeenCalledTimes(1);
  });

  it('should dispatch cancel when overlay is clicked', async () => {
    const cancelHandler = vi.fn();
    const { component, container } = render(PanicWipe, { props: { open: true } });
    component.$on('cancel', cancelHandler);

    const overlay = container.querySelector('.panic-overlay')!;
    await fireEvent.click(overlay);

    expect(cancelHandler).toHaveBeenCalledTimes(1);
  });

  it('should call panicWipe and dispatch wiped when confirmed', async () => {
    const { panicWipe: panicWipeFn } = await import('./panicWipe');
    const wipedHandler = vi.fn();
    const { component } = render(PanicWipe, {
      props: { open: true, db: {} },
    });
    component.$on('wiped', wipedHandler);

    const input = screen.getByPlaceholderText('DELETE ALL');
    await fireEvent.input(input, { target: { value: 'DELETE ALL' } });

    const wipeBtn = screen.getByText('Delete All Data');
    await fireEvent.click(wipeBtn);

    // Wait for async panicWipe to resolve
    await vi.waitFor(() => {
      expect(panicWipeFn).toHaveBeenCalledTimes(1);
    });
    expect(wipedHandler).toHaveBeenCalledTimes(1);
  });
});
