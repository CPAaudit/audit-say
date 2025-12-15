import json
import os
import re

# Define the new structure based on the user's provided structure.md content
# Mapping: Standard Code -> (Part, Chapter)
NEW_STRUCTURE = {
    # PART1
    "Ethics": ("PART1", "ch1~2"),
    "200": ("PART1", "ch1~2"),
    "220": ("PART1", "ch1~2"),
    "250": ("PART1", "ch1~2"),
    "law": ("PART1", "ch3"),
    "210": ("PART1", "ch3"),
    "230": ("PART1", "ch4"),
    "320": ("PART1", "ch4"),
    "500": ("PART1", "ch4"),
    "505": ("PART1", "ch4"),
    "520": ("PART1", "ch4"),
    
    # PART2
    "300": ("PART2", "ch5~6"),
    "315": ("PART2", "ch5~6"),
    "330": ("PART2", "ch5~6"),
    "402": ("PART2", "ch5~6"),
    "101": ("PART2", "ch6-1"),
    "265": ("PART2", "ch6-1"),
    
    # PART3
    "102": ("PART3", "ch7"),
    "530": ("PART3", "ch7-1"),
    "240": ("PART3", "ch8"),
    "501": ("PART3", "ch8"),
    "510": ("PART3", "ch8"),
    "540": ("PART3", "ch8"),
    "550": ("PART3", "ch8"),
    "620": ("PART3", "ch8"),
    "600": ("PART3", "ch9"),
    "610": ("PART3", "ch9"),
    "260": ("PART3", "ch10"),
    "450": ("PART3", "ch10"),
    "560": ("PART3", "ch10"),
    "570": ("PART3", "ch10"),
    "580": ("PART3", "ch10"),
    
    # PART4
    "700": ("PART4", "ch11"),
    "701": ("PART4", "ch11"),
    "705": ("PART4", "ch11"),
    "706": ("PART4", "ch11"),
    "710": ("PART4", "ch11"),
    "720": ("PART4", "ch11"),
    "1100": ("PART4", "ch12"),
    "1200": ("PART4", "ch12"),
}

BASE_DIR = r"c:\Users\cntrl\.gemini\antigravity\playground\crimson-lagoon\data"

def load_all_questions():
    all_questions = []
    for filename in os.listdir(BASE_DIR):
        if filename.startswith("questions_PART") and filename.endswith(".json"):
            filepath = os.path.join(BASE_DIR, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        all_questions.extend(data)
            except Exception as e:
                print(f"Error reading {filename}: {e}")
    return all_questions

def save_questions(grouped_questions):
    for part, questions in grouped_questions.items():
        filename = f"questions_{part}.json"
        filepath = os.path.join(BASE_DIR, filename)
        
        # Sort questions by Chapter then Standard for neatness
        # Helper to numeric sort chapters
        def get_sort_key(q):
            # Sort by Chapter Number (handling ch1~2 vs ch3 etc)
            chap = q['chapter']
            std = str(q['standard'])
            
            # Extract numbers from chapter
            nums = re.findall(r'\d+', chap)
            if nums:
                c_num = int(nums[0])
            else:
                c_num = 999
            
            # Standard numeric sort
            try:
                s_num = int(std)
            except:
                if std == "Ethics": s_num = 100
                elif std == "law": s_num = 110
                else: s_num = 9999
            
            return (c_num, s_num)

        questions.sort(key=get_sort_key)

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(questions, f, indent=2, ensure_ascii=False)
        print(f"Saved {len(questions)} questions to {filename}")

def main():
    print("Starting migration...")
    questions = load_all_questions()
    print(f"Loaded {len(questions)} total questions.")
    
    grouped_questions = {
        "PART1": [],
        "PART2": [],
        "PART3": [],
        "PART4": []
    }
    
    unmapped_standards = set()
    
    for q in questions:
        std = str(q.get('standard'))
        if std in NEW_STRUCTURE:
            new_part, new_chapter = NEW_STRUCTURE[std]
            q['part'] = new_part
            q['chapter'] = new_chapter
            
            if new_part in grouped_questions:
                grouped_questions[new_part].append(q)
            else:
                # Should not happen given current scope, but safety net
                print(f"Warning: Unknown part {new_part} for standard {std}")
        else:
            unmapped_standards.add(std)
            # Keep original part if unknown (or handle otherwise)
            # For now, put it back in its original part if valid
            orig_part = q.get('part', 'PART1')
            if orig_part in grouped_questions:
                grouped_questions[orig_part].append(q)
            else:
                grouped_questions["PART1"].append(q)

    if unmapped_standards:
        print(f"Warning: The following standards were not in the new map: {unmapped_standards}")
    
    save_questions(grouped_questions)
    print("Migration complete.")

if __name__ == "__main__":
    main()
