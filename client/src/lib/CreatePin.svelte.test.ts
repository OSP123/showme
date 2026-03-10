import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import CreatePin from './CreatePin.svelte';

describe('CreatePin Component', () => {
  const defaultProps = { open: true, lat: 48.85, lng: 2.35 };

  it('should not render when open is false', () => {
    render(CreatePin, { props: { open: false, lat: 0, lng: 0 } });
    expect(screen.queryByText('Add Pin')).not.toBeInTheDocument();
  });

  it('should render in create mode by default', () => {
    render(CreatePin, { props: defaultProps });
    // Title "Add Pin" appears as heading and as submit button
    const elements = screen.getAllByText('Add Pin');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('should render in edit mode when mode is "edit"', () => {
    render(CreatePin, {
      props: { ...defaultProps, mode: 'edit', pinId: 'pin-1' },
    });
    expect(screen.getByText('Edit Pin')).toBeInTheDocument();
  });

  it('should display all pin type buttons', () => {
    render(CreatePin, { props: defaultProps });
    expect(screen.getByText('Medical')).toBeInTheDocument();
    expect(screen.getByText('Water')).toBeInTheDocument();
    expect(screen.getByText('Shelter')).toBeInTheDocument();
    expect(screen.getByText('Danger')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('should dispatch create event with form data on submit', async () => {
    const createHandler = vi.fn();
    const { component } = render(CreatePin, { props: defaultProps });
    component.$on('create', createHandler);

    // Select a type
    const waterBtn = screen.getByText('Water').closest('button')!;
    await fireEvent.click(waterBtn);

    // Enter description
    const textarea = screen.getByPlaceholderText(/add details/i);
    await fireEvent.input(textarea, { target: { value: 'Fresh water source' } });

    // Submit - there are two "Add Pin" texts (heading + button), click the button
    const addPinButtons = screen.getAllByText('Add Pin');
    const submitBtn = addPinButtons.find(el => el.tagName === 'BUTTON') || addPinButtons[addPinButtons.length - 1];
    await fireEvent.click(submitBtn);

    expect(createHandler).toHaveBeenCalledTimes(1);
    const detail = createHandler.mock.calls[0][0].detail;
    expect(detail.lat).toBe(48.85);
    expect(detail.lng).toBe(2.35);
    expect(detail.type).toBe('water');
    expect(detail.description).toBe('Fresh water source');
  });

  it('should dispatch cancel event when cancel button is clicked', async () => {
    const cancelHandler = vi.fn();
    const { component } = render(CreatePin, { props: defaultProps });
    component.$on('cancel', cancelHandler);

    const cancelBtn = screen.getByText('Cancel');
    await fireEvent.click(cancelBtn);

    expect(cancelHandler).toHaveBeenCalledTimes(1);
  });

  it('should handle tag adding and removing', async () => {
    const { container } = render(CreatePin, { props: defaultProps });

    const tagInput = screen.getByPlaceholderText(/add.*tag/i);
    await fireEvent.input(tagInput, { target: { value: 'urgent' } });

    const addTagBtn = screen.getByRole('button', { name: 'Add' });
    await fireEvent.click(addTagBtn);

    // Tag should appear
    expect(screen.getByText('urgent')).toBeInTheDocument();

    // Remove tag
    const removeBtn = container.querySelector('.tag-remove')!;
    await fireEvent.click(removeBtn);

    expect(screen.queryByText('urgent')).not.toBeInTheDocument();
  });

  it('should not add duplicate tags', async () => {
    render(CreatePin, { props: defaultProps });

    const tagInput = screen.getByPlaceholderText(/add.*tag/i);
    const addTagBtn = screen.getByRole('button', { name: 'Add' });

    // Add same tag twice
    await fireEvent.input(tagInput, { target: { value: 'urgent' } });
    await fireEvent.click(addTagBtn);
    await fireEvent.input(tagInput, { target: { value: 'urgent' } });
    await fireEvent.click(addTagBtn);

    // Should only appear once
    const tags = screen.getAllByText('urgent');
    expect(tags).toHaveLength(1);
  });

  it('should dispatch cancel when overlay is clicked', async () => {
    const cancelHandler = vi.fn();
    const { component, container } = render(CreatePin, { props: defaultProps });
    component.$on('cancel', cancelHandler);

    const overlay = container.querySelector('.modal-overlay')!;
    await fireEvent.click(overlay);

    expect(cancelHandler).toHaveBeenCalledTimes(1);
  });

  it('should dispatch update event in edit mode', async () => {
    const updateHandler = vi.fn();
    const { component } = render(CreatePin, {
      props: { ...defaultProps, mode: 'edit', pinId: 'pin-123' },
    });
    component.$on('update', updateHandler);

    // Change description
    const textarea = screen.getByPlaceholderText(/add details/i);
    await fireEvent.input(textarea, { target: { value: 'Updated description' } });

    // Submit - in edit mode button says "Save Changes"
    const saveBtn = screen.getByText('Save Changes');
    await fireEvent.click(saveBtn);

    expect(updateHandler).toHaveBeenCalledTimes(1);
    const detail = updateHandler.mock.calls[0][0].detail;
    expect(detail.pinId).toBe('pin-123');
    expect(detail.updates.description).toBe('Updated description');
  });
});
