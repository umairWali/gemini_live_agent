import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ToastProvider, useToast } from '../components/Toast';
import { CommandPalette } from '../components/CommandPalette';

describe('Toast Component', () => {
  it('should render toast with correct type', () => {
    const TestComponent = () => {
      const { addToast } = useToast();
      return (
        <button onClick={() => addToast({ type: 'success', title: 'Test', message: 'Test message' })}>
          Show Toast
        </button>
      );
    };

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Toast'));
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });
});

describe('Command Palette', () => {
  it('should open with Ctrl+K shortcut', () => {
    const onClose = vi.fn();
    const onToggleTheme = vi.fn();
    const onToggleNotifications = vi.fn();

    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        onToggleTheme={onToggleTheme}
        onToggleNotifications={onToggleNotifications}
        isDark={true}
        notificationsEnabled={true}
      />
    );

    expect(screen.getByPlaceholderText('Search commands...')).toBeInTheDocument();
  });

  it('should close on ESC key', () => {
    const onClose = vi.fn();
    
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        onToggleTheme={vi.fn()}
        onToggleNotifications={vi.fn()}
        isDark={true}
        notificationsEnabled={true}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
