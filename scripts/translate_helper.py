import os
import sys
import json
import time
import urllib.request
import urllib.parse

sys.stdout.reconfigure(encoding='utf-8')

OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../src/database/data/categories'))
os.makedirs(OUTPUT_DIR, exist_ok=True)

def translate_single(text, target_lang='ml', source_lang='en'):
    url = f'https://translate.googleapis.com/translate_a/single?client=gtx&sl={source_lang}&tl={target_lang}&dt=t&q=' + urllib.parse.quote(text)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    for attempt in range(4):
        try:
            resp = urllib.request.urlopen(req, timeout=10)
            data = json.loads(resp.read().decode('utf-8'))
            return ''.join([part[0] for part in data[0] if part[0]])
        except Exception as e:
            time.sleep(1 + attempt)
    return text

def translate_batch(texts, target_lang='ml', source_lang='en'):
    if not texts:
        return []
    joined = '\n'.join(texts)
    url = f'https://translate.googleapis.com/translate_a/single?client=gtx&sl={source_lang}&tl={target_lang}&dt=t&q=' + urllib.parse.quote(joined)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    for attempt in range(3):
        try:
            resp = urllib.request.urlopen(req, timeout=15)
            data = json.loads(resp.read().decode('utf-8'))
            acc = ''
            for part in data[0]:
                if part[0]:
                    acc += part[0]
            lines = [l.strip() for l in acc.split('\n')]
            if len(lines) == len(texts):
                return lines
        except Exception:
            time.sleep(1)
    
    # Fallback to individual
    return [translate_single(t, target_lang, source_lang) for t in texts]

def process_and_save_category(slug, category_name, items, batch_size=20):
    print(f"\n==========================================")
    print(f"📦 Processing Category: {category_name} ({slug})")
    print(f"   Total items to process: {len(items)}")
    print(f"==========================================")

    if len(items) != 300:
        print(f"⚠️ WARNING: Expected 300 items, got {len(items)}")

    # Extract words and sentences
    words = [it['word'] for it in items]
    sentences = [it['sentence'] for it in items]

    word_meanings = []
    sentence_meanings = []

    # Translate words in batches
    print(f"🔤 Translating {len(words)} words to Malayalam...")
    for i in range(0, len(words), batch_size):
        chunk = words[i:i+batch_size]
        trans_chunk = translate_batch(chunk)
        word_meanings.extend(trans_chunk)
        print(f"   Words translated: {min(i+batch_size, len(words))}/{len(words)}", end='\r')
        time.sleep(0.1)
    print(f"\n✅ All words translated.")

    # Translate sentences in batches
    print(f"📝 Translating {len(sentences)} sentences to Malayalam...")
    for i in range(0, len(sentences), batch_size):
        chunk = sentences[i:i+batch_size]
        trans_chunk = translate_batch(chunk)
        sentence_meanings.extend(trans_chunk)
        print(f"   Sentences translated: {min(i+batch_size, len(sentences))}/{len(sentences)}", end='\r')
        time.sleep(0.1)
    print(f"\n✅ All sentences translated.")

    # Build final structure
    result = []
    for i, it in enumerate(items):
        result.append({
            "word": it['word'],
            "wordMeaning": word_meanings[i] if i < len(word_meanings) else it['word'],
            "englishText": it['sentence'],
            "malayalamMeaning": sentence_meanings[i] if i < len(sentence_meanings) else it['sentence'],
            "usageExample": it.get('usage', f"Used in {category_name} context."),
            "difficulty": it.get('difficulty', 'BEGINNER')
        })

    # Save to JSON file
    out_file = os.path.join(OUTPUT_DIR, f"{slug}.json")
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"💾 Saved {len(result)} items to {out_file}")
    return len(result)
