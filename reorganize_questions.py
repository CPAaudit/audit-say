import os
import json
import re
import glob

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
STRUCTURE_PATH = os.path.join(DATA_DIR, 'references', 'structure.md')

def load_structure_map():
    standard_map = {} # standard -> (part, chapter)
    current_part = None
    
    with open(STRUCTURE_PATH, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line: continue
            
            # Match Part header: ## PART1 ...
            part_match = re.match(r'^##\s*(PART\d+)', line, re.IGNORECASE)
            if part_match:
                current_part = part_match.group(1).upper()
                continue
                
            # Match Chapter line: - **ch...**: 100, 200
            # format: - **ch1~2 ...**: 100, 200, 220, 250
            if current_part and line.startswith('-'):
                # Extract chapter part inside ** **
                # Example: - **ch1~2 회계감사의 전제조건**: 100, 200, 220, 250
                # Regex to capture "ch1~2" and the list of standards
                match = re.search(r'\*\*(.*?)\*\*.*:\s*(.*)', line)
                if match:
                    # ch_full might be "ch1~2 회계감사의 전제조건" or just "ch1~2" depending on formatted bold
                    # Actually typically it is **ch1**: ... or **ch1~2 Title**: ...
                    # Let's look at the file content provided previously:
                    # - **ch1~2 회계감사의 전제조건**: 100, 200, 220, 250
                    # The bold part usually contains the code and title? 
                    # Wait, looking at structure.md content:
                    # - **ch1~2 회계감사의 전제조건**: 100, 200, 220, 250
                    # So key is "ch1~2 회계감사의 전제조건".
                    # We likely want just "ch1~2" as the chapter key in the JSON, or keep what was there?
                    # The previous app logic parsed "ch1~2" from this.
                    # Let's extract just the "chX" or "chX~Y" part for the JSON chapter field?
                    # The user request says "chapter와 part를 조정해줘".
                    # Existing JSON has "chapter": "ch1". 
                    # New structure has "ch1~2 ...".
                    # I should probably use the simple code "ch1~2" as the chapter value in JSON.
                    
                    raw_chapter_title = match.group(1).split(' ')[0] # naive split, assumption: "ch1~2 Title" -> "ch1~2"
                    # But wait, sometimes it might be just "**ch3**".
                    # Let's use a regex to extract ch... from the bold text.
                    
                    ch_part = re.search(r'(ch[\d~-]+)', match.group(1), re.IGNORECASE)
                    if ch_part:
                        chapter_code = ch_part.group(1)
                    else:
                        chapter_code = match.group(1) # Fallback
                        
                    standards_str = match.group(2)
                    # Split standards by comma
                    standards = [s.strip() for s in standards_str.split(',')]
                    
                    for std in standards:
                        standard_map[std] = (current_part, chapter_code)
                        
    return standard_map

def reorganize():
    mapping = load_structure_map()
    print(f"Loaded mappings for {len(mapping)} standards.")
    
    questions_by_part = {} # PART1: [list of questions], ...
    
    # Read all questions
    json_files = glob.glob(os.path.join(DATA_DIR, 'questions_PART*.json'))
    all_questions = []
    
    for jf in json_files:
        with open(jf, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
                all_questions.extend(data)
            except json.JSONDecodeError:
                print(f"Error reading {jf}")

    print(f"Total questions loaded: {len(all_questions)}")
    
    updated_count = 0
    
    for q in all_questions:
        std = str(q.get('standard', '')).strip()
        
        if std in mapping:
            new_part, new_chap = mapping[std]
            if q.get('part') != new_part or q.get('chapter') != new_chap:
                q['part'] = new_part
                q['chapter'] = new_chap
                updated_count += 1
        
        # Assign to dict based on (potentially new) part
        p = q.get('part', 'UNKNOWN')
        if p not in questions_by_part:
            questions_by_part[p] = []
        questions_by_part[p].append(q)

    print(f"Updated {updated_count} questions.")

    # Write back
    # We will overwrite existing files and create new ones if needed.
    # Warning: If a PART file becomes empty, we might leave it or delete it. 
    # For now, simply writing what we have.
    
    for part, qs in questions_by_part.items():
        # Sort by chapter, then standard for neatness
        # Chapter sorting might be tricky with "ch1~2", but string sort is better than random
        qs.sort(key=lambda x: (x.get('chapter', ''), x.get('standard', '')))
        
        filename = f"questions_{part}.json"
        filepath = os.path.join(DATA_DIR, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(qs, f, indent=2, ensure_ascii=False)
            print(f"Wrote {len(qs)} questions to {filename}")

if __name__ == "__main__":
    reorganize()
