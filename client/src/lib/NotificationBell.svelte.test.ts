import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import NotificationBell from './NotificationBell.svelte';
import { notifications } from './notifications';

describe('NotificationBell Component', () => {
  beforeEach(() => {
    notifications.clear();
  });

  it('should not render panel when open is false', () => {
    render(NotificationBell, { props: { open: false } });
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
  });

  it('should render panel when open is true', () => {
    render(NotificationBell, { props: { open: true } });
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('should show empty state when no notifications', () => {
    render(NotificationBell, { props: { open: true } });
    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
  });

  it('should show notifications when they exist', () => {
    notifications.add({
      message: 'New pin added',
      pinType: 'water',
    });

    render(NotificationBell, { props: { open: true } });
    expect(screen.getByText('New pin added')).toBeInTheDocument();
  });

  it('should show "Mark all read" button when there are unread notifications', () => {
    notifications.add({
      message: 'Unread notification',
      pinType: 'medical',
    });

    render(NotificationBell, { props: { open: true } });
    expect(screen.getByText('Mark all read')).toBeInTheDocument();
  });

  it('should mark all notifications as read when "Mark all read" is clicked', async () => {
    notifications.add({
      message: 'Notification 1',
      pinType: 'water',
    });
    notifications.add({
      message: 'Notification 2',
      pinType: 'shelter',
    });

    render(NotificationBell, { props: { open: true } });

    const markAllBtn = screen.getByText('Mark all read');
    await fireEvent.click(markAllBtn);

    // After marking all read, the "Mark all read" button should disappear
    expect(screen.queryByText('Mark all read')).not.toBeInTheDocument();
  });

  it('should clear all notifications and close panel when "Clear all" is clicked', async () => {
    notifications.add({
      message: 'To be cleared',
      pinType: 'danger',
    });

    render(NotificationBell, { props: { open: true } });

    expect(screen.getByText('To be cleared')).toBeInTheDocument();

    const clearBtn = screen.getByText('Clear all');
    await fireEvent.click(clearBtn);

    // Panel closes after clearing (open = false in component)
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
    expect(screen.queryByText('To be cleared')).not.toBeInTheDocument();
  });

  it('should mark individual notification as read when clicked', async () => {
    notifications.add({
      message: 'Click to read',
      pinType: 'food',
    });

    const { container } = render(NotificationBell, { props: { open: true } });

    // Initially has unread dot
    expect(container.querySelector('.unread-dot')).toBeTruthy();

    const notifItem = container.querySelector('.notification-item')!;
    await fireEvent.click(notifItem);

    // After click, unread dot should be gone
    expect(container.querySelector('.unread-dot')).not.toBeTruthy();
  });
});
