'use server';

import { loadStructure, loadDb, gradeBatch, BatchItem } from '../lib/serverUtils';
import {
    saveReviewNote,
    updateProgress,
    getLeaderboardData,
    getAllUsers,
    updateUserRole,
    getUserReviewNotes,
    deleteReviewNote,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    AuditQuestion,
    UserProfile,
    ReviewNote
} from '../lib/db';
import { StructureData } from '../lib/utils';

export async function getStructureData(): Promise<StructureData> {
    return loadStructure();
}

export async function getNormalizedQuestions(): Promise<AuditQuestion[]> {
    return loadDb();
}

export async function gradeQuizBatch(items: BatchItem[]) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        throw new Error('GOOGLE_API_KEY environment variable is not defined on the server.');
    }
    return gradeBatch(items, apiKey);
}

export async function saveQuizNoteAction(userId: string, questionTitle: string, userAnswer: string, score: number) {
    return saveReviewNote(userId, questionTitle, userAnswer, score);
}

export async function updateUserProgressAction(userId: string, level: number, exp: number) {
    return updateProgress(userId, level, exp);
}

export async function getLeaderboardAction(): Promise<Omit<UserProfile, 'email'>[]> {
    return getLeaderboardData();
}

export async function getAllUsersAction(): Promise<UserProfile[]> {
    return getAllUsers();
}

export async function updateUserRoleAction(userId: string, newRole: string): Promise<boolean> {
    return updateUserRole(userId, newRole);
}

export async function getUserReviewNotesAction(userId: string): Promise<ReviewNote[]> {
    return getUserReviewNotes(userId);
}

export async function deleteReviewNoteAction(noteId: number): Promise<boolean> {
    return deleteReviewNote(noteId);
}

export async function addQuestionAction(question: Omit<AuditQuestion, 'id'>): Promise<boolean> {
    return addQuestion(question);
}

export async function updateQuestionAction(id: number, question: Partial<AuditQuestion>): Promise<boolean> {
    return updateQuestion(id, question);
}

export async function deleteQuestionAction(id: number): Promise<boolean> {
    return deleteQuestion(id);
}
