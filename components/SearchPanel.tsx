import React, { useState, useMemo } from 'react';
import { Search, X, Filter, Calendar, User, Bot } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
  agentBadge?: string;
}

interface SearchPanelProps {
  messages: Message[];
  onSearch: (query: string, filters: SearchFilters) => void;
  onClose: () => void;
  onJumpToMessage: (id: string) => void;
}

export interface SearchFilters {
  role?: 'user' | 'ai' | 'all';
  dateFrom?: number;
  dateTo?: number;
  agent?: string;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ 
  messages, 
  onSearch, 
  onClose,
  onJumpToMessage 
}) => {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({ role: 'all' });
  const [showFilters, setShowFilters] = useState(false);

  const filteredMessages = useMemo(() => {
    if (!query.trim()) return [];

    return messages.filter(msg => {
      const matchesText = msg.text.toLowerCase().includes(query.toLowerCase());
      const matchesRole = filters.role === 'all' || msg.role === filters.role;
      const matchesDate = (!filters.dateFrom || msg.timestamp >= filters.dateFrom) &&
                         (!filters.dateTo || msg.timestamp <= filters.dateTo);
      const matchesAgent = !filters.agent || msg.agentBadge === filters.agent;

      return matchesText && matchesRole && matchesDate && matchesAgent;
    }).slice(0, 50);
  }, [messages, query, filters]);

  const uniqueAgents = useMemo(() => {
    const agents = new Set<string>();
    messages.forEach(m => m.agentBadge && agents.add(m.agentBadge));
    return Array.from(agents);
  }, [messages]);

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[10vh]">
      <div className="w-full max-w-[700px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-800">
          <Search className="w-5 h-5 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chat history..."
            className="flex-1 bg-transparent text-slate-200 placeholder:text-slate-600 outline-none text-base"
            autoFocus
          />
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-emerald-500/20 text-emerald-400' : 'hover:bg-slate-800 text-slate-500'}`}
          >
            <Filter className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex flex-wrap gap-3">
            {/* Role Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Role:</span>
              <select 
                value={filters.role}
                onChange={(e) => setFilters(f => ({ ...f, role: e.target.value as any }))}
                className="bg-slate-800 text-slate-200 text-sm rounded-lg px-3 py-1 outline-none border border-slate-700"
              >
                <option value="all">All</option>
                <option value="user">User</option>
                <option value="ai">AI</option>
              </select>
            </div>

            {/* Agent Filter */}
            {uniqueAgents.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Agent:</span>
                <select 
                  value={filters.agent || ''}
                  onChange={(e) => setFilters(f => ({ ...f, agent: e.target.value || undefined }))}
                  className="bg-slate-800 text-slate-200 text-sm rounded-lg px-3 py-1 outline-none border border-slate-700"
                >
                  <option value="">All Agents</option>
                  {uniqueAgents.map(agent => (
                    <option key={agent} value={agent}>{agent}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <Calendar className="w-3 h-3 text-slate-500" />
              <input 
                type="date"
                onChange={(e) => setFilters(f => ({ 
                  ...f, 
                  dateFrom: e.target.value ? new Date(e.target.value).getTime() : undefined 
                }))}
                className="bg-slate-800 text-slate-200 text-sm rounded-lg px-3 py-1 outline-none border border-slate-700"
              />
              <span className="text-slate-500">to</span>
              <input 
                type="date"
                onChange={(e) => setFilters(f => ({ 
                  ...f, 
                  dateTo: e.target.value ? new Date(e.target.value).getTime() : undefined 
                }))}
                className="bg-slate-800 text-slate-200 text-sm rounded-lg px-3 py-1 outline-none border border-slate-700"
              />
            </div>
          </div>
        )}

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {query.trim() && filteredMessages.length === 0 && (
            <div className="px-4 py-8 text-center text-slate-500">
              No messages found matching "{query}"
            </div>
          )}

          {filteredMessages.map((msg) => (
            <button
              key={msg.id}
              onClick={() => onJumpToMessage(msg.id)}
              className="w-full text-left px-4 py-3 hover:bg-slate-800/50 border-b border-slate-800/50 last:border-0 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                {msg.role === 'user' ? (
                  <User className="w-3 h-3 text-sky-400" />
                ) : (
                  <Bot className="w-3 h-3 text-emerald-400" />
                )}
                <span className={`text-xs font-semibold ${msg.role === 'user' ? 'text-sky-400' : 'text-emerald-400'}`}>
                  {msg.role === 'user' ? 'You' : msg.agentBadge || 'AI'}
                </span>
                <span className="text-xs text-slate-600">
                  {new Date(msg.timestamp).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-slate-300 line-clamp-2">{msg.text}</p>
            </button>
          ))}
        </div>

        {/* Footer */}
        {query.trim() && (
          <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 text-xs text-slate-500">
            {filteredMessages.length} results found
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPanel;
