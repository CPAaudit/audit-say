import fs from 'fs';
import path from 'path';
import { fetchAllQuestions, AuditQuestion } from './db';
import { StructureData } from './utils';
import { GoogleGenAI } from '@google/genai';

export function loadStructure(): StructureData {
    const baseDir = process.cwd();
    const structurePath = path.join(baseDir, 'structure.md');

    const hierarchy: any = {};
    const nameMap: any = {};
    const partCodeMap: any = {};
    const chapterMap: any = {};

    if (!fs.existsSync(structurePath)) {
        console.error(`Structure file not found at: ${structurePath}`);
        return { hierarchy, nameMap, partCodeMap, chapterMap };
    }

    try {
        const content = fs.readFileSync(structurePath, 'utf-8');
        const lines = content.split('\n');
        let currentPart: string | null = null;

        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            const partMatch = line.match(/^##\s*(PART\s*\d+.*)/i);
            if (partMatch) {
                let rawPart = partMatch[1].trim();
                rawPart = rawPart.replace(/^PART\s+(\d+)/i, 'PART$1');
                const shortPMatch = rawPart.match(/^(PART\d+)/i);
                if (shortPMatch) {
                    partCodeMap[shortPMatch[1].toUpperCase()] = rawPart;
                }
                currentPart = rawPart;
                hierarchy[currentPart] = {};
                continue;
            }

            const chapterMatch = line.match(/^-\s*\*\*(ch[\d~-]+.*?)\*\*:\s*(.+)/i);
            if (chapterMatch && currentPart) {
                const fullName = chapterMatch[1].trim();
                const codeMatch = fullName.match(/^(ch[\d~-]+)/i);
                const shortCode = codeMatch ? codeMatch[1].toLowerCase() : fullName;
                nameMap[shortCode] = fullName;
                hierarchy[currentPart][shortCode] = chapterMatch[2].split(',').map(s => s.trim());

                if (shortCode.includes('~')) {
                    try {
                        const prefixMatch = shortCode.match(/^([a-zA-Z]+)/);
                        const prefix = prefixMatch ? prefixMatch[1] : '';
                        const rng = shortCode.match(/\d+/g);
                        if (rng && rng.length >= 2) {
                            const start = parseInt(rng[0], 10);
                            const end = parseInt(rng[1], 10);
                            for (let i = start; i <= end; i++) {
                                chapterMap[`${prefix}${i}`] = fullName;
                            }
                        }
                    } catch (e) { }
                } else {
                    chapterMap[shortCode] = fullName;
                }
            }
        }
    } catch (err) {
        console.error('Error loading structure:', err);
    }
    return { hierarchy, nameMap, partCodeMap, chapterMap };
}

export async function loadDb(): Promise<AuditQuestion[]> {
    try {
        const data = await fetchAllQuestions();
        const { partCodeMap, chapterMap } = loadStructure();

        return data.map((q) => {
            const qCopy = { ...q };

            // Normalize part
            const pStr = String(qCopy.part || '');
            const pMatch = pStr.match(/(?:PART\s*)?(\d+)/i);
            if (pMatch) {
                const partNum = `PART${pMatch[1]}`;
                qCopy.part = partCodeMap[partNum] || `PART${pMatch[1]}`;
            }

            // Normalize chapter
            const cStr = String(qCopy.chapter || '');
            const nums = cStr.match(/\d+/g);
            if (nums) {
                const match = cStr.match(/(\d+(?:-\d+)?)/);
                const rawChap = match ? `ch${match[1]}` : `ch${nums[0]}`;
                qCopy.chapter = chapterMap[rawChap] || rawChap;
            }

            qCopy.standard = String(qCopy.standard || '');
            return qCopy;
        });
    } catch (err) {
        console.error('DB Load Error:', err);
        return [];
    }
}

export interface BatchItem {
    id: number;
    q: string;
    a: string;
    m: string;
    k: string[];
    r: string;
}

export interface GradeResult {
    score: number;
    evaluation: string;
}

export async function gradeBatch(items: BatchItem[], apiKey: string): Promise<{ [id: number]: GradeResult }> {
    if (!items || items.length === 0) return {};

    try {
        const ai = new GoogleGenAI({ apiKey });

        const promptLines = [
            "당신은 엄격하고 보수적인 KICPA(공인회계사) 회계감사 2차 시험 채점 위원입니다.",
            "제공된 [문제], [사용자 답안], [모범 답안], [참고 설명]를 분석하여 0~10점 척도로 냉정하게 채점하세요.",
            "",
            "[엄격한 채점 기준]",
            "1. **전문 용어의 정확성 (필수)**: [모범 답안]에 명시된 전문 용어(Technical Terms)가 정확히 사용되었는지 확인하십시오. 의미가 비슷하더라도 일반적인 서술어(풀어쓴 말)는 인정하지 마십시오.",
            "2. **인과관계의 완결성**: 단순 나열이 아닌 '원인 -> 결과' 또는 '상황 -> 대응'의 논리 구조가 모범 답안과 일치해야 합니다.",
            "3. **감점 가이드라인**:",
            "   - 두루뭉술한 표현('잘 확인한다', '검토한다' 등 구체적 대상 없는 서술): 가차 없이 감점.",
            "   - 답안 길이가 길어도 핵심 논리가 없으면 0점.",
            "",
            "[점수 척도 가이드]",
            "- **10점**: 모범 답안의 논리 구조와 전문 용어 사용이 100% 일치함.",
            "- **7~9점**: 핵심 내용은 포함되었으나, 문장 연결이 매끄럽지 않거나 일부 전문 용어가 누락됨.",
            "- **4~6점**: 논리는 맞으나 전문 용어 대신 일반 용어를 사용하였거나 설명이 다소 부족함.",
            "- **1~3점**: 핵심 개념 서술이 부족하고 내용이 모호함.",
            "",
            "[출력 형식]",
            "마크다운 없이 **순수 JSON 리스트**만 출력하시오.",
            "feedback 필드는 반드시 아래 마크다운 형식을 따라야 합니다:",
            "  - **⚠️ 부족한 점**: (냉철한 지적, 전문 용어 미사용, 논리적 비약 언급, 30자 이내)",
            "  - **👍 잘한 점**: (논리적 서술 및 전문 용어 활용 위주, 30자 이내)",
            "",
            "[{'id': 문제ID, 'score': 점수(0~10점으로 정수 단위), 'feedback': '마크다운 형식의 피드백 문자열'}]",
            "---"
        ];

        for (const item of items) {
            const keywordsStr = item.k ? item.k.join(', ') : '별도 지정 없음';
            promptLines.push(
                `ID: ${item.id}`,
                `문제: ${item.q}`,
                `모범 답안: ${item.m}`,
                `참고 설명: ${item.r || '없음'}`,
                `키워드 가이드: ${keywordsStr}`,
                `사용자 답안: ${item.a}`,
                `---`
            );
        }

        const fullPrompt = promptLines.join('\n');

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-lite',
            contents: fullPrompt,
            config: {
                responseMimeType: 'application/json',
                temperature: 0.1,
            },
        });

        const responseText = response.text || '';

        try {
            let text = responseText.trim();
            if (text.startsWith('```json')) text = text.substring(7);
            if (text.endsWith('```')) text = text.slice(0, -3);
            text = text.trim();

            const regexMatch = text.match(/\[[^]*\]/);
            if (regexMatch) {
                const resultList = JSON.parse(regexMatch[0]);
                const outputMap: { [id: number]: GradeResult } = {};
                for (const r of resultList) {
                    outputMap[Number(r.id)] = {
                        score: parseFloat(r.score ?? 0),
                        evaluation: r.feedback || '피드백 없음',
                    };
                }
                return outputMap;
            } else {
                const resultList = JSON.parse(text);
                const outputMap: { [id: number]: GradeResult } = {};
                for (const r of resultList) {
                    outputMap[Number(r.id)] = {
                        score: parseFloat(r.score ?? 0),
                        evaluation: r.feedback || '피드백 없음',
                    };
                }
                return outputMap;
            }
        } catch (e: any) {
            console.error('JSON parsing error in gradeBatch:', e);
            const fallbackMap: { [id: number]: GradeResult } = {};
            for (const item of items) {
                fallbackMap[item.id] = { score: 0, evaluation: `채점 분석 형식을 해석할 수 없습니다: ${e.message}` };
            }
            return fallbackMap;
        }
    } catch (err: any) {
        console.error('Gemini API Error in gradeBatch:', err);
        let errName = err.message || String(err);
        if (errName.includes('429')) errName = '요청량 초과 (잠시 후 다시 시도해 주세요)';
        const fallbackMap: { [id: number]: GradeResult } = {};
        for (const item of items) {
            fallbackMap[item.id] = { score: 0, evaluation: `AI 채점 오류: ${errName}` };
        }
        return fallbackMap;
    }
}
