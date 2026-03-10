import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import AccessCodeModal from './AccessCodeModal.svelte';

// Mock the api module
vi.mock('./api', () => ({
  lookupAccessCode: vi.fn(),
}));

import { lookupAccessCode } from './api';

describe('AccessCodeModal', () => {
  beforeEach(() => {
    vi.mocked(lookupAccessCode).mockReset();
  });

  it('should not render when open is false', () => {
    render(AccessCodeModal, { open: false });
    expect(screen.queryByText('Enter Access Code')).toBeNull();
  });

  it('should render when open is true', () => {
    render(AccessCodeModal, { open: true });
    expect(screen.getByText('Enter Access Code')).toBeTruthy();
  });

  it('should have an input field with placeholder', () => {
    render(AccessCodeModal, { open: true });
    const input = screen.getByPlaceholderText('e.g. A3X9K2');
    expect(input).toBeTruthy();
  });

  it('should have submit button disabled when input is empty', () => {
    render(AccessCodeModal, { open: true });
    const button = screen.getByText('Access Map');
    expect(button).toHaveAttribute('disabled');
  });

  it('should show error for invalid short code', async () => {
    vi.mocked(lookupAccessCode).mockResolvedValue(null);
    render(AccessCodeModal, { open: true });

    const input = screen.getByPlaceholderText('e.g. A3X9K2');
    await fireEvent.input(input, { target: { value: 'BADCOD' } });

    const button = screen.getByText('Access Map');
    await fireEvent.click(button);

    // Wait for async operation
    await vi.waitFor(() => {
      expect(screen.getByText('Invalid access code. Please check and try again.')).toBeTruthy();
    });
  });

  it('should call lookupAccessCode for short codes', async () => {
    vi.mocked(lookupAccessCode).mockResolvedValue({ id: 'map-123', name: 'Test Map', is_private: true });

    const { component } = render(AccessCodeModal, { open: true });

    let submitEvent: any = null;
    component.$on('submit', (e: any) => { submitEvent = e.detail; });

    const input = screen.getByPlaceholderText('e.g. A3X9K2');
    await fireEvent.input(input, { target: { value: 'A3X9K2' } });

    const button = screen.getByText('Access Map');
    await fireEvent.click(button);

    await vi.waitFor(() => {
      expect(lookupAccessCode).toHaveBeenCalledWith('A3X9K2');
      expect(submitEvent).toEqual({ mapId: 'map-123', token: 'A3X9K2' });
    });
  });

  it('should dispatch cancel on cancel button click', async () => {
    const { component } = render(AccessCodeModal, { open: true });

    let cancelled = false;
    component.$on('cancel', () => { cancelled = true; });

    const cancelBtn = screen.getByText('Cancel');
    await fireEvent.click(cancelBtn);

    expect(cancelled).toBe(true);
  });
});
