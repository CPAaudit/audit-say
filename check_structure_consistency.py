import json
import os
import re

def load_structure_simple(structure_path):
    chapter_standards = {} # ch_code -> set of standards
    current_part = None
    
    with open(structure_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            # Parse chapter line: - **ch...**: standards
            match = re.search(r'\*\*(ch[\d~-]+.*?)\*\*:\s*(.+)', line, re.IGNORECASE)
            if match:
                ch_code = re.match(r'^(ch[\d~-]+)', match.group(1).strip(), re.IGNORECASE).group(1).lower()
                standards_str = match.group(2)
                standards = [s.strip() for s in standards_str.split(',')]
                chapter_standards[ch_code] = set(standards)
    return chapter_standards

def check_consistency():
    base_dir = r"c:\Users\cntrl\.gemini\antigravity\playground\crimson-lagoon"
    data_dir = os.path.join(base_dir, "data")
    structure_path = os.path.join(base_dir, "structure.md")
    
    chapter_standards = load_structure_simple(structure_path)
    print("Defined structure:")
    for ch, stds in chapter_standards.items():
        print(f"  {ch}: {stds}")
    
    # Map to resolve mappings like ch1 -> ch1~2
    # This mimics utils.py logic simplified
    effective_map = {}
    for ch_code, standards in chapter_standards.items():
        effective_map[ch_code] = ch_code
        if '~' in ch_code:
            try:
                # expand range
                prefix = re.match(r'^([a-zA-Z]+)', ch_code).group(1)
                rng = re.findall(r'\d+', ch_code)
                if len(rng) >= 2:
                    start, end = int(rng[0]), int(rng[1])
                    for i in range(start, end + 1):
                         effective_map[f"{prefix}{i}"] = ch_code
            except: pass

    print("\nEffective Map:")
    # print(effective_map)

    # Check questions
    anomalies = []
    
    for filename in os.listdir(data_dir):
        if filename.startswith("questions_PART") and filename.endswith(".json"):
            filepath = os.path.join(data_dir, filename)
            with open(filepath, 'r', encoding='utf-8') as f:
                try:
                    questions = json.load(f)
                    for q in questions:
                        q_id = q.get('id')
                        q_chap = q.get('chapter')
                        q_std = str(q.get('standard'))
                        
                        # Normalize q_chap
                        if not q_chap: continue
                        
                        # Extract basic ch code
                        # Logic from utils.py:
                        nums = re.findall(r'\d+', q_chap)
                        if not nums: continue
                        
                        match = re.search(r'(\d+(?:-\d+)?)', q_chap)
                        if match:
                             raw_chap = f"ch{match.group(1)}"
                        else:
                             raw_chap = f"ch{nums[0]}"
                        
                        mapped_chap = effective_map.get(raw_chap, raw_chap)
                        
                        # Check if mapped_chap contains the standard
                        # Finds the *correct* chapter for this standard
                        correct_chap = None
                        for ch, stds in chapter_standards.items():
                            if q_std in stds:
                                correct_chap = ch
                                break
                        
                        if correct_chap and correct_chap != mapped_chap:
                            anomalies.append({
                                "file": filename,
                                "id": q_id,
                                "current_chap": q_chap,
                                "mapped_chap": mapped_chap,
                                "standard": q_std,
                                "correct_chap": correct_chap
                            })
                            
                except Exception as e:
                    print(f"Error processing {filename}: {e}")

    print(f"\nFound {len(anomalies)} anomalies:")
    for a in anomalies:
        print(f"[{a['file']} ID:{a['id']}] Std:{a['standard']} | Current: {a['current_chap']} (-> {a['mapped_chap']}) SHOULD BE -> {a['correct_chap']}")

    # Check File Placement Consistency
    print("\nFile Placement Consistency:")
    placement_issues = []
    
    # Also collect stats
    stats = {} # ch -> count

    for filename in os.listdir(data_dir):
        if filename.startswith("questions_PART") and filename.endswith(".json"):
            # Expected PART from filename
            file_part_num = re.search(r'PART(\d+)', filename).group(1)
            file_part = f"PART{file_part_num}"
            
            filepath = os.path.join(data_dir, filename)
            with open(filepath, 'r', encoding='utf-8') as f:
                try:
                    questions = json.load(f)
                    for q in questions:
                        # Check Part
                        q_part = q.get('part')
                        # Normalize part
                        if q_part:
                            q_part_match = re.search(r'PART\s*(\d+)', q_part, re.IGNORECASE)
                            if q_part_match:
                                norm_part = f"PART{q_part_match.group(1)}"
                                if norm_part != file_part:
                                    placement_issues.append(f"[{filename}] ID:{q.get('id')} has {norm_part}, expected {file_part}")
                        
                        # Stats
                        q_chap = q.get('chapter', 'Unknown')
                        stats[q_chap] = stats.get(q_chap, 0) + 1
                        
                except Exception as e: pass

    if placement_issues:
        for p in placement_issues[:10]: # show first 10
            print(p)
        if len(placement_issues) > 10: print(f"... and {len(placement_issues)-10} more")
    else:
        print("All questions are in their correct PART files.")

    print("\nQuestion Counts per Chapter (Raw):")
    for ch, count in sorted(stats.items()):
        print(f"  {ch}: {count}")

if __name__ == "__main__":
    check_consistency()

