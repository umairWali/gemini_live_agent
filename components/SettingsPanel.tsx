import React, { useState } from 'react';
import { Settings, X, Save, Key, Palette, Volume2, Globe, Shield, Database, RefreshCw, Mail, Calendar } from 'lucide-react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  onThemeToggle: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose, isDark, onThemeToggle }) => {
  // Load settings from localStorage on mount
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('operator_api_key') || '');
  const [notifications, setNotifications] = useState(() => localStorage.getItem('operator_notifications') === 'true');
  const [autoSave, setAutoSave] = useState(() => localStorage.getItem('operator_auto_save') === 'true');
  const [voiceEnabled, setVoiceEnabled] = useState(() => localStorage.getItem('operator_voice') === 'true');
  const [language, setLanguage] = useState(() => localStorage.getItem('operator_language') || 'en');
  const [debugMode, setDebugMode] = useState(() => localStorage.getItem('operator_debug') === 'true');
  
  // Email & Calendar Settings
  const [gmailEmail, setGmailEmail] = useState(() => localStorage.getItem('operator_gmail_email') || '');
  const [gmailAppPassword, setGmailAppPassword] = useState(() => localStorage.getItem('operator_gmail_password') || '');
  const [calendarEnabled, setCalendarEnabled] = useState(() => localStorage.getItem('operator_calendar_enabled') === 'true');

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem('operator_api_key', apiKey);
    localStorage.setItem('operator_notifications', notifications.toString());
    localStorage.setItem('operator_auto_save', autoSave.toString());
    localStorage.setItem('operator_voice', voiceEnabled.toString());
    localStorage.setItem('operator_language', language);
    localStorage.setItem('operator_debug', debugMode.toString());
    
    // Save email & calendar settings
    localStorage.setItem('operator_gmail_email', gmailEmail);
    localStorage.setItem('operator_gmail_password', gmailAppPassword);
    localStorage.setItem('operator_calendar_enabled', calendarEnabled.toString());
    
    // Send to server
    if (gmailEmail && gmailAppPassword) {
      fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect',
          provider: 'gmail',
          credentials: { email: gmailEmail, password: gmailAppPassword }
        })
      }).then(res => res.json()).then(data => {
        console.log('Email connected:', data);
      });
    }
    
    // Show success message
    if (apiKey) {
      console.log('✅ Settings saved successfully');
    }
    
    // Close panel
    onClose();
  };

  const handleReset = () => {
    setApiKey('');
    setNotifications(true);
    setAutoSave(true);
    setVoiceEnabled(true);
    setLanguage('en');
    setDebugMode(false);
    setGmailEmail('');
    setGmailAppPassword('');
    setCalendarEnabled(false);
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isDark ? 'bg-black/50' : 'bg-black/30'}`}>
      <div className={`w-full max-w-md rounded-2xl shadow-2xl border ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-violet-500" />
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Settings</h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* API Key */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-4 h-4 text-amber-500" />
              <label className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Gemini API Key
              </label>
            </div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Gemini API key..."
              className={`w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors ${isDark ? 'bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:border-violet-500/50' : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-400'}`}
            />
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              Required for voice and vision features
            </p>
          </div>

          {/* Gmail Email */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-red-500" />
              <label className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Gmail Address
              </label>
            </div>
            <input
              type="email"
              value={gmailEmail}
              onChange={(e) => setGmailEmail(e.target.value)}
              placeholder="your.email@gmail.com"
              className={`w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors ${isDark ? 'bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:border-violet-500/50' : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-400'}`}
            />
          </div>

          {/* Gmail App Password */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-4 h-4 text-red-500" />
              <label className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Gmail App Password
              </label>
            </div>
            <input
              type="password"
              value={gmailAppPassword}
              onChange={(e) => setGmailAppPassword(e.target.value)}
              placeholder="Enter 16-char app password"
              className={`w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors ${isDark ? 'bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:border-violet-500/50' : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-400'}`}
            />
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              Get app password from Google Account → Security → App Passwords
            </p>
          </div>

          {/* Language */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-blue-500" />
              <label className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Language
              </label>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors ${isDark ? 'bg-white/5 border border-white/10 text-white focus:border-violet-500/50' : 'bg-slate-50 border border-slate-200 text-slate-900 focus:border-violet-400'}`}
            >
              <option value="en">English</option>
              <option value="ur">اردو (Urdu)</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="es">Español</option>
            </select>
          </div>

          {/* Theme Toggle */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Palette className="w-4 h-4 text-purple-500" />
              <label className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Theme
              </label>
            </div>
            <button
              onClick={onThemeToggle}
              className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}
            >
              {isDark ? '🌙 Dark Mode' : '☀️ Light Mode'}
            </button>
          </div>

          {/* Calendar Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              <label className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Google Calendar
              </label>
            </div>
            <button
              onClick={() => setCalendarEnabled(!calendarEnabled)}
              className={`w-12 h-6 rounded-full transition-colors ${calendarEnabled ? 'bg-violet-500' : 'bg-slate-600'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${calendarEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Toggle Settings */}
          <div className="space-y-3">
            {/* Notifications */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-green-500" />
                <label className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Notifications
                </label>
              </div>
              <button
                onClick={() => setNotifications(!notifications)}
                className={`w-12 h-6 rounded-full transition-colors ${notifications ? 'bg-violet-500' : 'bg-slate-600'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${notifications ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* Auto Save */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-500" />
                <label className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Auto Save
                </label>
              </div>
              <button
                onClick={() => setAutoSave(!autoSave)}
                className={`w-12 h-6 rounded-full transition-colors ${autoSave ? 'bg-violet-500' : 'bg-slate-600'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${autoSave ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* Voice Enabled */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-rose-500" />
                <label className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Voice Features
                </label>
              </div>
              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={`w-12 h-6 rounded-full transition-colors ${voiceEnabled ? 'bg-violet-500' : 'bg-slate-600'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${voiceEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* Debug Mode */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-orange-500" />
                <label className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Debug Mode
                </label>
              </div>
              <button
                onClick={() => setDebugMode(!debugMode)}
                className={`w-12 h-6 rounded-full transition-colors ${debugMode ? 'bg-violet-500' : 'bg-slate-600'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${debugMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}">
            <button
              onClick={handleReset}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              <RefreshCw className="w-3 h-3" />
              Reset
            </button>
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-violet-500 to-purple-600 text-white transition-all hover:shadow-lg hover:shadow-violet-500/30"
            >
              <Save className="w-3 h-3" />
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
