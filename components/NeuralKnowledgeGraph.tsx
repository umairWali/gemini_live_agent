
import React, { useMemo } from 'react';
import { KnowledgeGraphData, KnowledgeNode } from '../types';
import { Brain, User, Package, FileText, Info } from 'lucide-react';

interface KnowledgeGraphProps {
    data: KnowledgeGraphData;
    isDark: boolean;
}

const NodeIcon: React.FC<{ type: KnowledgeNode['type']; size?: number }> = ({ type, size = 16 }) => {
    switch (type) {
        case 'person': return <User size={size} className="text-sky-400" />;
        case 'project': return <Package size={size} className="text-amber-400" />;
        case 'fact': return <FileText size={size} className="text-emerald-400" />;
        case 'preference': return <Info size={size} className="text-violet-400" />;
        default: return <Brain size={size} />;
    }
};

const NeuralKnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ data, isDark }) => {
    const radius = 100;
    const centerX = 150;
    const centerY = 150;

    const nodesWithCoords = useMemo(() => {
        return data.nodes.map((node, index) => {
            const angle = (index / data.nodes.length) * 2 * Math.PI;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            return { ...node, x, y };
        });
    }, [data.nodes]);

    const links = useMemo(() => {
        return data.links.map((link, index) => {
            const source = nodesWithCoords.find(n => n.id === link.source);
            const target = nodesWithCoords.find(n => n.id === link.target);
            if (source && target) {
                return (
                    <line
                        key={`${link.source}-${link.target}-${index}`}
                        x1={source.x} y1={source.y}
                        x2={target.x} y2={target.y}
                        stroke={isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)'}
                        strokeWidth="1.5"
                        strokeDasharray="4 2"
                        className="animate-pulse"
                    />
                );
            }
            return null;
        });
    }, [nodesWithCoords, data.links, isDark]);

    return (
        <div className="space-y-6">
            <h3 className={`text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <Brain className="w-5 h-5 text-violet-400 shadow-[0_0_10px_rgba(139,92,246,0.3)]" /> Neural_Knowledge_Graph
            </h3>

            <div className={`p-6 rounded-[2.5rem] border ${isDark ? 'bg-black/50 border-white/5 shadow-2xl overflow-hidden' : 'bg-white border-slate-100 shadow-sm overflow-hidden'}`}>
                <div className="relative w-full aspect-square max-w-[300px] mx-auto overflow-hidden">
                    <svg viewBox="0 0 300 300" className="w-full h-full transform hover:scale-110 transition-transform duration-1000">
                        <defs>
                            <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="rgba(139, 92, 246, 0.4)" />
                                <stop offset="100%" stopColor="rgba(139, 92, 246, 0)" />
                            </radialGradient>
                        </defs>

                        {/* Links */}
                        <g>{links}</g>

                        {/* Nodes */}
                        {nodesWithCoords.map((node) => (
                            <g key={node.id} className="cursor-pointer group">
                                <circle
                                    cx={node.x} cy={node.y}
                                    r={10 + node.relevance * 6}
                                    fill="url(#nodeGlow)"
                                    className="animate-pulse opacity-40"
                                />
                                <circle
                                    cx={node.x} cy={node.y}
                                    r={5 + node.relevance * 3}
                                    fill={isDark ? '#1e1e1e' : '#f8fafc'}
                                    stroke={isDark ? 'rgba(139, 92, 246, 0.5)' : 'rgba(139, 92, 246, 0.3)'}
                                    strokeWidth="1"
                                    className="group-hover:stroke-violet-400 transition-all duration-300"
                                />
                                <foreignObject x={node.x - 8} y={node.y - 8} width="16" height="16">
                                    <div className="flex items-center justify-center h-full w-full">
                                        <NodeIcon type={node.type} size={10} />
                                    </div>
                                </foreignObject>

                                <text
                                    x={node.x} y={node.y + 20}
                                    textAnchor="middle"
                                    className={`text-[8px] font-black uppercase tracking-widest pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isDark ? 'fill-white' : 'fill-slate-700'}`}
                                >
                                    {node.label}
                                </text>
                            </g>
                        ))}

                        {/* Center Orbit */}
                        <circle cx={centerX} cy={centerY} r="10" className={`${isDark ? 'fill-violet-400/20' : 'fill-violet-100'} animate-pulse`} />
                        <Brain cx={centerX - 8} cy={centerY - 8} width="16" height="16" className="text-violet-500 opacity-80" />
                    </svg>
                </div>

                <p className={`mt-6 text-[9px] font-bold text-center tracking-[0.2em] leading-relaxed uppercase opacity-40 px-4 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                    Live Visual memory mapping based on long-term user behavior patterns.
                </p>
            </div>
        </div>
    );
};

export default NeuralKnowledgeGraph;
