import { Trophy } from "lucide-react";
import { Badge } from "./Badge";
import type { RankingRow } from "../types";

interface RankingTableProps {
  rankings: RankingRow[];
  onAgentClick?: (agentCode: string) => void;
}

export function RankingTable({ rankings, onAgentClick }: RankingTableProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
      <table className="w-full">
        <thead className="bg-black/40 border-b border-white/10">
          <tr className="hover:bg-transparent border-white/10">
            <th className="w-20 text-center font-bold text-zinc-300 py-3">Pos.</th>
            <th className="font-bold text-zinc-300 py-3 text-left">Agente</th>
            <th className="font-bold text-zinc-300 py-3 text-left">Time / Função</th>
            <th className="text-center font-bold text-zinc-300 py-3">Amostra</th>
            <th className="text-center font-bold text-zinc-300 py-3">Score</th>
            <th className="text-right pr-4 font-bold text-zinc-300 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {rankings.map((row) => (
            <tr 
              key={row.id} 
              className="hover:bg-white/[0.04] transition-colors border-white/5 cursor-pointer"
              onClick={() => onAgentClick?.(row.agent?.code || '')}
            >
              <td className="text-center font-medium py-4">
                {row.rankPosition === 1 ? (
                  <div className="flex justify-center"><Trophy size={20} className="text-yellow-400" /></div>
                ) : row.rankPosition === 2 ? (
                  <div className="flex justify-center"><Trophy size={20} className="text-zinc-300" /></div>
                ) : row.rankPosition === 3 ? (
                  <div className="flex justify-center"><Trophy size={20} className="text-amber-600" /></div>
                ) : (
                  <span className="text-zinc-500">#{row.rankPosition}</span>
                )}
              </td>
              <td className="font-medium text-white py-4">
                <div className="flex flex-col">
                  <span>{row.agent?.displayName}</span>
                  <span className="text-xs text-zinc-500 font-normal">{row.agent?.code}</span>
                </div>
              </td>
              <td className="py-4">
                <div className="text-sm text-zinc-300">ID Time: {row.agent?.owningTeamId || "Sem Squad"}</div>
                <div className="text-xs text-zinc-500">ID Função: {row.agent?.primaryFunctionId || "Genérica"}</div>
              </td>
              <td className="text-center text-zinc-400 py-4">
                {row.sampleSize}
              </td>
              <td className="text-center py-4">
                <Badge variant={row.operationalBand as 'green' | 'yellow' | 'orange' | 'red'}>
                  {row.scoreValue.toFixed(1)}
                </Badge>
              </td>
              <td className="text-right pr-4 py-4">
                <button className="inline-flex items-center justify-center p-2 text-zinc-500 hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
