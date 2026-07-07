'use client';

import React, { useEffect, useState } from 'react';
import { getStructureData, getNormalizedQuestions } from '../actions';
import { StructureData, compareChapters } from '../../lib/utils';
import { AuditQuestion } from '../../lib/db';
import { BookOpen, Folder, ChevronDown, ChevronRight, HelpCircle } from 'lucide-react';

export default function CurriculumPage() {
    const [structure, setStructure] = useState<StructureData | null>(null);
    const [questions, setQuestions] = useState<AuditQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedParts, setExpandedParts] = useState<{ [part: string]: boolean }>({});

    useEffect(() => {
        async function loadCurriculum() {
            try {
                const struct = await getStructureData();
                const qs = await getNormalizedQuestions();
                setStructure(struct);
                setQuestions(qs);

                // Show first part as expanded by default
                const parts = Object.keys(struct.hierarchy).sort();
                if (parts.length > 0) {
                    setExpandedParts({ [parts[0]]: true });
                }
            } catch (err) {
                console.error('커리큘럼 구성 오류:', err);
            } finally {
                setLoading(false);
            }
        }
        loadCurriculum();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center flex-grow py-20">
                <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-foreground/60 font-semibold text-sm">커리큘럼 지도 로드 중...</p>
            </div>
        );
    }

    if (!structure) {
        return (
            <div className="max-w-md mx-auto w-full p-8 text-center bg-card border border-card-border rounded-2xl shadow-xl">
                <p className="text-sm text-foreground/60 font-semibold">커리큘럼을 로드할 수 없습니다.</p>
            </div>
        );
    }

    // Pre-process questions matching lookup map: part -> chapter name -> standard -> questions
    const getMappedContent = () => {
        const map: { [part: string]: { [chap: string]: { [std: string]: AuditQuestion[] } } } = {};

        questions.forEach((q) => {
            const p = String(q.part);
            const c = String(q.chapter);
            const s = String(q.standard || 'Unknown');

            // We look up full chapter/part name from structure nameMap to match the output hierarchy
            const partKey = Object.keys(structure.hierarchy).find(
                (partName) => partName.includes(p)
            ) || `PART${p}`;

            const chapKey = Object.keys(structure.hierarchy[partKey] || {}).find(
                (cName) => cName === `ch${c}` || cName.includes(c)
            ) || `ch${c}`;

            const chapName = structure.nameMap[chapKey] || chapKey;

            if (!map[partKey]) map[partKey] = {};
            if (!map[partKey][chapName]) map[partKey][chapName] = {};
            if (!map[partKey][chapName][s]) map[partKey][chapName][s] = [];
            map[partKey][chapName][s].push(q);
        });

        return map;
    };

    const contentMap = getMappedContent();

    const togglePart = (part: string) => {
        setExpandedParts((prev) => ({ ...prev, [part]: !prev[part] }));
    };

    return (
        <div className="max-w-4xl mx-auto w-full space-y-8 py-4">
            {/* Title */}
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-black flex items-center justify-center gap-2">
                    <BookOpen className="w-8 h-8 text-accent animate-pulse" />
                    <span>전체 학습 커리큘럼</span>
                </h1>
                <p className="text-sm text-foreground/60 font-medium">
                    회계감사기준 체계에 따른 단원 구성과 등록된 문제 분포를 한눈에 파악합니다.
                </p>
            </div>

            {/* Render hierarchy */}
            <div className="space-y-4">
                {Object.keys(structure.hierarchy).sort().map((partName) => {
                    const isExpanded = expandedParts[partName];
                    const chaps = structure.hierarchy[partName];

                    return (
                        <div key={partName} className="bg-card border border-card-border rounded-2xl shadow-md overflow-hidden">
                            <button
                                onClick={() => togglePart(partName)}
                                className="w-full px-5 py-4 bg-card-border/30 border-b border-card-border/50 hover:bg-card-border/50 transition-colors flex items-center justify-between text-left cursor-pointer"
                            >
                                <span className="font-extrabold text-foreground flex items-center gap-2">
                                    <Folder className="w-5 h-5 text-accent" />
                                    <span>{partName}</span>
                                </span>
                                {isExpanded ? (
                                    <ChevronDown className="w-5 h-5 text-foreground/60" />
                                ) : (
                                    <ChevronRight className="w-5 h-5 text-foreground/60" />
                                )}
                            </button>

                            {isExpanded && (
                                <div className="p-5 space-y-6 divide-y divide-card-border/40">
                                    {Object.keys(chaps).sort(compareChapters).map((chapKey, idx) => {
                                        const chapName = structure.nameMap[chapKey] || chapKey;
                                        const standards = chaps[chapKey];

                                        return (
                                            <div key={chapKey} className={`${idx > 0 ? 'pt-5' : ''} space-y-3`}>
                                                <h3 className="text-base font-extrabold text-foreground/90 flex items-center gap-2">
                                                    <span className="w-1.5 h-4 bg-primary rounded-full"></span>
                                                    <span>{chapName}</span>
                                                </h3>

                                                <div className="pl-3.5 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {standards.map((std) => {
                                                        const matchedQs = contentMap[partName]?.[chapName]?.[std] || [];

                                                        return (
                                                            <div
                                                                key={std}
                                                                className="bg-[#2e3440]/40 border border-card-border/60 rounded-xl p-3.5 flex flex-col justify-between"
                                                            >
                                                                <div className="flex justify-between items-start gap-4">
                                                                    <span className="text-xs font-bold text-accent">기준서 {std}</span>
                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-card-border text-foreground/70">
                                                                        등록 문제: {matchedQs.length}문항
                                                                    </span>
                                                                </div>

                                                                <div className="mt-3.5 space-y-1.5">
                                                                    {matchedQs.length === 0 ? (
                                                                        <p className="text-xs text-foreground/35 italic flex items-center gap-1">
                                                                            <HelpCircle className="w-3.5 h-3.5" />
                                                                            <span>등록된 핵심 문항이 없습니다.</span>
                                                                        </p>
                                                                    ) : (
                                                                        matchedQs.map((q) => (
                                                                            <div key={q.id} className="text-xs font-semibold text-foreground/80 leading-relaxed truncate">
                                                                                • {q.question_title}
                                                                            </div>
                                                                        ))
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
