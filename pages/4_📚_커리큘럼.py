import streamlit as st
import utils
import database

# [초기 설정]
st.set_page_config(page_title="커리큘럼 | Audit Rank", page_icon="📚", layout="wide")
utils.local_css()

def main():
    st.title("📚 학습 커리큘럼")
    
    # DB & Structure Load
    db_data = utils.load_db()
    hierarchy, name_map, _, _ = utils.load_structure()
    
    # Efficient Lookup Map
    content_map = {}
    for q in db_data:
        p = q.get('part', 'Unknown')
        c = q.get('chapter', 'Unknown')
        s = str(q.get('standard', 'Unknown'))
        
        if p not in content_map: content_map[p] = {}
        if c not in content_map[p]: content_map[p][c] = {}
        if s not in content_map[p][c]: content_map[p][c][s] = []
        content_map[p][c][s].append(q)

    # Rendering
    for part in sorted(hierarchy.keys()):
        with st.expander(f"📌 {part}", expanded=False):
            chapters = sorted(hierarchy[part].keys(), key=utils.get_chapter_sort_key)
            
            for ch in chapters:
                st.markdown(f"### {name_map.get(ch, ch)}")
                standards = hierarchy[part][ch]
                
                for std in standards:
                    questions = content_map.get(part, {}).get(ch, {}).get(std, [])
                    st.markdown(f"**기준서 {std}** ({len(questions)} 문제)")
                    if not questions:
                        st.caption("   (등록된 핵심 문제 없음)")

if __name__ == "__main__":
    main()
