import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ConfirmModal from './ConfirmModal.svelte';

describe('ConfirmModal Component', () => {
  it('should not render when open is false', () => {
    render(ConfirmModal, {
      props: {
        open: false,
        title: 'Test Title',
        message: 'Test message',
      },
    });

    expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
    expect(screen.queryByText('Test message')).not.toBeInTheDocument();
  });

  it('should render when open is true', () => {
    render(ConfirmModal, {
      props: {
        open: true,
        title: 'Delete Item',
        message: 'Are you sure you want to delete this?',
      },
    });

    expect(screen.getByText('Delete Item')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this?')).toBeInTheDocument();
  });

  it('should use default title from i18n when title is empty', () => {
    const { container } = render(ConfirmModal, {
      props: {
        open: true,
        title: '',
        message: 'Some message',
      },
    });

    // Falls back to $_('confirm.title') which is "Confirm" in English
    const titleEl = container.querySelector('.confirm-title');
    expect(titleEl).toBeTruthy();
    expect(titleEl!.textContent).toBe('Confirm');
  });

  it('should use default button labels from i18n when labels are empty', () => {
    const { container } = render(ConfirmModal, {
      props: {
        open: true,
        title: 'Test',
        message: 'Test',
      },
    });

    // Falls back to $_('common.cancel') and $_('common.confirm')
    const cancelBtn = container.querySelector('.btn-cancel');
    const confirmBtn = container.querySelector('.btn-confirm');
    expect(cancelBtn!.textContent!.trim()).toBe('Cancel');
    expect(confirmBtn!.textContent!.trim()).toBe('Confirm');
  });

  it('should use custom button labels when provided', () => {
    render(ConfirmModal, {
      props: {
        open: true,
        title: 'Delete Photo',
        message: 'This cannot be undone.',
        confirmLabel: 'Delete Forever',
        cancelLabel: 'Keep It',
      },
    });

    expect(screen.getByText('Delete Forever')).toBeInTheDocument();
    expect(screen.getByText('Keep It')).toBeInTheDocument();
  });

  it('should dispatch confirm event when confirm button is clicked', async () => {
    const confirmHandler = vi.fn();

    const { component, container } = render(ConfirmModal, {
      props: {
        open: true,
        title: 'Confirm Action',
        message: 'Proceed?',
      },
    });

    component.$on('confirm', confirmHandler);

    const confirmBtn = container.querySelector('.btn-confirm')!;
    await fireEvent.click(confirmBtn);

    expect(confirmHandler).toHaveBeenCalledTimes(1);
  });

  it('should dispatch cancel event when cancel button is clicked', async () => {
    const cancelHandler = vi.fn();

    const { component, container } = render(ConfirmModal, {
      props: {
        open: true,
        title: 'Confirm Action',
        message: 'Proceed?',
      },
    });

    component.$on('cancel', cancelHandler);

    const cancelBtn = container.querySelector('.btn-cancel')!;
    await fireEvent.click(cancelBtn);

    expect(cancelHandler).toHaveBeenCalledTimes(1);
  });

  it('should dispatch cancel event when overlay is clicked', async () => {
    const cancelHandler = vi.fn();

    const { component, container } = render(ConfirmModal, {
      props: {
        open: true,
        title: 'Confirm Action',
        message: 'Proceed?',
      },
    });

    component.$on('cancel', cancelHandler);

    const overlay = container.querySelector('.confirm-overlay');
    expect(overlay).toBeTruthy();
    await fireEvent.click(overlay!);

    expect(cancelHandler).toHaveBeenCalledTimes(1);
  });

  it('should apply danger variant class to confirm button', () => {
    const { container } = render(ConfirmModal, {
      props: {
        open: true,
        title: 'Delete',
        message: 'Delete this item?',
        variant: 'danger',
      },
    });

    const confirmBtn = container.querySelector('.btn-danger');
    expect(confirmBtn).toBeTruthy();
  });

  it('should apply warning variant class to confirm button', () => {
    const { container } = render(ConfirmModal, {
      props: {
        open: true,
        title: 'Warning',
        message: 'Are you sure?',
        variant: 'warning',
      },
    });

    const confirmBtn = container.querySelector('.btn-warning');
    expect(confirmBtn).toBeTruthy();
  });

  it('should apply info variant class by default', () => {
    const { container } = render(ConfirmModal, {
      props: {
        open: true,
        title: 'Info',
        message: 'Continue?',
      },
    });

    const confirmBtn = container.querySelector('.btn-info');
    expect(confirmBtn).toBeTruthy();
  });
});
