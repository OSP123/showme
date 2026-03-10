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

  it('should dispatch create event with isPrivate=true when private checkbox is checked', async () => {
    const createHandler = vi.fn();
    const { component } = render(CreateMap);
    component.$on('create', createHandler);

    const input = screen.getByPlaceholderText('Enter map name');
    await fireEvent.input(input, { target: { value: 'Private Map' } });

    // First checkbox is "make private", second is "enable encryption"
    const checkboxes = screen.getAllByRole('checkbox');
    await fireEvent.click(checkboxes[0]); // private checkbox

    const createBtn = screen.getByText('Create Map');
    await fireEvent.click(createBtn);

    expect(createHandler.mock.calls[0][0].detail).toEqual({
      name: 'Private Map',
      isPrivate: true,
    });
  });

  it('should show private hint when private checkbox is checked', async () => {
    render(CreateMap);
    expect(screen.queryByText(/require an access code/i)).not.toBeInTheDocument();

    const checkboxes = screen.getAllByRole('checkbox');
    await fireEvent.click(checkboxes[0]); // private checkbox

    expect(screen.getByText(/require an access code/i)).toBeInTheDocument();
  });

  it('should show encryption fields when encryption checkbox is checked', async () => {
    render(CreateMap);
    expect(screen.queryByText(/Enter passphrase/i)).not.toBeInTheDocument();

    const checkboxes = screen.getAllByRole('checkbox');
    await fireEvent.click(checkboxes[1]); // encryption checkbox

    expect(screen.getByPlaceholderText(/enter passphrase/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/confirm passphrase/i)).toBeInTheDocument();
  });

  it('should disable create button when encryption enabled but passphrase too short', async () => {
    render(CreateMap);
    const nameInput = screen.getByPlaceholderText('Enter map name');
    await fireEvent.input(nameInput, { target: { value: 'My Map' } });

    const checkboxes = screen.getAllByRole('checkbox');
    await fireEvent.click(checkboxes[1]); // encryption checkbox

    // Enter short passphrase
    const passInput = screen.getByPlaceholderText(/enter passphrase/i);
    await fireEvent.input(passInput, { target: { value: 'short' } });

    const createBtn = screen.getByText('Create Map');
    expect(createBtn).toBeDisabled();
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
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach((cb) => expect(cb).toBeDisabled());
    const joinBtn = screen.getByText('Join a Private Map with Access Code');
    expect(joinBtn).toBeDisabled();
  });

  it('should show "Creating..." when disabled', () => {
    render(CreateMap, { props: { disabled: true } });
    expect(screen.getByText('Creating…')).toBeInTheDocument();
  });
});
