'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
    getStructureData,
    getNormalizedQuestions,
    getAllUsersAction,
    updateUserRoleAction,
    addQuestionAction,
    updateQuestionAction,
    deleteQuestionAction
} from '../actions';
import { ROLE_NAMES, StructureData, compareChapters } from '../../lib/utils';
import { AuditQuestion, UserProfile } from '../../lib/db';
import { Plus, Trash2, Edit3, Settings, ShieldAlert, Users, Search } from 'lucide-react';

export default function AdminPage() {
    const { user, refreshProfile } = useAuth();

    // Tab states
    const [activeTab, setActiveTab] = useState<'add' | 'edit' | 'users'>('add');

    // Common states
    const [structure, setStructure] = useState<StructureData | null>(null);
    const [questions, setQuestions] = useState<AuditQuestion[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Form State: Add Question
    const [addPart, setAddPart] = useState('');
    const [addChapSel, setAddChapSel] = useState('직접 입력');
    const [addChapDirect, setAddChapDirect] = useState('');
    const [addStd, setAddStd] = useState('');
    const [addTitle, setAddTitle] = useState('');
    const [addDesc, setAddDesc] = useState('');
    const [addKeywords, setAddKeywords] = useState('');
    const [addModelAns, setAddModelAns] = useState('');
    const [addExpl, setAddExpl] = useState('');

    // Form State: Edit Question
    const [partFilter, setPartFilter] = useState('전체');
    const [chapFilter, setChapFilter] = useState('전체');
    const [searchTitle, setSearchTitle] = useState('');
    const [selectedQId, setSelectedQId] = useState<number | null>(null);

    // Form Fields: Edit Target
    const [editPart, setEditPart] = useState('');
    const [editChap, setEditChap] = useState('');
    const [editStd, setEditStd] = useState('');
    const [editTitle, setEditTitle] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editKeywords, setEditKeywords] = useState('');
    const [editModelAns, setEditModelAns] = useState('');
    const [editExpl, setEditExpl] = useState('');

    // User role change states
    const [selectedUser, setSelectedUser] = useState('');
    const [newRole, setNewRole] = useState<'MEMBER' | 'ADMIN' | 'PRO' | 'GUEST'>('MEMBER');

    // Load everything
    const loadAdminData = async () => {
        try {
            const struct = await getStructureData();
            setStructure(struct);

            const qs = await getNormalizedQuestions();
            setQuestions(qs);

            const allUsers = await getAllUsersAction();
            setUsers(allUsers);

            // Default Part Selected for Add Question
            const parts = Object.keys(struct.hierarchy).sort();
            if (parts.length > 0 && !addPart) {
                setAddPart(parts[0]);
            }
        } catch (err) {
            console.error('관리자 리소스 로드 에러:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.role === 'ADMIN') {
            loadAdminData();
        }
    }, [user]);

    // Auth block
    if (!user || user.role !== 'ADMIN') {
        return (
            <div className="max-w-md mx-auto w-full p-8 text-center bg-card border border-card-border rounded-2xl shadow-xl space-y-4">
                <ShieldAlert className="w-16 h-16 text-danger mx-auto animate-pulse" />
                <h2 className="text-xl font-bold text-danger">⛔ 접근 권한이 없습니다.</h2>
                <p className="text-sm text-foreground/60 leading-relaxed font-semibold">
                    이 콘솔은 시스템 총괄 관리자(ADMIN) 전용 기능 구역입니다.
                </p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center flex-grow py-20">
                <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-foreground/60 font-semibold text-sm">콘솔 데이터 리프레시 중...</p>
            </div>
        );
    }

    // --- Add Question Form Submission ---
    const handleAddQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!addTitle || !addDesc) {
            setErrorMsg('제목과 본문 상세 내용은 필수작성 사항입니다.');
            return;
        }

        const finalChap = addChapSel === '직접 입력' ? addChapDirect : addChapSel;
        if (!finalChap) {
            setErrorMsg('챕터 코드를 입력 또는 선택해 주세요.');
            return;
        }

        // Extract numbers safely
        const partNum = addPart.match(/\d+/) ? addPart.match(/\d+/)![0] : addPart;
        const chapNum = finalChap.match(/\d+/) ? finalChap.match(/\d+/)![0] : finalChap;

        const keywordsArray = addKeywords.split(',').map((k) => k.trim()).filter(Boolean);
        const modelAnsArray = addModelAns.split('\n').map((m) => m.trim()).filter(Boolean);

        const questionData = {
            part: partNum,
            chapter: chapNum,
            standard: addStd,
            question_title: addTitle,
            question_description: addDesc,
            keywords: keywordsArray,
            model_answer: modelAnsArray,
            explanation: addExpl
        };

        const success = await addQuestionAction(questionData);
        if (success) {
            setSuccessMsg(`문제 '${addTitle}' 추가 완료!`);
            setErrorMsg(null);
            // Reset form
            setAddTitle('');
            setAddDesc('');
            setAddKeywords('');
            setAddModelAns('');
            setAddExpl('');
            setAddStd('');
            // Reload db data
            const qs = await getNormalizedQuestions();
            setQuestions(qs);
        } else {
            setErrorMsg('문제 추가에 실패했습니다. 형식 오류를 확인하세요.');
        }
    };

    // --- Edit Target Loaded ---
    const handleLoadQuestionToEdit = (q: AuditQuestion) => {
        setSelectedQId(q.id);
        setEditPart(String(q.part));
        setEditChap(String(q.chapter));
        setEditStd(q.standard || '');
        setEditTitle(q.question_title);
        setEditDesc(q.question_description);

        // Keywords pre fill
        setEditKeywords(Array.isArray(q.keywords) ? q.keywords.join(', ') : String(q.keywords));

        // Model answer pre fill
        setEditModelAns(Array.isArray(q.model_answer) ? q.model_answer.join('\n') : String(q.model_answer));
        setEditExpl(q.explanation || '');
    };

    // --- Save Edited Question ---
    const handleUpdateQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedQId) return;

        const partNum = editPart.match(/\d+/) ? editPart.match(/\d+/)![0] : editPart;
        const chapNum = editChap.match(/\d+/) ? editChap.match(/\d+/)![0] : editChap;

        const keywordsArray = editKeywords.split(',').map((k) => k.trim()).filter(Boolean);
        const modelAnsArray = editModelAns.split('\n').map((m) => m.trim()).filter(Boolean);

        const success = await updateQuestionAction(selectedQId, {
            part: partNum,
            chapter: chapNum,
            standard: editStd,
            question_title: editTitle,
            question_description: editDesc,
            keywords: keywordsArray,
            model_answer: modelAnsArray,
            explanation: editExpl
        });

        if (success) {
            setSuccessMsg('수정 사항이 데이터베이스에 영구 반영되었습니다.');
            setErrorMsg(null);
            // Reload db data
            const qs = await getNormalizedQuestions();
            setQuestions(qs);
        } else {
            setErrorMsg('수정 처리가 실패하였습니다.');
        }
    };

    // --- Delete Question ---
    const handleDeleteQuestion = async () => {
        if (!selectedQId) return;
        if (!confirm('문제를 영구 삭제하겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

        const success = await deleteQuestionAction(selectedQId);
        if (success) {
            setSuccessMsg('문제가 성공적으로 삭제되었습니다.');
            setErrorMsg(null);
            setSelectedQId(null);
            // Reload db data
            const qs = await getNormalizedQuestions();
            setQuestions(qs);
        } else {
            setErrorMsg('데이터베이스 삭제 오퍼레이션이 거부되었습니다.');
        }
    };

    // --- Change User Role ---
    const handleChangeRole = async () => {
        if (!selectedUser) return;
        if (selectedUser === '준영2') {
            alert('보호 메커니즘: 최고 관리자 등급은 박탈할 수 없습니다.');
            return;
        }

        const success = await updateUserRoleAction(selectedUser, newRole);
        if (success) {
            setSuccessMsg(`사용자 ${selectedUser}의 권한 등급이 ${newRole}로 수정 완료.`);
            setErrorMsg(null);
            // Reload users list
            const allUsers = await getAllUsersAction();
            setUsers(allUsers);
        } else {
            setErrorMsg('권한 변경 오퍼레이션 실패.');
        }
    };

    // Filter logic for manage tab
    const getFilteredQuestions = () => {
        return questions.filter((q) => {
            const matchPart = partFilter === '전체' || String(q.part) === partFilter;
            const matchChap = chapFilter === '전체' || String(q.chapter) === chapFilter;
            const matchSearch = q.question_title.toLowerCase().includes(searchTitle.toLowerCase());
            return matchPart && matchChap && matchSearch;
        });
    };

    const filteredQs = getFilteredQuestions();

    return (
        <div className="max-w-5xl mx-auto w-full space-y-8 py-4">
            {/* Title */}
            <div className="flex items-center gap-3">
                <Settings className="w-8 h-8 text-accent animate-spin-slow" />
                <h1 className="text-3xl font-black">⚙️ 관리자 제어반 (Admin Console)</h1>
            </div>

            {/* Messages */}
            {successMsg && (
                <div className="p-4 bg-success/15 border border-success/30 text-success text-sm font-bold rounded-xl animate-fade-in">
                    {successMsg}
                </div>
            )}
            {errorMsg && (
                <div className="p-4 bg-danger/15 border border-danger/30 text-danger text-sm font-bold rounded-xl animate-fade-in">
                    {errorMsg}
                </div>
            )}

            {/* Tab Menu */}
            <div className="flex border-b border-card-border">
                <button
                    onClick={() => { setActiveTab('add'); setErrorMsg(null); setSuccessMsg(null); }}
                    className={`pb-3 px-6 text-sm font-extrabold border-b-2 transition-all cursor-pointer ${activeTab === 'add' ? 'border-accent text-accent' : 'border-transparent text-foreground/45 hover:text-foreground/75'
                        }`}
                >
                    ➕ 문제 추가
                </button>
                <button
                    onClick={() => { setActiveTab('edit'); setErrorMsg(null); setSuccessMsg(null); }}
                    className={`pb-3 px-6 text-sm font-extrabold border-b-2 transition-all cursor-pointer ${activeTab === 'edit' ? 'border-accent text-accent' : 'border-transparent text-foreground/45 hover:text-foreground/75'
                        }`}
                >
                    🛠️ 문제 수정 / 삭제
                </button>
                <button
                    onClick={() => { setActiveTab('users'); setErrorMsg(null); setSuccessMsg(null); }}
                    className={`pb-3 px-6 text-sm font-extrabold border-b-2 transition-all cursor-pointer ${activeTab === 'users' ? 'border-accent text-accent' : 'border-transparent text-foreground/45 hover:text-foreground/75'
                        }`}
                >
                    👥 회원 권한 관리
                </button>
            </div>

            {/* Tab Contents */}
            <div className="space-y-6">

                {/* TAB 1: ADD QUESTION */}
                {activeTab === 'add' && structure && (
                    <form onSubmit={handleAddQuestion} className="bg-card border border-card-border p-6 rounded-2xl shadow-lg space-y-4">
                        <h3 className="text-lg font-bold">기출 및 모의고사 문제 추가</h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-foreground/50 mb-1">Part 분류</label>
                                <select
                                    value={addPart}
                                    onChange={(e) => setAddPart(e.target.value)}
                                    className="w-full bg-card-border border border-card-border focus:border-accent text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors"
                                >
                                    {Object.keys(structure.hierarchy).sort().map((part) => (
                                        <option key={part} value={part}>{part}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-foreground/50 mb-1">Chapter 분류</label>
                                <select
                                    value={addChapSel}
                                    onChange={(e) => setAddChapSel(e.target.value)}
                                    className="w-full bg-card-border border border-card-border focus:border-accent text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors"
                                >
                                    <option value="직접 입력">직접 코드 입력</option>
                                    {Object.keys(structure.hierarchy[addPart] || {}).sort(compareChapters).map((chap) => (
                                        <option key={chap} value={chap}>{chap}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-foreground/50 mb-1">감사기준 (Standard)</label>
                                <input
                                    type="text"
                                    placeholder="예: 200, law, Ethics"
                                    value={addStd}
                                    onChange={(e) => setAddStd(e.target.value)}
                                    className="w-full bg-card-border border border-card-border focus:border-accent text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors"
                                />
                            </div>
                        </div>

                        {addChapSel === '직접 입력' && (
                            <div className="w-full">
                                <label className="block text-xs font-bold text-foreground/50 mb-1">직접 입력 챕터 코드 (Chapter Code)</label>
                                <input
                                    type="text"
                                    placeholder="예: ch1, ch3 (기본 분류와 숫자가 밀접히 연관됩니다)"
                                    value={addChapDirect}
                                    onChange={(e) => setAddChapDirect(e.target.value)}
                                    className="w-full bg-card-border border border-card-border focus:border-accent text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-foreground/50 mb-1">문제 제목 (Title)</label>
                            <input
                                type="text"
                                placeholder="예: [315] 통제위험과 실증절차의 결합관계"
                                value={addTitle}
                                onChange={(e) => setAddTitle(e.target.value)}
                                className="w-full bg-card-border border border-card-border focus:border-accent text-foreground rounded-lg px-3.5 py-2 text-sm focus:outline-none transition-colors font-bold"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-foreground/50 mb-1">문제 시나리오 및 상세 본문 (Description)</label>
                            <textarea
                                rows={5}
                                placeholder="실제 시험 처럼 주관식 서술 유도를 요구하는 감사인의 검토 절차 및 질문을 입력하세요."
                                value={addDesc}
                                onChange={(e) => setAddDesc(e.target.value)}
                                className="w-full bg-card-border border border-card-border focus:border-accent text-foreground rounded-lg p-3 text-sm focus:outline-none transition-colors"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-foreground/50 mb-1">채점용 필수 키워드 (Keywords, 콤마 구분)</label>
                                <textarea
                                    rows={4}
                                    placeholder="감사의견, 핵심감사사항, 감사업무수임, 윤리강령"
                                    value={addKeywords}
                                    onChange={(e) => setAddKeywords(e.target.value)}
                                    className="w-full bg-card-border border border-card-border focus:border-accent text-foreground rounded-lg p-3 text-sm focus:outline-none transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-foreground/50 mb-1">모범 답안 문단 (Lines, 엔터 구문)</label>
                                <textarea
                                    rows={4}
                                    placeholder="유효한 감사보고서의 서술은 명백한 사실관계의 인과성 입증을 요구한다."
                                    value={addModelAns}
                                    onChange={(e) => setAddModelAns(e.target.value)}
                                    className="w-full bg-card-border border border-card-border focus:border-accent text-foreground rounded-lg p-3 text-sm focus:outline-none transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-foreground/50 mb-1">참고 해설 (Explanation)</label>
                            <textarea
                                rows={3}
                                placeholder="기준서 목차 및 절차에 보강되는 이론적 설명을 제공합니다."
                                value={addExpl}
                                onChange={(e) => setAddExpl(e.target.value)}
                                className="w-full bg-card-border border border-card-border focus:border-accent text-foreground rounded-lg p-3 text-sm focus:outline-none transition-colors"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full py-3 bg-primary hover:bg-primary-hover text-foreground font-black rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <Plus className="w-5 h-5" />
                            <span>새로운 감사문제 추가하기</span>
                        </button>
                    </form>
                )}

                {/* TAB 2: MANAGE/EDIT QUESTIONS */}
                {activeTab === 'edit' && (
                    <div className="space-y-6">

                        {/* Search Filter Panel */}
                        <div className="bg-card border border-card-border p-5 rounded-2xl shadow flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                                <div>
                                    <label className="block text-xs font-bold text-foreground/50 mb-1">Chapter 필터</label>
                                    <select
                                        value={chapFilter}
                                        onChange={(e) => setChapFilter(e.target.value)}
                                        className="w-full bg-card-border border border-card-border focus:border-accent text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none"
                                    >
                                        <option value="전체">전체 Chapters</option>
                                        {Array.from(new Set(questions.map((q) => String(q.chapter)))).sort().map((chap) => (
                                            <option key={chap} value={chap}>{chap === 'Unknown' ? 'Unknown' : `Ch.${chap}`}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-foreground/50 mb-1">제목 검색</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="문제 제목 검색어..."
                                            value={searchTitle}
                                            onChange={(e) => setSearchTitle(e.target.value)}
                                            className="w-full bg-card-border border border-card-border focus:border-accent text-foreground rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none"
                                        />
                                        <Search className="w-4 h-4 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Questions Selector List */}
                        <div className="bg-card border border-card-border rounded-xl p-5 shadow">
                            <label className="block text-xs font-bold text-foreground/50 mb-1.5 uppercase">수정/삭제 대상 문제 풀 선택</label>

                            {filteredQs.length === 0 ? (
                                <p className="text-sm text-foreground/50 py-2.5">검색에 부합하는 문제가 존재하지 않습니다.</p>
                            ) : (
                                <select
                                    onChange={(e) => {
                                        const qData = filteredQs.find((q) => q.id === Number(e.target.value));
                                        if (qData) handleLoadQuestionToEdit(qData);
                                    }}
                                    value={selectedQId || ''}
                                    className="w-full bg-card-border border border-card-border focus:border-accent text-foreground rounded-lg px-3 py-2.5 text-sm"
                                >
                                    <option value="">-- 수정할 문제를 선택하세요 ({filteredQs.length}건 검색됨) --</option>
                                    {filteredQs.map((q) => (
                                        <option key={q.id} value={q.id}>
                                            [{q.id}] (Ch.{q.chapter}) {q.question_title}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Editable Form Segment */}
                        {selectedQId && (
                            <form onSubmit={handleUpdateQuestion} className="bg-card border border-card-border p-6 rounded-2xl shadow-lg space-y-4">
                                <div className="flex items-center justify-between border-b border-card-border pb-3">
                                    <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                                        <Edit3 className="w-5 h-5 text-accent" />
                                        <span>감사문제 상세 정보 수정 (ID: {selectedQId})</span>
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={handleDeleteQuestion}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-danger/10 border border-danger/20 text-danger hover:bg-danger/25 transition-colors cursor-pointer"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>영구 삭제</span>
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-foreground/50 mb-1">Part 코드 (숫자만)</label>
                                        <input
                                            type="text"
                                            value={editPart}
                                            onChange={(e) => setEditPart(e.target.value)}
                                            className="w-full bg-card-border border border-card-border focus:border-accent text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-foreground/50 mb-1">Chapter 코드 (숫자만)</label>
                                        <input
                                            type="text"
                                            value={editChap}
                                            onChange={(e) => setEditChap(e.target.value)}
                                            className="w-full bg-card-border border border-card-border focus:border-accent text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-foreground/50 mb-1">감사기준 (Standard)</label>
                                        <input
                                            type="text"
                                            value={editStd}
                                            onChange={(e) => setEditStd(e.target.value)}
                                            className="w-full bg-card-border border border-card-border focus:border-accent text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-foreground/50 mb-1">문제 제목</label>
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className="w-full bg-card-border border border-card-border focus:border-accent text-foreground rounded-lg px-3.5 py-2.5 text-sm focus:outline-none font-bold"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-foreground/50 mb-1">문제 세부 지문</label>
                                    <textarea
                                        rows={6}
                                        value={editDesc}
                                        onChange={(e) => setEditDesc(e.target.value)}
                                        className="w-full bg-card-border border border-card-border focus:border-accent text-foreground rounded-lg p-3 text-sm focus:outline-none"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-foreground/50 mb-1">검색 핵심 키워드 (쉼표 구분)</label>
                                        <textarea
                                            rows={5}
                                            value={editKeywords}
                                            onChange={(e) => setEditKeywords(e.target.value)}
                                            className="w-full bg-card-border border border-card-border focus:border-accent text-foreground rounded-lg p-3 text-sm focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-foreground/50 mb-1">기본 모범답안 문법 (엔터 구분)</label>
                                        <textarea
                                            rows={5}
                                            value={editModelAns}
                                            onChange={(e) => setEditModelAns(e.target.value)}
                                            className="w-full bg-card-border border border-card-border focus:border-accent text-foreground rounded-lg p-3 text-sm focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-foreground/50 mb-1">전문 해설</label>
                                    <textarea
                                        rows={3}
                                        value={editExpl}
                                        onChange={(e) => setEditExpl(e.target.value)}
                                        className="w-full bg-card-border border border-card-border focus:border-accent text-foreground rounded-lg p-3 text-sm focus:outline-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-3 bg-accent hover:bg-accent text-background font-black rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    <span>데이터베이스 반영 저장하기</span>
                                </button>
                            </form>
                        )}
                    </div>
                )}

                {/* TAB 3: USER PROFILE MANAGEMENT */}
                {activeTab === 'users' && (
                    <div className="space-y-6">
                        <div className="bg-card border border-card-border rounded-2xl overflow-hidden shadow-lg">
                            <div className="p-4 bg-card-border/30 border-b border-card-border flex items-center gap-2">
                                <Users className="w-5 h-5 text-accent" />
                                <h3 className="text-sm font-bold text-foreground/75">회원 정보 목록</h3>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead>
                                        <tr className="bg-card-border/10 border-b border-card-border text-xs uppercase tracking-wider text-foreground/45 font-extrabold">
                                            <th className="px-6 py-3.5">닉네임</th>
                                            <th className="px-6 py-3.5">권한 등급</th>
                                            <th className="px-6 py-3.5">경험치</th>
                                            <th className="px-6 py-3.5">레벨</th>
                                            <th className="px-6 py-3.5 text-right">가입 관리일</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-card-border">
                                        {users.map((u) => (
                                            <tr key={u.id} className="hover:bg-card-border/30 transition-colors">
                                                <td className="px-6 py-4 font-bold text-foreground/90">{u.username}</td>
                                                <td className="px-6 py-4 text-xs font-semibold text-foreground/60">
                                                    {ROLE_NAMES[u.role] || u.role}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-warning">{u.exp} EXP</td>
                                                <td className="px-6 py-4 font-bold text-foreground/80">Lv.{u.level}</td>
                                                <td className="px-6 py-4 text-right text-foreground/45 text-xs">
                                                    {new Date(u.created_at || '').toLocaleDateString('ko-KR')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Change role form */}
                        <div className="bg-card border border-card-border p-6 rounded-2xl shadow-lg space-y-4">
                            <h3 className="text-sm font-bold text-foreground/75">회원 등급 변경</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-foreground/50 mb-1">사용자 선택</label>
                                    <select
                                        value={selectedUser}
                                        onChange={(e) => setSelectedUser(e.target.value)}
                                        className="w-full bg-card-border border border-card-border focus:border-accent text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none"
                                    >
                                        <option value="">-- 사용자를 선택하세요 --</option>
                                        {users.map((u) => (
                                            <option key={u.id} value={u.username}>
                                                {u.username} ({ROLE_NAMES[u.role] || u.role})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-foreground/50 mb-1">변경할 권한 등급</label>
                                    <select
                                        value={newRole}
                                        onChange={(e) => setNewRole(e.target.value as any)}
                                        className="w-full bg-card-border border border-card-border focus:border-accent text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none"
                                    >
                                        {Object.keys(ROLE_NAMES).map((r) => (
                                            <option key={r} value={r}>{ROLE_NAMES[r as keyof typeof ROLE_NAMES]} ({r})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleChangeRole}
                                className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-foreground font-bold rounded-lg text-sm transition-colors cursor-pointer"
                            >
                                변경 권한 적용하기
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
