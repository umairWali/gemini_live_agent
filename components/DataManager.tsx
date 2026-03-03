import React, { useState } from 'react';
import { Download, Upload, Database, FileJson, AlertTriangle, CheckCircle } from 'lucide-react';
import { db } from '../utils/indexedDB';

interface DataManagerProps {
  onClose: () => void;
}

export const DataManager: React.FC<DataManagerProps> = ({ onClose }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const data = await db.exportAll();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `personal-ai-operator-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage('Data exported successfully!');
      setMessageType('success');
    } catch (error) {
      setMessage('Export failed: ' + (error as Error).message);
      setMessageType('error');
    } finally {
      setIsExporting(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate structure
      if (!data.state || !data.messages || !data.exportDate) {
        throw new Error('Invalid backup file format');
      }

      if (!confirm('This will replace all current data. Are you sure?')) {
        setIsImporting(false);
        return;
      }

      await db.importAll(data);
      
      setMessage('Data imported successfully! Reloading...');
      setMessageType('success');
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      setMessage('Import failed: ' + (error as Error).message);
      setMessageType('error');
      setIsImporting(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleClear = async () => {
    if (!confirm('WARNING: This will delete ALL data permanently. Are you sure?')) return;
    if (!confirm('This action cannot be undone. Type "DELETE" to confirm')) return;

    try {
      await db.clear('state');
      await db.clear('messages');
      await db.clear('audit');
      await db.clear('settings');
      await db.clear('telemetry');
      localStorage.clear();
      
      setMessage('All data cleared. Reloading...');
      setMessageType('success');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      setMessage('Clear failed: ' + (error as Error).message);
      setMessageType('error');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-[500px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-slate-200">Data Manager</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {message && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              messageType === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
            }`}>
              {messageType === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {message}
            </div>
          )}

          {/* Export */}
          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Download className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-slate-200">Export Data</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Download all your chat history, settings, and telemetry data.
                </p>
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="mt-3 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-900 font-medium rounded-lg text-sm transition-all"
                >
                  {isExporting ? 'Exporting...' : 'Download Backup'}
                </button>
              </div>
            </div>
          </div>

          {/* Import */}
          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-sky-500/10 rounded-lg">
                <Upload className="w-5 h-5 text-sky-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-slate-200">Import Data</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Restore from a previous backup file.
                </p>
                <label className="mt-3 inline-block">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                  <span className="px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-900 font-medium rounded-lg text-sm transition-all cursor-pointer inline-flex items-center gap-2">
                    <FileJson className="w-4 h-4" />
                    {isImporting ? 'Importing...' : 'Select Backup File'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Clear Data */}
          <div className="p-4 bg-rose-500/10 rounded-xl border border-rose-500/20">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-500/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-rose-400">Clear All Data</h3>
                <p className="text-sm text-rose-400/70 mt-1">
                  Permanently delete all data. This action cannot be undone.
                </p>
                <button
                  onClick={handleClear}
                  className="mt-3 px-4 py-2 bg-rose-500 hover:bg-rose-400 text-slate-900 font-medium rounded-lg text-sm transition-all"
                >
                  Delete Everything
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataManager;
