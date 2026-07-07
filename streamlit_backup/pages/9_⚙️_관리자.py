import streamlit as st
import database
import utils
import json
import pandas as pd

# [초기 설정]
st.set_page_config(page_title="관리자 | Audit Say", page_icon="⚙️", layout="wide")
utils.local_css()

def main():
    if 'user_role' not in st.session_state or st.session_state.user_role != 'ADMIN':
        st.error("⛔ 접근 권한이 없습니다. (관리자 전용)")
        st.stop()
        
    st.title("⚙️ 관리자 페이지 (문제 관리)")
    
    tab_add, tab_manage, tab_users = st.tabs(["➕ 문제 추가", "🛠️ 문제 수정/삭제", "👥 회원 관리"])



    hierarchy, name_map, _, _ = utils.load_structure()
    parts = sorted(list(hierarchy.keys()))
    
    # --- TAB 1: ADD QUESTION ---
    with tab_add:
        st.subheader("새로운 문제 추가")
        with st.form("add_q_form", clear_on_submit=True):
            c1, c2, c3 = st.columns(3)
            with c1: 
                sel_part = st.selectbox("Part", parts, key="add_part")
            with c2:
                # Dynamic Chapter based on Part (Ideal, but generic list for Admin is ok or reload)
                # For simplicity in Admin, let's allow typing or generic selection from loaded structure
                if sel_part in hierarchy:
                    chaps = ["직접 입력"] + sorted(list(hierarchy[sel_part].keys()), key=utils.get_chapter_sort_key)
                else: chaps = ["직접 입력"]
                sel_chap_val = st.selectbox("Chapter Code", chaps, key="add_chap_sel")
                if sel_chap_val == "직접 입력":
                    sel_chap = st.text_input("Chapter Code (Direct)", key="add_chap_txt")
                else: sel_chap = sel_chap_val
                
            with c3:
                sel_std = st.text_input("Standard (기준서)", key="add_std")
                
            title = st.text_input("문제 제목 (Title)", placeholder="예: [320] 중요성 기준")
            desc = st.text_area("문제 본문 (Description)", height=150)
            
            c_k, c_m = st.columns(2)
            with c_k:
                kw_input = st.text_area("핵심 키워드 (쉼표로 구분)", placeholder="감사위험, 중요성, 수행중요성")
            with c_m:
                ma_input = st.text_area("모범 답안 (줄바꿈으로 구분)", height=100, placeholder="첫번째 문장\n두번째 문장")
                
            expl = st.text_area("참고 설명 (Official Explanation)", height=100)
            if st.form_submit_button("문제 추가", type="primary"):
                if not title or not desc:
                    st.error("제목과 본문은 필수입니다.")
                else:
                    # Parse
                    keywords = [k.strip() for k in kw_input.split(',') if k.strip()]
                    model_ans = [m.strip() for m in ma_input.split('\n') if m.strip()]
                    
                    # EXTRACT NUMBERS ONLY
                    p_match = utils.re.search(r'(\d+)', sel_part)
                    sv_part = p_match.group(1) if p_match else sel_part
                    
                    c_match = utils.re.search(r'(\d+)', sel_chap)
                    sv_chap = c_match.group(1) if c_match else sel_chap
                    
                    data = {
                        "part": sv_part,
                        "chapter": sv_chap,
                        "standard": sel_std,
                        "question_title": title,
                        "question_description": desc,
                        "keywords": keywords,
                        "model_answer": model_ans,
                        "explanation": expl
                    }
                    
                    if database.add_question(data):
                        st.success(f"문제 '{title}' 추가 성공!")
                        utils.load_db.clear() # Cache Clear
                    else:
                        st.error("추가 실패. 로그를 확인하세요.")

    # --- TAB 2: MANAGE QUESTIONS ---
    with tab_manage:
        st.subheader("문제 검색 및 수정")
        
        # Load Latest
        questions = database.fetch_all_questions() # Don't use cached utils.load_db() to get fresh data
        
        # Filter Logic
        c_p, c_c, c_s = st.columns([1, 1, 2])
        
        with c_p:
            # Extract parts safely
            all_parts = sorted(list(set([str(q.get('part', 'Unknown')) for q in questions])))
            sel_part_filter = st.selectbox("Part 필터", ["전체"] + all_parts)
            
        with c_c:
            # Dynamic Chapter Filter
            if sel_part_filter == "전체":
                potential_chaps = [str(q.get('chapter', 'Unknown')) for q in questions]
            else:
                potential_chaps = [str(q.get('chapter', 'Unknown')) for q in questions if str(q.get('part')) == sel_part_filter]
            
            unique_chaps = sorted(list(set(potential_chaps)), key=utils.get_chapter_sort_key)
            sel_chap_filter = st.selectbox("Chapter 필터", ["전체"] + unique_chaps)
            
        with c_s:
            search_term = st.text_input("제목 검색", "")
            
        filtered = [
            q for q in questions 
            if (search_term.lower() in q.get('question_title', '').lower())
            and (sel_part_filter == "전체" or str(q.get('part')) == sel_part_filter)
            and (sel_chap_filter == "전체" or str(q.get('chapter')) == sel_chap_filter)
        ]
        
        if not filtered:
            st.info("검색 결과가 없습니다.")
        else:
            q_options = {f"[{q.get('id')}] {q.get('question_title')}": q for q in filtered}
            sel_q_key = st.selectbox("문제 선택", list(q_options.keys()))
            
            if sel_q_key:
                target_q = q_options[sel_q_key]
                st.divider()
                
                with st.form("edit_q_form"):
                    st.caption(f"ID: {target_q.get('id')}")
                    
                    ec1, ec2, ec3 = st.columns(3)
                    new_part = ec1.text_input("Part (숫자만 입력)", target_q.get('part', ''))
                    new_chap = ec2.text_input("Chapter (숫자만 입력)", target_q.get('chapter', ''))
                    new_std = ec3.text_input("Standard", target_q.get('standard', ''))
                    
                    new_title = st.text_input("Title", target_q.get('question_title', ''))
                    new_desc = st.text_area("Description", target_q.get('question_description', ''), height=150)
                    
                    # Keywords List -> String
                    curr_kw = target_q.get('keywords', [])
                    if isinstance(curr_kw, list): curr_kw_str = ", ".join(curr_kw)
                    else: curr_kw_str = str(curr_kw)
                    new_kw_str = st.text_input("Keywords (쉼표 구분)", curr_kw_str)
                    
                    # Model Answer List -> String
                    curr_ma = target_q.get('model_answer', [])
                    if isinstance(curr_ma, list): curr_ma_str = "\n".join(curr_ma)
                    else: curr_ma_str = str(curr_ma)
                    new_ma_str = st.text_area("Model Answer", curr_ma_str, height=250)
                    
                    new_expl = st.text_area("Explanation", target_q.get('explanation', ''), height=100)
                    
                    c_upd, c_del = st.columns([1, 4])
                    if c_upd.form_submit_button("수정 저장", type="primary"):
                        # Parse
                        keywords = [k.strip() for k in new_kw_str.split(',') if k.strip()]
                        model_ans = [m.strip() for m in new_ma_str.split('\n') if m.strip()]
                        
                        # EXTRACT NUMBERS ONLY (Safety)
                        p_match = utils.re.search(r'(\d+)', new_part)
                        sv_part = p_match.group(1) if p_match else new_part
                        
                        c_match = utils.re.search(r'(\d+)', new_chap)
                        sv_chap = c_match.group(1) if c_match else new_chap

                        upd_data = {
                            "part": sv_part,
                            "chapter": sv_chap,
                            "standard": new_std,
                            "question_title": new_title,
                            "question_description": new_desc,
                            "keywords": keywords,
                            "model_answer": model_ans,
                            "explanation": new_expl
                        }
                        
                        if database.update_question(target_q['id'], upd_data):
                            st.success("수정되었습니다.")
                            utils.load_db.clear()
                            st.rerun()
                        else:
                            st.error("수정 실패")
                            
                # Delete outside form to avoid nested button issues or use explicit confirmation
                st.write("")
                with st.expander("🗑️ 위험 구역 (삭제)"):
                    st.warning("삭제하면 복구할 수 없습니다.")
                    if st.button("영구 삭제", key=f"del_{target_q['id']}", type="primary"):
                        if database.delete_question(target_q['id']):
                            st.success("삭제되었습니다.")
                            utils.load_db.clear()
                            st.rerun()
                        else:
                            st.error("삭제 실패")

    # --- TAB 3: USER MANAGEMENT ---
    with tab_users:
        st.subheader("회원 관리")
        try:
            users = database.get_all_users()
            if users.empty:
                st.info("회원이 없습니다.")
            else:
                st.dataframe(users[['username', 'role', 'level', 'exp', 'created_at']], use_container_width=True)
                
                st.divider()
                st.write("##### 등급 변경")
                c_u1, c_u2 = st.columns(2)
                with c_u1:
                    target_username = st.selectbox("사용자 선택", users['username'].unique())
                with c_u2:
                    new_role = st.selectbox("변경할 등급", list(utils.ROLE_NAMES.keys()), index=list(utils.ROLE_NAMES.keys()).index('MEMBER'))
                    
                if st.button("등급 변경 적용", type="primary"):
                    if target_username == '준영2': # Hardcoded protection example
                         st.error("최고 관리자 보호")
                    else:
                        if database.update_user_role(target_username, new_role):
                            st.success(f"'{target_username}'님의 등급이 '{new_role}'({utils.ROLE_NAMES[new_role]})로 변경되었습니다.")
                            st.rerun()
                        else:
                            st.error("변경 실패")
        except Exception as e:
            st.error(f"Error loading users: {e}")

if __name__ == "__main__":
    main()
