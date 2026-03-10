import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import CreateMap from './CreateMap.svelte';

describe('CreateMap Component', () => {
  it('should render the create map form', () => {
    render(CreateMap);
    expect(screen.getByText('Create a Map')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter map name')).toBeInTheDocument();
  });

  it('should have disabled create button when name is empty', () => {
    render(CreateMap);
    const createBtn = screen.getByText('Create Map');
    expect(createBtn).toBeDisabled();
  });

  it('should enable create button when name is entered', async () => {
    render(CreateMap);
    const input = screen.getByPlaceholderText('Enter map name');
    await fireEvent.input(input, { target: { value: 'My Map' } });
    const createBtn = screen.getByText('Create Map');
    expect(createBtn).not.toBeDisabled();
  });

  it('should dispatch create event with name and isPrivate=false by default', async () => {
    const createHandler = vi.fn();
    const { component } = render(CreateMap);
    component.$on('create', createHandler);

    const input = screen.getByPlaceholderText('Enter map name');
    await fireEvent.input(input, { target: { value: 'Test Map' } });

    const createBtn = screen.getByText('Create Map');
    await fireEvent.click(createBtn);

    expect(createHandler).toHaveBeenCalledTimes(1);
    expect(createHandler.mock.calls[0][0].detail).toEqual({
      name: 'Test Map',
      isPrivate: false,
    });
  });

  it('should dispatch create event with isPrivate=true when checkbox is checked', async () => {
    const createHandler = vi.fn();
    const { component } = render(CreateMap);
    component.$on('create', createHandler);

    const input = screen.getByPlaceholderText('Enter map name');
    await fireEvent.input(input, { target: { value: 'Private Map' } });

    const checkbox = screen.getByRole('checkbox');
    await fireEvent.click(checkbox);

    const createBtn = screen.getByText('Create Map');
    await fireEvent.click(createBtn);

    expect(createHandler.mock.calls[0][0].detail).toEqual({
      name: 'Private Map',
      isPrivate: true,
    });
  });

  it('should show private hint when private checkbox is checked', async () => {
    render(CreateMap);
    // Hint should not be visible initially
    expect(screen.queryByText(/require an access code/i)).not.toBeInTheDocument();

    const checkbox = screen.getByRole('checkbox');
    await fireEvent.click(checkbox);

    // Hint should appear
    expect(screen.getByText(/require an access code/i)).toBeInTheDocument();
  });

  it('should dispatch joinPrivate event when join button is clicked', async () => {
    const joinHandler = vi.fn();
    const { component } = render(CreateMap);
    component.$on('joinPrivate', joinHandler);

    const joinBtn = screen.getByText('Join a Private Map with Access Code');
    await fireEvent.click(joinBtn);

    expect(joinHandler).toHaveBeenCalledTimes(1);
  });

  it('should disable all inputs when disabled prop is true', () => {
    render(CreateMap, { props: { disabled: true } });
    const input = screen.getByPlaceholderText('Enter map name');
    expect(input).toBeDisabled();
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
    const joinBtn = screen.getByText('Join a Private Map with Access Code');
    expect(joinBtn).toBeDisabled();
  });

  it('should show "Creating..." when disabled', () => {
    render(CreateMap, { props: { disabled: true } });
    expect(screen.getByText('Creating…')).toBeInTheDocument();
  });
});
