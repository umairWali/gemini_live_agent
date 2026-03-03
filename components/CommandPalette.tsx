
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Zap, Settings, Moon, Sun, Command, Bell, Keyboard } from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  action: () => void;
  category: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onToggleTheme: () => void;
  onToggleNotifications: () => void;
  isDark: boolean;
  notificationsEnabled: boolean;
}

export const useCommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { isOpen, setIsOpen };
};

export const CommandPalette: React.FC<CommandPaletteProps> = ({ 
  isOpen, 
  onClose, 
  onToggleTheme, 
  onToggleNotifications,
  isDark,
  notificationsEnabled
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    {
      id: 'autonomous',
      title: 'Toggle Autonomous Mode',
      description: 'Enable/disable AI autonomy',
      icon: <Zap className="w-4 h-4" />,
      shortcut: 'Ctrl+A',
      action: () => {},
      category: 'Actions'
    },
    {
      id: 'theme',
      title: `${isDark ? 'Light' : 'Dark'} Mode`,
      description: 'Toggle color theme',
      icon: isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />,
      shortcut: 'Ctrl+T',
      action: onToggleTheme,
      category: 'Preferences'
    },
    {
      id: 'notifications',
      title: `${notificationsEnabled ? 'Disable' : 'Enable'} Notifications`,
      description: 'Toggle toast notifications',
      icon: <Bell className="w-4 h-4" />,
      shortcut: 'Ctrl+N',
      action: onToggleNotifications,
      category: 'Preferences'
    },
    {
      id: 'shortcuts',
      title: 'Keyboard Shortcuts',
      description: 'View all available shortcuts',
      icon: <Keyboard className="w-4 h-4" />,
      shortcut: '?',
      action: () => {},
      category: 'Help'
    }
  ];

  const filteredCommands = commands.filter(cmd => 
    cmd.title.toLowerCase().includes(search.toLowerCase()) ||
    cmd.description?.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            onClose();
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-[600px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-top-4 duration-200">
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-800">
          <Search className="w-5 h-5 text-slate-500" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search commands..."
            className="flex-1 bg-transparent text-slate-200 placeholder:text-slate-600 outline-none text-base"
          />
          <kbd className="px-2 py-1 text-xs font-mono bg-slate-800 rounded text-slate-500">ESC</kbd>
        </div>

        {/* Commands List */}
        <div className="max-h-[400px] overflow-y-auto py-2">
          {filteredCommands.map((cmd, index) => (
            <button
              key={cmd.id}
              onClick={() => {
                cmd.action();
                onClose();
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                index === selectedIndex ? 'bg-emerald-500/10' : 'hover:bg-slate-800/50'
              }`}
            >
              <span className={`p-2 rounded-lg ${index === selectedIndex ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                {cmd.icon || <Command className="w-4 h-4" />}
              </span>
              <div className="flex-1">
                <p className={`font-medium ${index === selectedIndex ? 'text-emerald-400' : 'text-slate-200'}`}>
                  {cmd.title}
                </p>
                {cmd.description && (
                  <p className="text-sm text-slate-500">{cmd.description}</p>
                )}
              </div>
              {cmd.shortcut && (
                <kbd className="px-2 py-1 text-xs font-mono bg-slate-800 rounded text-slate-500">
                  {cmd.shortcut}
                </kbd>
              )}
            </button>
          ))}
          {filteredCommands.length === 0 && (
            <div className="px-4 py-8 text-center text-slate-500">
              No commands found
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
          </div>
          <span>{filteredCommands.length} commands</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
