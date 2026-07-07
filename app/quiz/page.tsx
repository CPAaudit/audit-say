'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import {
    getStructureData,
    getNormalizedQuestions,
    gradeQuizBatch,
    saveQuizNoteAction,
    updateUserProgressAction
} from '../actions';
import {
    StructureData,
    getCounts,
    getQuizSet,
    compareChapters,
    compareStandards,
    calculateMatchedCount,
    ROLE_NAMES
} from '../../lib/utils';
import { AuditQuestion } from '../../lib/db';
import { ArrowLeft, ArrowRight, Home, RefreshCw, CheckCircle, AlertTriangle, HelpCircle } from 'lucide-react';

type AppState = 'LOADING' | 'SETUP' | 'SOLVING' | 'REVIEW';

// Nice Archery Target SVG component to replace matplotlib draw_target
const TargetChart: React.FC<{ score: number }> = ({ score }) => {
    // Translate score 0-10 -> distance from center (0 is bullseye, 100 is complete miss)
    const distance = Math.max(0, (10 - score) * 9.5); // 0 to 95 px radius
    const [angle, setAngle] = useState(0);

    useEffect(() => {
        // Generate a random angle on load to scatter the arrow shot
        setAngle(Math.random() * 2 * Math.PI);
    }, [score]);

    // Coordinates
    const x = 100 + distance * Math.cos(angle);
    const y = 100 + distance * Math.sin(angle);

    // Archery target ring colors (outer to inner): White, Black, Blue, Red, Gold
    const rings = [
        { r: 95, color: '#E5E9F0', stroke: '#D8DEE9' }, // White outer
        { r: 76, color: '#E5E9F0', stroke: '#D8DEE9' },
        { r: 57, color: '#2E3440', stroke: '#4C566A' }, // Black
        { r: 38, color: '#434C5E', stroke: '#4C566A' },
        { r: 19, color: '#81A1C1', stroke: '#5E81AC' }, // Blue
        { r: 9.5, color: '#5E81AC', stroke: '#5E81AC' },
        { r: 6.5, color: '#BF616A', stroke: '#D08770' }, // Red
    ];

    return (
        <div className="w-52 h-52 mx-auto relative bg-[#2e3440] p-2 rounded-2xl border border-card-border shadow-inner">
            <svg viewBox="0 0 200 200" className="w-full h-full">
                {/* Draw target circles */}
                <circle cx="100" cy="100" r="95" fill="#E5E9F0" stroke="#D8DEE9" strokeWidth="1" />
                <circle cx="100" cy="100" r="76" fill="#E5E9F0" stroke="#D8DEE9" strokeWidth="1" />
                <circle cx="100" cy="100" r="57" fill="#2E3440" stroke="#4C566A" strokeWidth="1" />
                <circle cx="100" cy="100" r="38" fill="#2E3440" stroke="#4C566A" strokeWidth="1" />
                <circle cx="100" cy="100" r="28" fill="#88C0D0" stroke="#5E81AC" strokeWidth="1" />
                <circle cx="100" cy="100" r="19" fill="#5E81AC" stroke="#5E81AC" strokeWidth="1" />
                <circle cx="100" cy="100" r="12" fill="#BF616A" stroke="#BF616A" strokeWidth="1" />
                <circle cx="100" cy="100" r="6" fill="#EBCB8B" stroke="#D08770" strokeWidth="1" />
                <circle cx="100" cy="100" r="2" fill="#EBCB8B" />

                {/* Crosshair grid lines */}
                <line x1="100" y1="5" x2="100" y2="195" stroke="#4C566A" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="5" y1="100" x2="195" y2="100" stroke="#4C566A" strokeWidth="0.5" strokeDasharray="3,3" />

                {/* Hit marker "X" */}
                <g transform={`translate(${x}, ${y})`}>
                    <line x1="-6" y1="-6" x2="6" y2="6" stroke="#A3BE8C" strokeWidth="3" />
                    <line x1="6" y1="-6" x2="-6" y2="6" stroke="#A3BE8C" strokeWidth="3" />
                    <circle cx="0" cy="0" r="2" fill="#2E3440" />
                </g>
            </svg>
        </div>
    );
};

export default function QuizPage() {
    const router = useRouter();
    const { user, refreshProfile } = useAuth();

    // States
    const [appState, setAppState] = useState<AppState>('LOADING');
    const [structure, setStructure] = useState<StructureData | null>(null);
    const [dbData, setDbData] = useState<AuditQuestion[]>([]);
    const [solvedQuestions, setSolvedQuestions] = useState<Set<string>>(new Set());

    // Selection States
    const [selectedPart, setSelectedPart] = useState('');
    const [selectedChapter, setSelectedChapter] = useState('전체');
    const [selectedStandard, setSelectedStandard] = useState('전체');
    const [selectedCount, setSelectedCount] = useState<number>(1);
    const [maxSelectableQuestions, setMaxSelectableQuestions] = useState(3);

    // Quiz Active States
    const [quizList, setQuizList] = useState<AuditQuestion[]>([]);
    const [answers, setAnswers] = useState<{ [title: string]: string }>({});
    const [results, setResults] = useState<any[]>([]);
    const [reviewIdx, setReviewIdx] = useState(0);
    const [gradingProgress, setGradingProgress] = useState(false);
    const [gradingMessage, setGradingMessage] = useState('');
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    // Load structure and DB data
    useEffect(() => {
        async function loadData() {
            try {
                const structData = await getStructureData();
                const questions = await getNormalizedQuestions();
                setStructure(structData);
                setDbData(questions);

                // Select first part by default
                const parts = Object.keys(structData.hierarchy).sort();
                if (parts.length > 0) {
                    setSelectedPart(parts[0]);
                }
                setAppState('SETUP');
            } catch (err) {
                console.error('데이터 로그 에러:', err);
            }
        }
        loadData();
    }, []);

    const counts = getCounts(dbData);

    // Handle standard dropdown change when Part/Chapter changes
    const getChapterOptions = () => {
        if (!structure || !selectedPart) return [];
        return ['전체', ...Object.keys(structure.hierarchy[selectedPart]).sort(compareChapters)];
    };

    const getStandardOptions = () => {
        if (!structure || !selectedPart) return [];
        if (selectedChapter === '전체') {
            const stdSet = new Set<string>();
            const chaps = structure.hierarchy[selectedPart];
            for (const c of Object.keys(chaps)) {
                chaps[c].forEach((s) => stdSet.add(s));
            }
            return ['전체', ...Array.from(stdSet).sort(compareStandards)];
        } else {
            return ['전체', ...(structure.hierarchy[selectedPart][selectedChapter] || []).sort(compareStandards)];
        }
    };

    // Adjust max selectable questions based on user roles
    useEffect(() => {
        if (!user) return;
        if (user.role === 'GUEST' || user.role === 'MEMBER') {
            setMaxSelectableQuestions(3);
            if (selectedCount > 3) setSelectedCount(3);
        } else {
            // PRO or ADMIN
            setMaxSelectableQuestions(9999);
        }
    }, [user]);

    const handleStartQuiz = () => {
        // Map chapter short code to full name for matching
        const targetChap = selectedChapter !== '전체' && structure
            ? (structure.nameMap[selectedChapter] || selectedChapter)
            : '전체';

        const quizSet = getQuizSet(
            dbData,
            selectedPart,
            targetChap,
            selectedStandard,
            selectedCount,
            Array.from(solvedQuestions)
        );

        if (quizSet.length === 0) {
            alert('조건에 맞는 문제가 없습니다. (또는 이미 다 푸셨습니다)');
            return;
        }

        setQuizList(quizSet);
        const initialAnswers: { [title: string]: string } = {};
        quizSet.forEach((q) => {
            initialAnswers[q.question_title] = '';
        });
        setAnswers(initialAnswers);
        setAppState('SOLVING');
    };

    const handleAnswerSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setGradingProgress(true);
        setGradingMessage('키워드 매칭 및 AI 채점 시작...');

        const batchItems: any[] = [];
        const evaluationResults: any[] = new Array(quizList.length).fill(null);

        // 1. Keyword check
        quizList.forEach((q, idx) => {
            const ans = answers[q.question_title] || '';
            if (!ans.trim()) {
                evaluationResults[idx] = {
                    q,
                    ans,
                    eval: { score: 0.0, evaluation: '답안을 입력해주세요.' }
                };
            } else {
                const keywords = q.keywords || [];
                const matched = calculateMatchedCount(ans, keywords);

                if (matched < 3) {
                    evaluationResults[idx] = {
                        q,
                        ans,
                        eval: {
                            score: 0.0,
                            evaluation: `핵심 키워드 부족 (3개 미만 감지됨: ${matched}개). 아래 필수 키워드가 답안에 적절히 서술되었는지 확인하며 조금 더 구체적으로 작성해 주세요.\n\n*필수 키워드 가이드: ${keywords.join(', ')}*`
                        }
                    };
                } else {
                    // Model answer stringification
                    const mAns = q.model_answer;
                    const mStr = Array.isArray(mAns) ? mAns.join('\n') : String(mAns);

                    batchItems.push({
                        id: idx,
                        q: `${q.question_title} - ${q.question_description}`,
                        a: ans,
                        m: mStr,
                        k: keywords,
                        r: q.explanation || '참고 설명 없음'
                    });
                }
            }
        });

        // 2. Call server side AI grading
        if (batchItems.length > 0) {
            setGradingMessage('AI가 답안지의 인과관계 및 전문 용어 사용을 채점하는 중...');
            try {
                const apiResults = await gradeQuizBatch(batchItems);

                batchItems.forEach((item) => {
                    const idx = item.id;
                    const res = apiResults[idx];
                    evaluationResults[idx] = {
                        q: quizList[idx],
                        ans: item.a,
                        eval: res || { score: 0.0, evaluation: '⚠️ 채점 서버 오류가 발생했습니다.' }
                    };
                });
            } catch (err: any) {
                console.error('Grading err:', err);
                batchItems.forEach((item) => {
                    const idx = item.id;
                    evaluationResults[idx] = {
                        q: quizList[idx],
                        ans: item.a,
                        eval: { score: 0.0, evaluation: `오류 발생: ${err.message || String(err)}` }
                    };
                });
            }
        }

        // 3. Save progress for Non-guests
        if (user.role !== 'GUEST') {
            setGradingMessage('학습 경력 업데이트 중...');
            // Save low score notes (<= 5.0) automatically for PRO or ADMIN
            for (const r of evaluationResults) {
                if ((user.role === 'PRO' || user.role === 'ADMIN') && r.eval.score <= 5.0) {
                    await saveQuizNoteAction(user.id, r.q.question_title, r.ans, r.eval.score);
                }
            }

            // Exp and Level calculations
            const totalScore = evaluationResults.reduce((acc, curr) => acc + curr.eval.score, 0);
            const newExp = user.exp + totalScore;
            const newLevel = 1 + Math.floor(newExp / 100);

            await updateUserProgressAction(user.id, newLevel, newExp);
            await refreshProfile();
        }

        // Mark as solved in this session
        const updatedSolved = new Set(solvedQuestions);
        quizList.forEach((q) => updatedSolved.add(q.question_title));
        setSolvedQuestions(updatedSolved);

        setResults(evaluationResults);
        setReviewIdx(0);
        setGradingProgress(false);
        setAppState('REVIEW');
    };

    const handleSaveReportNote = async () => {
        if (!user || user.role === 'GUEST') return;
        const currentRes = results[reviewIdx];

        const success = await saveQuizNoteAction(
            user.id,
            currentRes.q.question_title,
            currentRes.ans,
            currentRes.eval.score
        );

        if (success) {
            setToastMsg('오답노트에 성공적으로 저장되었습니다!');
            setTimeout(() => setToastMsg(null), 3000);
        } else {
            alert('오답노트 저장 실패 (로그 서버를 참고해 주세요)');
        }
    };

    const handleRetrySetup = () => {
        setAppState('SETUP');
    };

    const handleRetrySameConfig = () => {
        handleStartQuiz();
    };

    // --- Loader View ---
    if (appState === 'LOADING') {
        return (
            <div className="flex flex-col items-center justify-center flex-grow py-24">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-foreground/75 font-semibold text-sm">과목 설정 및 기출 문제 데이터베이스 로드 중...</p>
            </div>
        );
    }

    // --- 1. SETUP STATE ---
    if (appState === 'SETUP') {
        const chapterOpts = getChapterOptions();
        const standardOpts = getStandardOptions();
        const isGuest = user?.role === 'GUEST';
        const isMember = user?.role === 'MEMBER';

        return (
            <div className="max-w-2xl mx-auto w-full bg-card border border-card-border rounded-2xl shadow-xl p-6 md:p-8 space-y-6">
                <h1 className="text-3xl font-black text-center mb-6">📝 문제 풀기 설정</h1>

                {isGuest && (
                    <div className="p-3.5 bg-primary/10 border border-primary/20 text-primary rounded-xl text-xs font-semibold leading-relaxed">
                        👋 현재 비회원 모드입니다. 학습 기록 및 오답노트 보관은 불가합니다.
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Part Selection */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-foreground/50 mb-1">
                            Part 선택
                        </label>
                        <select
                            value={selectedPart}
                            onChange={(e) => {
                                setSelectedPart(e.target.value);
                                setSelectedChapter('전체');
                                setSelectedStandard('전체');
                            }}
                            className="w-full bg-card-border border border-card-border focus:border-accent text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors"
                        >
                            {Object.keys(structure?.hierarchy || {}).sort().map((part) => (
                                <option key={part} value={part}>
                                    {part} ({counts.parts[part] || 0})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Chapter Selection */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-foreground/50 mb-1">
                            Chapter 선택
                        </label>
                        <select
                            value={selectedChapter}
                            onChange={(e) => {
                                setSelectedChapter(e.target.value);
                                setSelectedStandard('전체');
                            }}
                            className="w-full bg-card-border border border-card-border focus:border-accent text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors"
                        >
                            {chapterOpts.map((chap) => {
                                let display = chap;
                                if (chap !== '전체' && structure) {
                                    const fullName = structure.nameMap[chap] || chap;
                                    const cCount = counts.chapters[fullName] || counts.chapters[chap] || 0;
                                    display = `${fullName} (${cCount})`;
                                }
                                return (
                                    <option key={chap} value={chap}>
                                        {display}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {/* Standard Selection */}
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-foreground/50 mb-1">
                            회계감사기준 (Standard) 선택
                        </label>
                        <select
                            value={selectedStandard}
                            onChange={(e) => setSelectedStandard(e.target.value)}
                            className="w-full bg-card-border border border-card-border focus:border-accent text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors"
                        >
                            {standardOpts.map((std) => (
                                <option key={std} value={std}>
                                    {std === '전체' ? '전체' : `${std} (${counts.standards[std] || 0})`}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Difficulty Access Restriction */}
                <div className="border-t border-card-border pt-4">
                    <h3 className="text-sm font-bold text-foreground/75 mb-2">문항 수 설정</h3>

                    {(isGuest || isMember) && (
                        <p className="text-xs text-foreground/50 mb-3 flex items-center gap-1">
                            <HelpCircle className="w-3.5 h-3.5 text-primary" />
                            <span>현재 등급({ROLE_NAMES[user?.role || 'GUEST']})은 중급(3문제)까지만 제한 없이 선택 가능합니다.</span>
                        </p>
                    )}

                    <div className="grid grid-cols-3 gap-3">
                        {[1, 3, 5].map((cnt) => {
                            const disabled = cnt > 3 && (isGuest || isMember);
                            const label = cnt === 1 ? '초급 (1문제)' : cnt === 3 ? '중급 (3문제)' : '고급 (5문제)';

                            return (
                                <button
                                    key={cnt}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => setSelectedCount(cnt)}
                                    className={`py-3 rounded-lg border text-sm font-bold transition-all cursor-pointer ${disabled
                                        ? 'border-card-border text-foreground/20 cursor-not-allowed bg-card-border/20'
                                        : selectedCount === cnt
                                            ? 'border-accent bg-accent/15 text-accent shadow-md shadow-accent/5'
                                            : 'border-card-border text-foreground/70 hover:bg-card-border/50'
                                        }`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <button
                    onClick={handleStartQuiz}
                    className="w-full py-3.5 bg-primary hover:bg-primary-hover text-foreground font-extrabold rounded-lg shadow-lg shadow-primary/20 transition-all text-base cursor-pointer"
                >
                    문제 풀기 시작 🚀
                </button>
            </div>
        );
    }

    // --- 2. SOLVING STATE ---
    if (appState === 'SOLVING') {
        return (
            <div className="max-w-3xl mx-auto w-full space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-black">📝 실증 감사 주관식 작성</h1>
                    <span className="px-3 py-1 bg-card-border border border-card-border text-foreground/70 rounded-full text-xs font-bold">
                        총 {quizList.length}문항
                    </span>
                </div>

                {gradingProgress ? (
                    <div className="bg-card border border-card-border rounded-2xl p-12 flex flex-col items-center justify-center space-y-4">
                        <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                        <h3 className="text-lg font-extrabold text-foreground">{gradingMessage}</h3>
                        <p className="text-sm text-foreground/50">Gemini 2.5 AI 채점 위원이 답안을 공정하게 분석 중입니다. 잠시만 기다려주세요.</p>
                    </div>
                ) : (
                    <form onSubmit={handleAnswerSubmit} className="space-y-6">
                        {quizList.map((q, idx) => (
                            <div key={q.question_title} className="bg-card border border-card-border rounded-xl p-5 space-y-4 shadow-md">
                                <div className="flex items-start justify-between gap-4">
                                    <span className="px-2.5 py-1 bg-accent/25 text-accent border border-accent/20 rounded-lg text-xs font-bold">
                                        Q{idx + 1}. {q.question_title}
                                    </span>
                                </div>

                                <div className="p-4 bg-card-border/30 border border-card-border rounded-xl text-sm leading-relaxed text-foreground/90 font-medium whitespace-pre-wrap">
                                    {q.question_description}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-foreground/50 mb-1.5 uppercase tracking-wider">
                                        답안 작성
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={answers[q.question_title] || ''}
                                        onChange={(e) => setAnswers({ ...answers, [q.question_title]: e.target.value })}
                                        placeholder="인과관계(감사절차-결과/대응)를 명확히 작성하고 회계감사 전문 용어를 올바르게 활용하여 기재해주세요."
                                        className="w-full bg-card-border border border-card-border focus:border-accent text-foreground rounded-lg p-3 text-sm focus:outline-none transition-colors"
                                        required
                                    />
                                </div>
                            </div>
                        ))}

                        <button
                            type="submit"
                            className="w-full py-4 bg-primary hover:bg-primary-hover text-foreground font-black rounded-xl shadow-lg shadow-primary/25 transition-all text-base cursor-pointer"
                        >
                            제출 및 AI 채점 &rarr;
                        </button>
                    </form>
                )}
            </div>
        );
    }

    // --- 3. REVIEW STATE ---
    if (appState === 'REVIEW') {
        const currentRes = results[reviewIdx];
        if (!currentRes) return null;

        const qData = currentRes.q;
        const uAns = currentRes.ans;
        const evalData = currentRes.eval;
        const isLast = reviewIdx === results.length - 1;
        const isFirst = reviewIdx === 0;

        return (
            <div className="max-w-4xl mx-auto w-full space-y-6">

                {/* Navigation header */}
                <div className="flex items-center justify-between bg-card border border-card-border p-4 rounded-xl shadow-md">
                    <button
                        onClick={() => setReviewIdx(reviewIdx - 1)}
                        disabled={isFirst}
                        className="p-2 border border-card-border bg-card-border/40 hover:bg-card-border rounded-lg text-foreground/75 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>

                    <h4 className="text-sm md:text-base font-extrabold text-foreground">
                        감사답안 피드백 (과제 {reviewIdx + 1} / {results.length})
                    </h4>

                    <button
                        onClick={() => setReviewIdx(reviewIdx + 1)}
                        disabled={isLast}
                        className="p-2 border border-card-border bg-card-border/40 hover:bg-card-border rounded-lg text-foreground/75 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Global Success Notification */}
                {toastMsg && (
                    <div className="p-3 bg-success/15 border border-success/30 text-success text-sm font-bold text-center rounded-lg animate-bounce">
                        {toastMsg}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Detailed analysis logs */}
                    <div className="md:col-span-2 space-y-6">

                        {/* Question Card */}
                        <div className="bg-card border border-card-border rounded-xl p-5 space-y-2.5">
                            <span className="text-xs text-accent font-bold">문제 내역</span>
                            <p className="text-sm font-semibold text-foreground/95 bg-card-border/30 border border-card-border p-3.5 rounded-lg whitespace-pre-wrap">
                                {qData.question_description}
                            </p>
                        </div>

                        {/* Answer Display */}
                        <div className="bg-card border border-card-border rounded-xl p-5 space-y-2.5">
                            <span className="text-xs text-foreground/50 font-bold block">작성한 내 답안</span>
                            <p className="text-sm font-medium text-foreground bg-card-border/60 p-3.5 rounded-lg whitespace-pre-wrap border border-card-border">
                                {uAns || '(제출한 답안 없음)'}
                            </p>
                        </div>

                        {/* Reference Model Answer */}
                        <div className="bg-card border-l-[5px] border-success border border-card-border p-5 rounded-xl space-y-3">
                            <span className="text-xs font-bold text-success flex items-center gap-1.5">
                                <CheckCircle className="w-4 h-4" />
                                <span>✅ 핵심 모범 답안 가이드 ({qData.question_title})</span>
                            </span>

                            <div className="text-sm leading-relaxed text-foreground/90 font-medium space-y-1">
                                {Array.isArray(qData.model_answer) ? (
                                    <ul className="list-disc list-inside space-y-1">
                                        {qData.model_answer.map((ans: string, i: number) => (
                                            <li key={i}>{ans}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="whitespace-pre-line">{qData.model_answer}</p>
                                )}
                            </div>
                        </div>

                        {/* AI Feedback */}
                        <div className="bg-card border border-card-border rounded-xl p-5 space-y-3">
                            <span className="text-xs font-bold text-accent flex items-center gap-1.5">
                                🤖 AI 감사 채점 실평평가
                            </span>

                            <div className="text-sm leading-relaxed text-foreground/90 font-medium whitespace-pre-wrap bg-card-border/10 p-3 rounded-lg border border-card-border/20">
                                {evalData.evaluation}
                            </div>
                        </div>

                    </div>

                    {/* Performance Radar Target Graph */}
                    <div className="space-y-6">
                        <div className="bg-card border border-card-border p-6 rounded-xl text-center space-y-4 flex flex-col justify-between h-fit shadow-md">
                            <span className="text-xs font-extrabold text-foreground/50 block">AI 논리적 적중률 (Target)</span>

                            <TargetChart score={evalData.score} />

                            <div className="pt-2">
                                <span className="text-xs text-foreground/40 font-bold block mb-1">판독 점수</span>
                                <span className="text-3xl font-black text-warning leading-none">{evalData.score} <span className="text-sm font-semibold text-foreground/60">/ 10 점</span></span>
                            </div>

                            {user?.role !== 'GUEST' && (user?.role === 'PRO' || user?.role === 'ADMIN') && (
                                <button
                                    onClick={handleSaveReportNote}
                                    className="w-full py-2.5 bg-card-border border border-card-border hover:bg-card-border/80 text-foreground font-bold rounded-lg text-sm transition-colors cursor-pointer"
                                >
                                    오답노트에 수동 저장
                                </button>
                            )}

                            {user?.role === 'MEMBER' && (
                                <div className="text-xs font-bold text-foreground/40 p-2 bg-card-border/30 rounded-lg">
                                    🔒 오답노트 영구 보관 (유료 회원 전용)
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* Ending options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-card-border">
                    <button
                        onClick={handleRetrySameConfig}
                        className="py-3 bg-accent/20 hover:bg-accent/35 border border-accent/30 text-accent font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4 animate-spin-slow" />
                        <span>🔄 동일한 조건으로 추가 문제 풀기</span>
                    </button>

                    <button
                        onClick={() => {
                            setAppState('SETUP');
                            router.push('/');
                        }}
                        className="py-3 bg-card border border-card-border hover:bg-card-border/70 text-foreground/90 font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                        <Home className="w-4 h-4" />
                        <span>🏠 문제 마감 및 홈 대시보드 이동</span>
                    </button>
                </div>

            </div>
        );
    }

    return null;
}
