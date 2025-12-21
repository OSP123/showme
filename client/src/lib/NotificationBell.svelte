<script lang="ts">
  import { notifications, type Notification, getPinTypeEmoji } from './notifications';
  import { formatDistanceToNow } from 'date-fns';

  export let open = false;

  $: unreadCount = $notifications.filter(n => !n.read).length;

  function markAsRead(id: string) {
    notifications.markAsRead(id);
  }

  function markAllAsRead() {
    notifications.markAllAsRead();
  }

  function clearAll() {
    notifications.clear();
    open = false;
  }

  function getTimeAgo(timestamp: Date): string {
    return formatDistanceToNow(timestamp, { addSuffix: true });
  }
</script>

<div class="notification-container">
  <button class="notification-bell" on:click={() => open = !open} title="Notifications">
    🔔
    {#if unreadCount > 0}
      <span class="badge">{unreadCount}</span>
    {/if}
  </button>

  {#if open}
    <div class="notification-panel">
      <div class="panel-header">
        <h3>Notifications</h3>
        <div class="header-actions">
          {#if unreadCount > 0}
            <button class="text-btn" on:click={markAllAsRead}>Mark all read</button>
          {/if}
          {#if $notifications.length > 0}
            <button class="text-btn" on:click={clearAll}>Clear all</button>
          {/if}
          <button class="close-btn" on:click={() => open = false}>×</button>
        </div>
      </div>

      <div class="notifications-list">
        {#if $notifications.length === 0}
          <div class="empty-state">
            <p>No notifications yet</p>
          </div>
        {:else}
          {#each $notifications as notif (notif.id)}
            <div 
              class="notification-item" 
              class:unread={!notif.read}
              on:click={() => markAsRead(notif.id)}
            >
              <div class="notif-icon">
                {notif.emoji || getPinTypeEmoji(notif.pinType)}
              </div>
              <div class="notif-content">
                <p class="notif-message">{notif.message}</p>
                <span class="notif-time">{getTimeAgo(notif.timestamp)}</span>
              </div>
              {#if !notif.read}
                <div class="unread-dot"></div>
              {/if}
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .notification-container {
    position: relative;
  }

  .notification-bell {
    position: relative;
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 20px;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .notification-bell:hover {
    background: #f5f5f5;
  }

  .badge {
    position: absolute;
    top: -4px;
    right: -4px;
    background: #dc3545;
    color: white;
    border-radius: 10px;
    padding: 2px 6px;
    font-size: 11px;
    font-weight: 600;
    min-width: 18px;
    text-align: center;
  }

  .notification-panel {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    width: 400px;
    max-width: calc(100vw - 32px);
    max-height: 500px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    z-index: 1000;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid #e0e0e0;
  }

  .panel-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .text-btn {
    background: none;
    border: none;
    color: #4a90e2;
    font-size: 13px;
    cursor: pointer;
    padding: 4px 8px;
  }

  .text-btn:hover {
    text-decoration: underline;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    color: #666;
  }

  .close-btn:hover {
    color: #333;
  }

  .notifications-list {
    overflow-y: auto;
    max-height: 400px;
  }

  .empty-state {
    padding: 40px 20px;
    text-align: center;
    color: #999;
  }

  .notification-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    transition: background 0.2s;
  }

  .notification-item:hover {
    background: #f9f9f9;
  }

  .notification-item.unread {
    background: #f0f7ff;
  }

  .notification-item.unread:hover {
    background: #e3f2fd;
  }

  .notif-icon {
    font-size: 24px;
    flex-shrink: 0;
  }

  .notif-content {
    flex: 1;
    min-width: 0;
  }

  .notif-message {
    margin: 0 0 4px 0;
    font-size: 14px;
    color: #333;
  }

  .notif-time {
    font-size: 12px;
    color: #999;
  }

  .unread-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #4a90e2;
    flex-shrink: 0;
    margin-top: 6px;
  }

  @media (max-width: 480px) {
    .notification-panel {
      position: fixed;
      top: 60px;
      right: 8px;
      left: 8px;
      width: auto;
    }
  }
</style>
