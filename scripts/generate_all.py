import os
import sys
import subprocess
import time

sys.stdout.reconfigure(encoding='utf-8')

SCRIPTS = [
    ("gen_batch1.py", "Batch 1: Friendly Conversations & Family"),
    ("gen_batch2.py", "Batch 2: Friends & Office"),
    ("gen_business.py", "Batch 3: Business"),
    ("gen_shopping_travel.py", "Batch 4: Shopping & Travel"),
    ("gen_education.py", "Batch 5: College & Education"),
    ("gen_home_food.py", "Batch 6: Home & Food"),
    ("gen_phone.py", "Batch 7: Phone Conversations"),
    ("gen_feelings.py", "Batch 8: Feelings & Emotions"),
    ("gen_health_social.py", "Batch 9: Health & Social Situations"),
]

def main():
    print("🚀 Starting Complete 14-Category Vocabulary Dataset Generation...")
    print("Each category has 300 words and contextual sentences with Malayalam translations.\n")
    
    scripts_dir = os.path.dirname(os.path.abspath(__file__))
    total_start = time.time()
    
    for script_name, description in SCRIPTS:
        script_path = os.path.join(scripts_dir, script_name)
        print(f"\n▶️ Running {description} ({script_name})...")
        start = time.time()
        res = subprocess.run([sys.executable, script_path], cwd=os.path.join(scripts_dir, '..'))
        elapsed = round(time.time() - start, 1)
        if res.returncode != 0:
            print(f"❌ Failed to run {script_name}")
            sys.exit(1)
        print(f"✅ Completed {description} in {elapsed}s")

    total_elapsed = round(time.time() - total_start, 1)
    print(f"\n🎉 ALL 14 CATEGORIES GENERATED AND TRANSLATED IN {total_elapsed}s!")

if __name__ == '__main__':
    main()
