import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import Toast from './Toast.svelte';

describe('Toast Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render with message', () => {
    render(Toast, {
      props: { message: 'Operation successful' },
    });
    expect(screen.getByText('Operation successful')).toBeInTheDocument();
  });

  it('should apply info class by default', () => {
    const { container } = render(Toast, {
      props: { message: 'Info message' },
    });
    expect(container.querySelector('.toast-info')).toBeTruthy();
  });

  it('should apply correct class for each type', () => {
    const types = ['info', 'success', 'warning', 'danger'] as const;
    for (const type of types) {
      const { container, unmount } = render(Toast, {
        props: { message: 'Test', type },
      });
      expect(container.querySelector(`.toast-${type}`)).toBeTruthy();
      unmount();
    }
  });

  it('should be visible initially and have onClose prop', () => {
    const onClose = vi.fn();
    render(Toast, {
      props: { message: 'Visible toast', duration: 3000, onClose },
    });

    // Toast renders immediately
    expect(screen.getByText('Visible toast')).toBeInTheDocument();
    // onClose not called immediately
    expect(onClose).not.toHaveBeenCalled();
  });

  it('should dismiss when clicked', async () => {
    const onClose = vi.fn();
    const { container } = render(Toast, {
      props: { message: 'Click to dismiss', onClose },
    });

    const toast = container.querySelector('.toast')!;
    await fireEvent.click(toast);

    expect(screen.queryByText('Click to dismiss')).not.toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should dismiss when close button is clicked', async () => {
    const onClose = vi.fn();
    const { container } = render(Toast, {
      props: { message: 'Close me', onClose },
    });

    const closeBtn = container.querySelector('.toast-close')!;
    await fireEvent.click(closeBtn);

    expect(screen.queryByText('Close me')).not.toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose callback when dismissed', async () => {
    vi.useRealTimers();
    const onClose = vi.fn();
    const { container } = render(Toast, {
      props: { message: 'With callback', onClose },
    });

    // Dismiss via close button
    const closeBtn = container.querySelector('.toast-close')!;
    await fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
