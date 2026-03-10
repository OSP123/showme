import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ShareMap from './ShareMap.svelte';

// Mock clipboard API
const writeTextMock = vi.fn(() => Promise.resolve());
Object.assign(navigator, {
  clipboard: { writeText: writeTextMock },
});

describe('ShareMap Component', () => {
  beforeEach(() => {
    writeTextMock.mockClear();
  });

  it('should not render when open is false', () => {
    render(ShareMap, {
      props: { mapId: 'test-id', open: false },
    });
    expect(screen.queryByText('Share Map')).not.toBeInTheDocument();
  });

  it('should render when open is true', () => {
    render(ShareMap, {
      props: { mapId: 'test-id', open: true },
    });
    expect(screen.getByText('Share Map')).toBeInTheDocument();
  });

  it('should display share URL with map ID', () => {
    const { container } = render(ShareMap, {
      props: { mapId: 'abc-123', open: true },
    });
    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toContain('map=abc-123');
  });

  it('should include token in share URL when accessToken is provided', () => {
    const { container } = render(ShareMap, {
      props: { mapId: 'abc-123', accessToken: 'my-token-uuid', open: true },
    });
    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.value).toContain('token=my-token-uuid');
  });

  it('should not include token in share URL when accessToken is null', () => {
    const { container } = render(ShareMap, {
      props: { mapId: 'abc-123', open: true },
    });
    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.value).not.toContain('token=');
  });

  it('should copy link to clipboard when copy button is clicked', async () => {
    render(ShareMap, {
      props: { mapId: 'abc-123', open: true },
    });
    const copyBtn = screen.getByText('Copy');
    await fireEvent.click(copyBtn);
    expect(writeTextMock).toHaveBeenCalledTimes(1);
    expect(writeTextMock.mock.calls[0][0]).toContain('map=abc-123');
  });

  it('should not show access code section for public maps', () => {
    render(ShareMap, {
      props: { mapId: 'test-id', open: true, isPrivate: false, accessCode: 'ABC123' },
    });
    expect(screen.queryByText('ABC123')).not.toBeInTheDocument();
  });

  it('should show access code section for private maps with access code', () => {
    render(ShareMap, {
      props: { mapId: 'test-id', open: true, isPrivate: true, accessCode: 'XYZ789' },
    });
    expect(screen.getByText('XYZ789')).toBeInTheDocument();
  });

  it('should not show access code section for private maps without access code', () => {
    const { container } = render(ShareMap, {
      props: { mapId: 'test-id', open: true, isPrivate: true, accessCode: null },
    });
    expect(container.querySelector('.access-code-section')).toBeNull();
  });

  it('should copy access code when copy code button is clicked', async () => {
    render(ShareMap, {
      props: { mapId: 'test-id', open: true, isPrivate: true, accessCode: 'ABC123' },
    });
    const copyCodeBtn = screen.getByText('Copy Code');
    await fireEvent.click(copyCodeBtn);
    expect(writeTextMock).toHaveBeenCalledWith('ABC123');
  });

  it('should show private note for private maps', () => {
    render(ShareMap, {
      props: { mapId: 'test-id', open: true, isPrivate: true },
    });
    const privateNote = screen.getByText(/private map/i);
    expect(privateNote).toBeInTheDocument();
  });

  it('should not show private note for public maps', () => {
    render(ShareMap, {
      props: { mapId: 'test-id', open: true, isPrivate: false },
    });
    expect(screen.queryByText(/private map/i)).not.toBeInTheDocument();
  });
});
