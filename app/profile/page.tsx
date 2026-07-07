'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
    getUserReviewNotesAction,
    deleteReviewNoteAction,
    getStructureData
} from '../actions';
import { ROLE_NAMES, StructureData, compareChapters } from '../../lib/utils';
import { ReviewNote } from '../../lib/db';
import { User, Award, BookOpen, Clock, Trash2, Folder, ChevronDown, ChevronRight, Lock } from 'lucide-react';

export default function ProfilePage() {
    const { user } = useAuth();

    // States
    const [activeTab, setActiveTab] = useState<'stats' | 'notes'>('stats');
    const [notes, setNotes] = useState<ReviewNote[]>([]);
    const [structure, setStructure] = useState<StructureData | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedParts, setExpandedParts] = useState<{ [part: string]: boolean }>({});
    const [expandedChaps, setExpandedChaps] = useState<{ [chap: string]: boolean }>({});

    useEffect(() => {
        async function loadProfileData() {
            if (!user) return;
            try {
                const struct = await getStructureData();
                setStructure(struct);

                if (user.role === 'PRO' || user.role === 'ADMIN') {
                    const fetchedNotes = await getUserReviewNotesAction(user.id);
                    setNotes(fetchedNotes);
                }
            } catch (err) {
                console.error('프로필 세션 로드 중 에러:', err);
            } finally {
                setLoading(false);
            }
        }
        loadProfileData();
    }, [user]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center flex-grow py-20">
                <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-foreground/60 font-semibold text-sm">프로필 정보 구성 중...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="max-w-md mx-auto w-full p-8 text-center bg-card border border-card-border rounded-2xl shadow-xl">
                <h2 className="text-xl font-bold text-danger">⚠️ 로그인이 필요합니다.</h2>
                <p className="text-sm text-foreground/60 mt-2">이 페이지를 이용하시려면 홈 화면에서 로그인해주세요.</p>
            </div>
        );
    }

    const isPaidOrAdmin = user.role === 'PRO' || user.role === 'ADMIN';

    // Toggle Part collapse
    const togglePart = (part: string) => {
        setExpandedParts((prev) => ({ ...prev, [part]: !prev[part] }));
    };

    // Toggle Chapter collapse
    const toggleChap = (chap: string) => {
        setExpandedChaps((prev) => ({ ...prev, [chap]: !prev[chap] }));
    };

    const handleDeleteNote = async (noteId: number) => {
        if (!confirm('해당 오답 노트를 삭제하시겠습니까?')) return;
        const success = await deleteReviewNoteAction(noteId);
        if (success) {
            setNotes((prev) => prev.filter((note) => note.id !== noteId));
        } else {
            alert('오답노트 삭제에 실패했습니다.');
        }
    };

    // Prepare grouped notes hierarchy
    const getGroupedNotes = () => {
        const grouped: { [part: string]: { [chap: string]: ReviewNote[] } } = {};

        notes.forEach((note) => {
            // Find Part containing the chapter
            let notePart = '기타';
            let noteChap = note.chapter || '미분류';

            if (structure) {
                // Look up standard code or chapter
                const foundPart = Object.keys(structure.hierarchy).find((partName) => {
                    const chaps = structure.hierarchy[partName];
                    return Object.keys(chaps).some((chapName) => {
                        const fullName = structure.nameMap[chapName] || chapName;
                        return fullName === note.chapter || chapName === note.chapter;
                    });
                });
                if (foundPart) notePart = foundPart;
            }

            if (!grouped[notePart]) grouped[notePart] = {};
            if (!grouped[notePart][noteChap]) grouped[notePart][noteChap] = [];
            grouped[notePart][noteChap].push(note);
        });

        return grouped;
    };

    const groupedNotes = getGroupedNotes();
    const rawRoleName = ROLE_NAMES[user.role] || user.role;

    // Format model answer as Bullet HTML tags
    const renderModelAnswer = (mAns: any) => {
        if (!mAns) return <p className="text-foreground/40 italic">데이터 없음</p>;
        let list: string[] = [];

        if (Array.isArray(mAns)) {
            list = mAns;
        } else if (typeof mAns === 'string' && mAns.startsWith('[')) {
            try {
                const parsed = JSON.parse(mAns.replace(/'/g, '"'));
                if (Array.isArray(parsed)) list = parsed;
                else list = [mAns];
            } catch {
                list = [mAns];
            }
        } else {
            list = String(mAns).split('\n');
        }

        return (
            <ul className="list-disc list-inside space-y-1">
                {list.map((item, i) => (
                    <li key={i} className="text-sm font-medium text-success/90">{item}</li>
                ))}
            </ul>
        );
    };

    return (
        <div className="max-w-4xl mx-auto w-full space-y-8 py-4">
            {/* Profile Overview Card */}
            <div className="bg-card border border-card-border p-6 rounded-2xl shadow-lg flex flex-col md:flex-row items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                    <User className="w-12 h-12" />
                </div>
                <div className="flex-1 text-center md:text-left space-y-1">
                    <div className="flex flex-col md:flex-row md:items-center gap-2 justify-center md:justify-start">
                        <h2 className="text-2xl font-black text-foreground">{user.username}</h2>
                        <span className="px-3 py-0.5 bg-primary/20 text-primary border border-primary/20 rounded-full text-xs font-bold w-fit mx-auto md:mx-0">
                            Lv. {user.level}
                        </span>
                    </div>
                    <p className="text-sm text-foreground/50 font-semibold">
                        가입 등급: <span className="text-success">{rawRoleName}</span>
                    </p>
                    <div className="pt-2">
                        <div className="flex justify-between text-xs text-foreground/45 mb-1 max-w-sm">
                            <span>레벨 진행도</span>
                            <span>{user.exp % 100} / 100 EXP</span>
                        </div>
                        <div className="w-full h-3 bg-card-border rounded-full overflow-hidden max-w-sm">
                            <div
                                className="h-full bg-accent transition-all duration-500 rounded-full"
                                style={{ width: `${user.exp % 100}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Level Stats Badge */}
                <div className="border-t border-card-border/60 md:border-t-0 md:border-l md:pl-6 pt-4 md:pt-0 flex justify-around md:justify-start gap-8 w-full md:w-auto text-center">
                    <div className="space-y-1">
                        <span className="text-xs font-bold text-foreground/40 block">누적 경험치</span>
                        <span className="text-2xl font-black text-warning">{user.exp} EXP</span>
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs font-bold text-foreground/40 block">보관 오답노트</span>
                        <span className="text-2xl font-black text-accent">{isPaidOrAdmin ? notes.length : 0}개</span>
                    </div>
                </div>
            </div>

            {/* Tabs Menu */}
            <div className="flex border-b border-card-border">
                <button
                    onClick={() => setActiveTab('stats')}
                    className={`pb-3 px-6 text-sm font-extrabold border-b-2 transition-all cursor-pointer ${activeTab === 'stats'
                            ? 'border-accent text-accent'
                            : 'border-transparent text-foreground/40 hover:text-foreground/75'
                        }`}
                >
                    📊 학습 통계
                </button>
                <button
                    onClick={() => setActiveTab('notes')}
                    className={`pb-3 px-6 text-sm font-extrabold border-b-2 transition-all cursor-pointer ${activeTab === 'notes'
                            ? 'border-accent text-accent'
                            : 'border-transparent text-foreground/40 hover:text-foreground/75'
                        }`}
                >
                    📓 오답 노트 복습
                </button>
            </div>

            {/* Tab Context Container */}
            <div className="space-y-6">

                {/* TAB 1: Dashboard Stats */}
                {activeTab === 'stats' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Stat Box 1 */}
                        <div className="bg-card border border-card-border p-6 rounded-2xl space-y-4">
                            <h3 className="text-lg font-black text-foreground/75 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-accent" />
                                <span>영역별 학습 현황 요약</span>
                            </h3>

                            <div className="space-y-3.5">
                                <div className="bg-card-border/30 border border-card-border/50 p-4 rounded-xl">
                                    <div className="text-xs font-bold text-foreground/50">누적 평균 평가점수</div>
                                    <div className="text-3xl font-extrabold text-warning mt-1">
                                        {user.exp > 0 ? (Math.min(10, user.exp / Math.max(1, user.level))).toFixed(1) : '0.0'}{' '}
                                        <span className="text-sm font-normal text-foreground/45">/ 10.0 점</span>
                                    </div>
                                </div>

                                <div className="bg-card-border/30 border border-card-border/50 p-4 rounded-xl">
                                    <div className="text-xs font-bold text-foreground/50">학습 활동 상태</div>
                                    <div className="text-base font-extrabold text-success mt-1 flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 bg-success rounded-full animate-ping"></span>
                                        <span>활동 중 (Active)</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stat Box 2 */}
                        <div className="bg-card border border-card-border p-6 rounded-2xl flex flex-col justify-between">
                            <div>
                                <h3 className="text-lg font-black text-foreground/75 flex items-center gap-2 mb-3">
                                    <Clock className="w-5 h-5 text-accent" />
                                    <span>학습 동기부여</span>
                                </h3>
                                <p className="text-sm text-foreground/70 leading-relaxed font-semibold">
                                    CPA 회계감사 과목은 세부적인 기준문구의 논리를 정확히 서술하는 능력이 생명입니다. AI 채점위원의 피드백을 수용하며 부족한 부분을 반복적으로 다듬어 완벽한 검토능력을 장착해 보세요!
                                </p>
                            </div>

                            <div className="p-4 bg-primary/10 border border-primary/20 text-primary rounded-xl text-xs font-semibold leading-relaxed mt-4">
                                🔥 문제를 꾸준히 해결할수록 등급 경험치가 누적되어 랭킹의 상위권을 노릴 수 있습니다.
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: Notes Review */}
                {activeTab === 'notes' && (
                    <div className="space-y-4">
                        {!isPaidOrAdmin ? (
                            <div className="bg-card border border-card-border rounded-2xl p-8 text-center space-y-4">
                                <Lock className="w-12 h-12 text-warning/60 mx-auto" />
                                <h3 className="text-lg font-bold text-foreground/80">🔒 오답 노트 권한이 없습니다.</h3>
                                <p className="text-sm text-foreground/50 max-w-md mx-auto">
                                    오답 노트 영구보관 기능은 **등록공인회계사(PRO)** 및 **관리자(ADMIN)** 전용 혜택입니다.
                                </p>
                            </div>
                        ) : notes.length === 0 ? (
                            <div className="bg-card border border-card-border rounded-2xl p-12 text-center text-foreground/50 font-bold space-y-2">
                                <Folder className="w-12 h-12 mx-auto text-foreground/25" />
                                <p className="text-sm">현재 보관된 오답노트 문항이 없습니다.</p>
                                <p className="text-xs font-normal text-foreground/35">문제 풀기 종료 시 채점 피드백 화면에서 '오답노트에 수동 저장' 버튼이나 5점 이하 시 자동 저장을 진행하세요.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {Object.keys(groupedNotes).map((partName) => {
                                    const partExpanded = expandedParts[partName];
                                    const chaps = groupedNotes[partName];

                                    return (
                                        <div key={partName} className="bg-card border border-card-border rounded-2xl shadow-md overflow-hidden">
                                            {/* Part Header */}
                                            <button
                                                onClick={() => togglePart(partName)}
                                                className="w-full px-5 py-4 bg-card-border/30 border-b border-card-border/50 hover:bg-card-border/50 transition-colors flex items-center justify-between text-left cursor-pointer"
                                            >
                                                <span className="font-extrabold text-foreground flex items-center gap-2">
                                                    <Folder className="w-5 h-5 text-accent" />
                                                    <span>{partName}</span>
                                                </span>
                                                {partExpanded ? (
                                                    <ChevronDown className="w-5 h-5 text-foreground/60" />
                                                ) : (
                                                    <ChevronRight className="w-5 h-5 text-foreground/60" />
                                                )}
                                            </button>

                                            {/* Part Chapters */}
                                            {partExpanded && (
                                                <div className="p-5 space-y-4 divide-y divide-card-border/40">
                                                    {Object.keys(chaps).sort(compareChapters).map((chapName, cIdx) => {
                                                        const chapExpanded = expandedChaps[chapName];
                                                        const listNotes = chaps[chapName];

                                                        return (
                                                            <div key={chapName} className={`${cIdx > 0 ? 'pt-4' : ''} space-y-2`}>
                                                                <button
                                                                    onClick={() => toggleChap(chapName)}
                                                                    className="w-full flex items-center gap-2 text-sm font-bold text-foreground/80 hover:text-foreground transition-colors cursor-pointer text-left"
                                                                >
                                                                    {chapExpanded ? (
                                                                        <ChevronDown className="w-4 h-4 text-accent" />
                                                                    ) : (
                                                                        <ChevronRight className="w-4 h-4 text-accent" />
                                                                    )}
                                                                    <span>{chapName}</span>
                                                                    <span className="px-2 py-0.5 bg-card-border rounded-full text-[10px] font-bold">
                                                                        {listNotes.length}개
                                                                    </span>
                                                                </button>

                                                                {chapExpanded && (
                                                                    <div className="pl-6 space-y-4 mt-3">
                                                                        {listNotes.map((note) => (
                                                                            <div
                                                                                key={note.id}
                                                                                className="bg-[#2e3440]/70 border border-card-border/70 rounded-xl p-4 space-y-3 relative group"
                                                                            >
                                                                                {/* Delete Button */}
                                                                                <button
                                                                                    onClick={() => handleDeleteNote(note.id)}
                                                                                    className="absolute top-4 right-4 p-1.5 bg-danger/10 hover:bg-danger/25 text-danger border border-danger/20 rounded-lg opacity-80 md:opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                                                                    title="삭제"
                                                                                >
                                                                                    <Trash2 className="w-4 h-4" />
                                                                                </button>

                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-xs uppercase font-extrabold text-foreground/45">
                                                                                        [{note.standard_code || '감사기준'}]
                                                                                    </span>
                                                                                    <span className="px-2 py-0.5 bg-warning/15 text-warning border border-warning/10 rounded text-[10px] font-bold">
                                                                                        기록 점수: {note.score}점
                                                                                    </span>
                                                                                </div>

                                                                                <p className="text-sm font-bold text-foreground">
                                                                                    Q. {note.question_description}
                                                                                </p>

                                                                                {/* User answer segment */}
                                                                                <div className="bg-[#434c5e] p-3 rounded-lg border border-card-border/40 text-sm">
                                                                                    <span className="text-xs text-foreground/45 font-bold block mb-1">✍️ 내 서술 답안</span>
                                                                                    <div className="text-foreground/90 font-medium whitespace-pre-wrap">
                                                                                        {note.user_answer || '(답안 기재되지 않음)'}
                                                                                    </div>
                                                                                </div>

                                                                                {/* Model answer segment */}
                                                                                <div className="bg-success/5 border-l-4 border-success p-3 rounded-r-lg text-sm">
                                                                                    <span className="text-xs text-success font-bold block mb-1">✅ 모범 가이드</span>
                                                                                    {renderModelAnswer(note.model_answer)}
                                                                                </div>

                                                                                {/* Explanation segment */}
                                                                                {note.explanation && (
                                                                                    <div className="p-3 bg-secondary/5 border-l-4 border-primary rounded-r-lg text-sm">
                                                                                        <span className="text-xs text-primary font-bold block mb-1">💡 해설</span>
                                                                                        <p className="text-foreground/80 font-medium leading-relaxed">{note.explanation}</p>
                                                                                    </div>
                                                                                )}

                                                                                <div className="text-[10px] text-foreground/35 font-semibold text-right pt-1">
                                                                                    저장일: {new Date(note.created_at || '').toLocaleDateString('ko-KR')}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}
