'use client';

import React, { useEffect, useState } from 'react';
import { getLeaderboardAction } from '../actions';
import { ROLE_NAMES } from '../../lib/utils';
import { Trophy, Medal, Star, ShieldAlert } from 'lucide-react';

interface LeaderboardUser {
    id: string;
    username: string;
    role: 'MEMBER' | 'ADMIN' | 'PRO' | 'GUEST';
    level: number;
    exp: number;
}

export default function RankingPage() {
    const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadLeaderboard() {
            try {
                const data = await getLeaderboardAction();
                setLeaderboard(data as LeaderboardUser[]);
            } catch (err) {
                console.error('랭킹 로드 오류:', err);
            } finally {
                setLoading(false);
            }
        }
        loadLeaderboard();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center flex-grow py-20">
                <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-foreground/60 font-semibold text-sm">리더보드 집계 중...</p>
            </div>
        );
    }

    // Segment podium (Top 3) and runners up (Rest)
    const podium = leaderboard.slice(0, 3);
    const runnersUp = leaderboard.slice(3);

    // Position colors and icons for podium
    const getPodiumStyle = (index: number) => {
        switch (index) {
            case 0: // 1st
                return {
                    bg: 'bg-gradient-to-br from-yellow-500/10 to-yellow-600/25 border-yellow-500/40',
                    text: 'text-yellow-400',
                    badge: '🥇 1등',
                    shadow: 'shadow-yellow-500/5',
                };
            case 1: // 2nd
                return {
                    bg: 'bg-gradient-to-br from-slate-400/10 to-slate-400/25 border-slate-400/30',
                    text: 'text-slate-300',
                    badge: '🥈 2등',
                    shadow: 'shadow-slate-400/5',
                };
            case 2: // 3rd
                return {
                    bg: 'bg-gradient-to-br from-amber-600/10 to-amber-700/25 border-amber-600/35',
                    text: 'text-amber-500',
                    badge: '🥉 3등',
                    shadow: 'shadow-amber-600/5',
                };
            default:
                return { bg: '', text: '', badge: '', shadow: '' };
        }
    };

    return (
        <div className="max-w-4xl mx-auto w-full space-y-8 py-4">
            {/* Title */}
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-black flex items-center justify-center gap-2">
                    <Trophy className="w-8 h-8 text-warning animate-bounce" />
                    <span>명예의 전당 (Leaderboard)</span>
                </h1>
                <p className="text-sm text-foreground/60 font-medium">
                    누적 감사 학습 경험치(EXP) 상위 10명의 회원 랭킹입니다.
                </p>
            </div>

            {leaderboard.length === 0 ? (
                <div className="bg-card border border-card-border p-12 rounded-2xl text-center space-y-3">
                    <ShieldAlert className="w-12 h-12 text-foreground/35 mx-auto" />
                    <h3 className="text-lg font-bold text-foreground/70">리더보드가 비어 있습니다.</h3>
                    <p className="text-sm text-foreground/50">가장 먼저 가입하여 첫 번째 랭커가 되세요!</p>
                </div>
            ) : (
                <>
                    {/* Top 3 Podium layout */}
                    {podium.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                            {/* Render 2nd, 1st, 3rd logic for visually pleasing desktop layout */}
                            {[1, 0, 2].map((idx) => {
                                const userItem = podium[idx];
                                if (!userItem) return null;
                                const style = getPodiumStyle(idx);
                                const roleName = ROLE_NAMES[userItem.role] || userItem.role;

                                return (
                                    <div
                                        key={userItem.id}
                                        className={`border ${style.bg} rounded-2xl p-6 flex flex-col items-center text-center shadow-lg relative ${style.shadow} ${idx === 0 ? 'md:-translate-y-4 md:scale-105 border-l-4 border-r-4' : ''
                                            }`}
                                    >
                                        {/* Badge */}
                                        <span className="absolute top-4 left-4 text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#2e3440]/60 border border-card-border text-foreground/80">
                                            {style.badge}
                                        </span>

                                        {/* Medal/Trophy Icon */}
                                        <div className="w-16 h-16 bg-[#2e3440] border border-card-border rounded-full flex items-center justify-center mb-4 mt-2 shadow-inner">
                                            {idx === 0 ? (
                                                <Trophy className="w-8 h-8 text-yellow-400" />
                                            ) : (
                                                <Medal className={`w-8 h-8 ${style.text}`} />
                                            )}
                                        </div>

                                        <h3 className="text-xl font-bold">{userItem.username}</h3>
                                        <p className="text-xs text-foreground/50 mt-1 font-semibold">{roleName}</p>

                                        <div className="mt-4 pt-3 border-t border-card-border/60 w-full flex justify-around text-sm">
                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-foreground/42 block">레벨</span>
                                                <span className="font-extrabold text-foreground/90">Lv.{userItem.level}</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-foreground/42 block">경험치</span>
                                                <span className="font-extrabold text-warning">{userItem.exp} EXP</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Runners Up Table */}
                    {runnersUp.length > 0 && (
                        <div className="bg-card border border-card-border rounded-2xl overflow-hidden shadow-lg mt-8">
                            <div className="p-4 bg-card-border/30 border-b border-card-border">
                                <h3 className="text-sm font-bold text-foreground/75 flex items-center gap-1.5">
                                    <Star className="w-4 h-4 text-accent" />
                                    <span>학습자 순위 (4위 ~ 10위)</span>
                                </h3>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead>
                                        <tr className="bg-card-border/10 border-b border-card-border text-xs uppercase tracking-wider text-foreground/45 font-extrabold">
                                            <th className="px-6 py-3.5 text-center">순위</th>
                                            <th className="px-6 py-3.5">학습자명</th>
                                            <th className="px-6 py-3.5">등급</th>
                                            <th className="px-6 py-3.5">레벨</th>
                                            <th className="px-6 py-3.5 text-right">경험치</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-card-border">
                                        {runnersUp.map((userItem, index) => {
                                            const roleName = ROLE_NAMES[userItem.role] || userItem.role;
                                            return (
                                                <tr key={userItem.id} className="hover:bg-card-border/30 transition-colors">
                                                    <td className="px-6 py-4 text-center font-bold text-foreground/50">
                                                        {index + 4}위
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-foreground/90">
                                                        {userItem.username}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-semibold text-foreground/60">
                                                        {roleName}
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-foreground/80">
                                                        Lv.{userItem.level}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-black text-warning">
                                                        {userItem.exp} EXP
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
