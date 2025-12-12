import streamlit as st
from supabase import create_client
import pandas as pd
from datetime import datetime

# 1. Supabase 연결 초기화
@st.cache_resource
def init_db():
    try:
        url = st.secrets["SUPABASE"]["URL"]
        key = st.secrets["SUPABASE"]["KEY"]
        return create_client(url, key)
    except Exception as e:
        return None

supabase = init_db()

# --- 사용자 로그인 및 정보 관리 ---
def login_user(username, password):
    """로그인 처리: 없으면 자동 가입, 있으면 비번 확인"""
    try:
        res = supabase.table("users").select("*").eq("username", username).execute()
        
        # 신규 유저
        if not res.data:
            new_user = {
                "username": username, 
                "password": password, 
                "level": 1, 
                "exp": 0, 
                "role": "MEMBER"
            }
            supabase.table("users").insert(new_user).execute()
            # 반환값: ID, PW, ROLE, LEVEL, EXP
            return [username, password, "MEMBER", 1, 0]
        
        # 기존 유저
        user = res.data[0]
        if user['password'] == password:
            return [user['username'], user['password'], user['role'], user['level'], user['exp']]
        else:
            return None # 비번 불일치
    except Exception:
        return None

def update_progress(username, level, exp):
    """경험치 저장"""
    try:
        supabase.table("users").update({"level": level, "exp": exp}).eq("username", username).execute()
    except Exception:
        pass

# --- 오답노트 관리 (수정됨: 내 답안 제외) ---
def save_review_note(username, part, chapter, standard, title, question, model_ans, explanation, score):
    """오답노트 저장"""
    try:
        data = {
            "username": username,
            "part": part,
            "chapter": chapter,
            "standard_code": standard,
            "title": title,
            "question": question,
            "model_answer": model_ans,
            "explanation": explanation,
            "score": score,
            "created_at": datetime.now().isoformat()
        }
        supabase.table("review_notes").insert(data).execute()
    except Exception as e:
        print(f"Error: {e}")

def get_user_review_notes(username):
    """내 오답노트 조회"""
    try:
        res = supabase.table("review_notes").select("*").eq("username", username).order("created_at", desc=True).execute()
        return pd.DataFrame(res.data)
    except Exception:
        return pd.DataFrame()

def delete_review_note(note_id):
    """오답노트 삭제"""
    try:
        supabase.table("review_notes").delete().eq("id", note_id).execute()
    except Exception:
        pass
    
def get_leaderboard_data():
    """랭킹 조회"""
    try:
        res = supabase.table("users").select("username, role, level, exp").order("exp", desc=True).limit(10).execute()
        return pd.DataFrame(res.data)
    except:
        return pd.DataFrame()

def get_all_users():
    """관리자용 유저 전체 조회"""
    try:
        res = supabase.table("users").select("*").execute()
        return pd.DataFrame(res.data)
    except:
        return pd.DataFrame()
        
def update_user_role(target_user, new_role):
    """관리자용 등급 변경"""
    try:
        supabase.table("users").update({"role": new_role}).eq("username", target_user).execute()
    except:
        pass