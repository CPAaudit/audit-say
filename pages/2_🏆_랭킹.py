import streamlit as st
import utils
import database

# [초기 설정]
st.set_page_config(page_title="랭킹 | Audit Rank", page_icon="🏆", layout="wide")
utils.local_css()

def main():
    st.title("🏆 랭킹 (Leaderboard)")
    
    df = database.get_leaderboard_data()
    if not df.empty:
        df['role'] = df['role'].map(utils.ROLE_NAMES).fillna(df['role'])
        df = df.rename(columns={'username': '이름', 'role': '등급', 'level': '레벨', 'exp': '경험치'})
        st.dataframe(df[['이름', '등급', '레벨', '경험치']], use_container_width=True, hide_index=True)
    else:
        st.info("랭킹 데이터가 없습니다.")

if __name__ == "__main__":
    main()
