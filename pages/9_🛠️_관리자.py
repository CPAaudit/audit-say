import streamlit as st
import utils
import database
import time

# [초기 설정]
st.set_page_config(page_title="관리자 | Audit Rank", page_icon="🛠️", layout="wide")
utils.local_css()

def main():
    if 'user_role' not in st.session_state or st.session_state.user_role != 'ADMIN':
        st.warning("관리자 권한이 필요합니다.")
        st.stop()
        
    st.title("🛠️ 관리자 페이지")
    
    st.subheader("회원 관리")
    users = database.get_all_users()
    
    st.dataframe(users[['username', 'role', 'level', 'exp', 'created_at']], use_container_width=True)
    
    st.divider()
    c1, c2 = st.columns(2)
    with c1:
        target_user = st.selectbox("등급 변경 대상", users['username'].unique())
    with c2:
        new_role = st.selectbox("변경할 등급", list(utils.ROLE_NAMES.keys()))
        
    if st.button("등급 변경 적용"):
        if target_user == '준영2':
            st.error("최고 관리자의 등급은 변경할 수 없습니다.")
        else:
            database.update_user_role(target_user, new_role)
            st.success(f"{target_user}님의 등급이 {utils.ROLE_NAMES[new_role]}로 변경되었습니다.")
            time.sleep(1)
            st.rerun()

if __name__ == "__main__":
    main()
