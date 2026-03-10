import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import QuickPin from './QuickPin.svelte';

describe('QuickPin Component', () => {
  const defaultProps = { open: true, lat: 48.85, lng: 2.35 };

  it('should not render when open is false', () => {
    render(QuickPin, { props: { open: false, lat: 0, lng: 0 } });
    expect(screen.queryByText('Quick Pin')).not.toBeInTheDocument();
  });

  it('should render when open is true', () => {
    render(QuickPin, { props: defaultProps });
    expect(screen.getByText('Quick Pin')).toBeInTheDocument();
  });

  it('should display all pin type presets except "other"', () => {
    render(QuickPin, { props: defaultProps });
    expect(screen.getByText('Medical')).toBeInTheDocument();
    expect(screen.getByText('Water')).toBeInTheDocument();
    expect(screen.getByText('Checkpoint')).toBeInTheDocument();
    expect(screen.getByText('Shelter')).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Danger')).toBeInTheDocument();
    // "Other" should NOT be in the quick presets
    const buttons = screen.getAllByRole('button');
    const buttonTexts = buttons.map(b => b.textContent);
    expect(buttonTexts.join(' ')).not.toContain('Other');
  });

  it('should dispatch create event with correct type and coordinates when a preset is clicked', async () => {
    const createHandler = vi.fn();
    const { component } = render(QuickPin, { props: defaultProps });
    component.$on('create', createHandler);

    const medicalBtn = screen.getByText('Medical').closest('button')!;
    await fireEvent.click(medicalBtn);

    expect(createHandler).toHaveBeenCalledTimes(1);
    expect(createHandler.mock.calls[0][0].detail).toEqual({
      type: 'medical',
      lat: 48.85,
      lng: 2.35,
    });
  });

  it('should dispatch cancel event when close button is clicked', async () => {
    const cancelHandler = vi.fn();
    const { component } = render(QuickPin, { props: defaultProps });
    component.$on('cancel', cancelHandler);

    const closeBtn = screen.getByLabelText('Close');
    await fireEvent.click(closeBtn);

    expect(cancelHandler).toHaveBeenCalledTimes(1);
  });

  it('should dispatch cancel event when cancel button is clicked', async () => {
    const cancelHandler = vi.fn();
    const { component } = render(QuickPin, { props: defaultProps });
    component.$on('cancel', cancelHandler);

    const cancelBtn = screen.getByText('Cancel');
    await fireEvent.click(cancelBtn);

    expect(cancelHandler).toHaveBeenCalledTimes(1);
  });

  it('should dispatch advanced event when advanced options button is clicked', async () => {
    const advancedHandler = vi.fn();
    const { component } = render(QuickPin, { props: defaultProps });
    component.$on('advanced', advancedHandler);

    const advancedBtn = screen.getByText('Advanced Options');
    await fireEvent.click(advancedBtn);

    expect(advancedHandler).toHaveBeenCalledTimes(1);
  });

  it('should dispatch cancel when overlay is clicked', async () => {
    const cancelHandler = vi.fn();
    const { component, container } = render(QuickPin, { props: defaultProps });
    component.$on('cancel', cancelHandler);

    const overlay = container.querySelector('.quick-pin-overlay')!;
    await fireEvent.click(overlay);

    expect(cancelHandler).toHaveBeenCalledTimes(1);
  });
});
