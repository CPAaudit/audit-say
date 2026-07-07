import { supabase, getSupabaseAdmin } from './supabase';

export interface UserProfile {
    id: string;
    username: string;
    role: 'MEMBER' | 'ADMIN' | 'PRO' | 'GUEST';
    level: number;
    exp: number;
    email?: string;
    created_at?: string;
}

export interface AuditQuestion {
    id: number;
    part: string;
    chapter: string;
    standard: string;
    question_title: string;
    question_description: string;
    model_answer: string | string[];
    explanation: string;
    keywords?: string[];
}

export interface ReviewNote {
    id: number;
    user_id: string;
    question_id: number | null;
    user_answer: string;
    score: number;
    created_at: string;

    // Joined from audit_questions
    part?: string;
    chapter?: string;
    standard_code?: string;
    question_title?: string;
    question_description?: string;
    model_answer?: string | string[];
    explanation?: string;
}

// --- Auth & User Profile Functions ---

export async function getCombinedProfile(authUserId: string, authEmail?: string): Promise<UserProfile | null> {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUserId)
            .single();

        if (error) {
            console.error('Profile fetch error:', error);
            return null;
        }

        return {
            id: data.id,
            username: data.username,
            role: data.role || 'MEMBER',
            level: data.level || 1,
            exp: data.exp || 0,
            email: authEmail,
        };
    } catch (err) {
        console.error('Error in getCombinedProfile:', err);
        return null;
    }
}

export async function createPublicProfile(userId: string, username: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('users')
            .insert({
                id: userId,
                username,
                role: 'MEMBER',
                level: 1,
                exp: 0,
            });

        if (error) {
            console.error('Error creating profile:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Error in createPublicProfile:', err);
        return false;
    }
}

export async function updateProgress(id: string, level: number, exp: number): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('users')
            .update({ level, exp })
            .eq('id', id);

        if (error) {
            console.error('Error updating progress:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Error in updateProgress:', err);
        return false;
    }
}

export async function checkUsernameExists(username: string): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('username')
            .eq('username', username);

        if (error) {
            console.error('Error checking username:', error);
            return false;
        }
        return data.length > 0;
    } catch (err) {
        console.error('Error in checkUsernameExists:', err);
        return false;
    }
}

// --- Review Notes Functions ---

export async function saveReviewNote(
    userId: string,
    questionTitle: string,
    userAnswer: string,
    score: number
): Promise<boolean> {
    try {
        let questionId: number | null = null;

        // Look up question ID
        if (questionTitle) {
            const { data, error } = await supabase
                .from('audit_questions')
                .select('id')
                .eq('question_title', questionTitle);

            if (!error && data && data.length > 0) {
                questionId = data[0].id;
            }
        }

        const { error } = await supabase
            .from('review_notes')
            .insert({
                user_id: userId,
                question_id: questionId,
                user_answer: userAnswer,
                score,
                created_at: new Date().toISOString()
            });

        if (error) {
            console.error('Error saving review note:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Error in saveReviewNote:', err);
        return false;
    }
}

export async function getUserReviewNotes(userId: string): Promise<ReviewNote[]> {
    try {
        const { data, error } = await supabase
            .from('review_notes')
            .select('*, audit_questions(*)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error getting review notes:', error);
            return [];
        }

        return (data || []).map((item: any) => {
            const q = item.audit_questions || {};
            return {
                id: item.id,
                user_id: item.user_id,
                question_id: item.question_id,
                user_answer: item.user_answer,
                score: item.score,
                created_at: item.created_at,
                part: q.part || 'Unknown/Deleted',
                chapter: q.chapter || 'Unknown',
                standard_code: q.standard || 'Unknown',
                question_title: q.question_title || 'Unknown Title',
                question_description: q.question_description || '(문제 내용 없음)',
                model_answer: q.model_answer || [],
                explanation: q.explanation || '해설 없음',
            };
        });
    } catch (err) {
        console.error('Error in getUserReviewNotes:', err);
        return [];
    }
}

export async function deleteReviewNote(noteId: number): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('review_notes')
            .delete()
            .eq('id', noteId);

        if (error) {
            console.error('Error deleting review note:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Error in deleteReviewNote:', err);
        return false;
    }
}

// --- Leaderboard & User List ---

export async function getLeaderboardData(): Promise<Omit<UserProfile, 'email'>[]> {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, username, role, level, exp')
            .order('exp', { ascending: false })
            .limit(10);

        if (error) {
            console.error('Error getting leaderboard:', error);
            return [];
        }
        return data || [];
    } catch (err) {
        console.error('Error in getLeaderboardData:', err);
        return [];
    }
}

export async function getAllUsers(): Promise<UserProfile[]> {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('username', { ascending: true });

        if (error) {
            console.error('Error getting all users:', error);
            return [];
        }
        return data || [];
    } catch (err) {
        console.error('Error in getAllUsers:', err);
        return [];
    }
}

export async function updateUserRole(userId: string, newRole: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('users')
            .update({ role: newRole })
            .eq('id', userId);

        if (error) {
            console.error('Error updating user role:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Error in updateUserRole:', err);
        return false;
    }
}

// --- Question Administration ---

export async function fetchAllQuestions(): Promise<AuditQuestion[]> {
    try {
        const { data, error } = await supabase
            .from('audit_questions')
            .select('*')
            .order('id', { ascending: true });

        if (error) {
            console.error('Error loading questions:', error);
            return [];
        }
        return data || [];
    } catch (err) {
        console.error('Error in fetchAllQuestions:', err);
        return [];
    }
}

export async function addQuestion(question: Omit<AuditQuestion, 'id'>): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('audit_questions')
            .insert(question);

        if (error) {
            console.error('Error adding question:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Error in addQuestion:', err);
        return false;
    }
}

export async function updateQuestion(id: number, question: Partial<AuditQuestion>): Promise<boolean> {
    try {
        const cleanData = { ...question };
        delete cleanData.id;

        const { error } = await supabase
            .from('audit_questions')
            .update(cleanData)
            .eq('id', id);

        if (error) {
            console.error('Error updating question:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Error in updateQuestion:', err);
        return false;
    }
}

export async function deleteQuestion(id: number): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('audit_questions')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting question:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Error in deleteQuestion:', err);
        return false;
    }
}
