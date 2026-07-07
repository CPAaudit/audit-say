import { AuditQuestion } from './db';

export const ROLE_NAMES = {
    GUEST: '비회원',
    MEMBER: '공인회계사',
    PRO: '등록공인회계사',
    ADMIN: '관리자'
} as const;

export interface StructureHierarchy {
    [partName: string]: {
        [chapterCode: string]: string[]; // Array of standard codes
    };
}

export interface StructureData {
    hierarchy: StructureHierarchy;
    nameMap: { [shortCode: string]: string };
    partCodeMap: { [partNum: string]: string };
    chapterMap: { [shortCode: string]: string };
}

// Chapter sort key equivalent to python's get_chapter_sort_key
export function getChapterSortKey(name: string): number[] {
    if (name === '전체') return [-1];
    const nums = name.match(/\d+/g);
    return nums ? nums.map(Number) : [999];
}

// Standard sort key equivalent to python's get_standard_sort_key
export function getStandardSortKey(code: string): number {
    if (code === '전체') return -1;
    if (code.toLowerCase() === 'ethics') return 100;
    if (code.toLowerCase() === 'law') return 110;

    const parsed = parseInt(code, 10);
    return isNaN(parsed) ? 9999 : parsed;
}

// Compare function for chapter sorting
export function compareChapters(a: string, b: string): number {
    const keyA = getChapterSortKey(a);
    const keyB = getChapterSortKey(b);

    for (let i = 0; i < Math.max(keyA.length, keyB.length); i++) {
        const valA = keyA[i] !== undefined ? keyA[i] : 0;
        const valB = keyB[i] !== undefined ? keyB[i] : 0;
        if (valA !== valB) return valA - valB;
    }
    return 0;
}

// Compare function for standard sorting
export function compareStandards(a: string, b: string): number {
    return getStandardSortKey(a) - getStandardSortKey(b);
}

// Calculate match keyword count
export function calculateMatchedCount(userAns: string, keywords: string[]): number {
    if (!userAns || !keywords || keywords.length === 0) return 0;
    const userAnsNorm = userAns.replace(/\s+/g, '').toLowerCase();

    let count = 0;
    for (const k of keywords) {
        const kNorm = k.replace(/\s+/g, '').toLowerCase();
        if (userAnsNorm.includes(kNorm)) {
            count++;
        }
    }
    return count;
}

// Get counts of questions equivalent to python's get_counts
export function getCounts(data: AuditQuestion[]) {
    const counts = {
        parts: {} as { [key: string]: number },
        chapters: {} as { [key: string]: number },
        standards: {} as { [key: string]: number },
    };

    for (const q of data) {
        const p = q.part || '';
        const c = q.chapter || '';
        const s = q.standard || '';

        if (p) counts.parts[p] = (counts.parts[p] || 0) + 1;
        if (c) counts.chapters[c] = (counts.chapters[c] || 0) + 1;
        if (s) counts.standards[s] = (counts.standards[s] || 0) + 1;
    }

    return counts;
}

// Randomly sample quiz questions
export function getQuizSet(
    data: AuditQuestion[],
    part: string,
    chapter: string,
    standard: string,
    numQuestions: number,
    excludeTitles: string[] = []
): AuditQuestion[] {
    const excludeSet = new Set(excludeTitles);

    const candidates = data.filter((q) => {
        const partMatch = q.part === part;
        const chapMatch = chapter === '전체' || q.chapter === chapter;
        const stdMatch = standard === '전체' || q.standard === standard;
        const isNotExcluded = !excludeSet.has(q.question_title);
        return partMatch && chapMatch && stdMatch && isNotExcluded;
    });

    if (candidates.length === 0) return [];
    if (candidates.length <= numQuestions) return candidates;

    // Shuffle candidates and return first N
    const shuffled = [...candidates].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, numQuestions);
}
