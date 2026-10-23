import os
import sys
import json
from translate_helper import OUTPUT_DIR, translate_batch

sys.stdout.reconfigure(encoding='utf-8')

TOPUP_DATA = {
    "business": [
        ("equity", "Private equity firms invest patient capital into promising manufacturing ventures.", "Investment capital.", "ADVANCED")
    ],
    "shopping": [
        ("cash register", "The antique cash register had brass number keys and a mechanical bell.", "Billing device.", "BEGINNER"),
        ("price cut", "The electronic retailer announced a massive festival price cut on laptops.", "Discount.", "BEGINNER"),
        ("gift voucher", "She redeemed her birthday gift voucher to buy an espresso coffee maker.", "Promo card.", "INTERMEDIATE"),
        ("shopper", "A savvy shopper compares online prices before making in-store purchases.", "Consumer.", "INTERMEDIATE")
    ],
    "friends": [
        ("sidekick", "His younger brother acted as his enthusiastic sidekick during neighborhood cricket matches.", "Faithful helper.", "BEGINNER"),
        ("chum", "He ran into an old school chum while waiting at the railway station.", "Close pal.", "BEGINNER"),
        ("heart-to-heart", "We had a sincere heart-to-heart conversation on the quiet terrace.", "Deep talk.", "INTERMEDIATE"),
        ("ally", "A dependable ally will stand beside you when others question your integrity.", "Supporter.", "INTERMEDIATE"),
        ("kindred spirit", "She discovered a true kindred spirit who shared her passion for classical painting.", "Soulmate peer.", "ADVANCED")
    ],
    "travel-and-transportation": [
        ("seaport", "The ancient seaport of Muziris welcomed Roman and Greek merchant ships.", "Harbor.", "BEGINNER"),
        ("layover", "We had a pleasant two-hour flight layover in the modern Doha airport lounge.", "Flight wait.", "BEGINNER"),
        ("tram", "Electric trams glide quietly down the historic European cobblestone boulevards.", "Street rail.", "INTERMEDIATE"),
        ("monorail", "The elevated monorail offers rapid transit across crowded financial districts.", "Single rail transit.", "INTERMEDIATE"),
        ("wayfarer", "The weary wayfarer rested under the sprawling shade of the banyan tree.", "Traveler on foot.", "ADVANCED"),
        ("seafarer", "Generations of brave seafarers navigated the Indian Ocean following monsoon winds.", "Sailor.", "ADVANCED")
    ],
    "phone-conversations": [
        ("touchscreen", "The modern capacitive touchscreen registers delicate multi-finger gestures.", "Touch display.", "BEGINNER"),
        ("dial tone", "Pick up the handset and listen for the continuous dial tone before dialing.", "Phone audio tone.", "BEGINNER"),
        ("missed call", "He noticed two missed calls from his sister and called her back immediately.", "Unanswered call.", "BEGINNER"),
        ("speakerphone", "Switch on the speakerphone so the whole family can join the video greetings.", "Hands-free phone.", "INTERMEDIATE"),
        ("voice call", "A quick voice call is often far more personal than sending dozens of texts.", "Voice telephone.", "INTERMEDIATE")
    ],
    "feelings-and-emotions": [
        ("gladness", "Her heart was filled with radiant gladness as she held her grandchild.", "Deep joy.", "BEGINNER"),
        ("peacefulness", "The dawn meditation filled the room with an aura of unbroken peacefulness.", "Calm state.", "BEGINNER"),
        ("yearning", "The homesick student felt an intense yearning for his mother's home cooking.", "Deep longing.", "INTERMEDIATE"),
        ("heartache", "With time and patient companionship, the sharp heartache of loss begins to soften.", "Deep grief.", "INTERMEDIATE"),
        ("wistful", "She cast a wistful backward glance at the family home before driving away.", "Yearningly pensive.", "INTERMEDIATE"),
        ("equanimity", "The venerable monk faced both lavish praise and bitter blame with equanimity.", "Balanced poise.", "ADVANCED"),
        ("forbearance", "Practicing patient forbearance prevents trivial arguments from escalating into feuds.", "Self-restraint.", "ADVANCED"),
        ("solicitude", "Her tender maternal solicitude was evident in every warm sweater she knitted.", "Caring concern.", "ADVANCED"),
        ("magnanimity", "In a display of magnanimity, he congratulated his political rival on the victory.", "Noble generosity.", "ADVANCED"),
        ("unflappable", "The captain remained completely unflappable as the storm battered the vessel.", "Imperturbable.", "ADVANCED")
    ],
    "college-and-education": [
        ("slate", "Village primary school children used to practice Malayalam alphabets on wooden slates.", "Writing slate.", "BEGINNER"),
        ("eraser", "Use a soft vinyl eraser to remove pencil guide lines from your engineering drawing.", "Rubbing tool.", "BEGINNER"),
        ("ruler", "Draw a crisp straight margin along the left edge using a plastic ruler.", "Measuring scale.", "BEGINNER"),
        ("compass", "Use a brass drawing compass to construct accurate geometric circles.", "Geometry tool.", "BEGINNER"),
        ("atlas", "The geography student studied tectonic plate boundaries in the world atlas.", "Map book.", "BEGINNER"),
        ("scholar", "A visiting Fulbright scholar delivered a seminar on renewable energy policy.", "Academic.", "INTERMEDIATE"),
        ("pedagogy", "Innovative teaching pedagogy incorporates collaborative problem-based group work.", "Teaching method.", "INTERMEDIATE"),
        ("alumnus", "The distinguished alumnus funded a state-of-the-art computer science laboratory.", "Past student.", "INTERMEDIATE"),
        ("doctorate", "She completed her scientific doctorate in biotechnology with highest distinction.", "Ph.D. degree.", "INTERMEDIATE"),
        ("laureate", "The Nobel laureate urged young researchers to remain relentlessly curious about nature.", "Prize winner.", "ADVANCED"),
        ("erudite", "The erudite professor answered every complex question with effortless clarity.", "Learned.", "ADVANCED")
    ],
    "family": [
        ("godmother", "Her godmother presented her with an engraved silver locket for her baptism.", "Spiritual mother.", "BEGINNER"),
        ("godfather", "His godfather sponsored his primary school education and musical training.", "Spiritual father.", "BEGINNER"),
        ("kinsman", "All the village kinsmen gathered at the ancestral courtyard for the annual festival.", "Relative.", "BEGINNER"),
        ("kinswoman", "The wise kinswoman settled the property dispute between the cousins amicably.", "Female relative.", "BEGINNER"),
        ("stepdaughter", "She treated her stepdaughter with the exact same tender love as her own children.", "Spouse's daughter.", "BEGINNER"),
        ("stepson", "His stepson designed the layout for the family's new organic farm retreat.", "Spouse's son.", "BEGINNER"),
        ("great-uncle", "Our great-uncle served as a decorated captain in the merchant navy for thirty years.", "Grandparent brother.", "INTERMEDIATE"),
        ("great-aunt", "Great-aunt Mary made the most delicious plum cake every Christmas season.", "Grandparent sister.", "INTERMEDIATE"),
        ("kinfolk", "The harvest festival was an occasion for kinfolk from across the state to reunite.", "Family relations.", "INTERMEDIATE"),
        ("foster parent", "The compassionate foster parents provided a safe, loving home for the orphaned twins.", "Care parent.", "INTERMEDIATE"),
        ("matriarch", "The venerable family matriarch lived to celebrate her one-hundredth birthday in good health.", "Female leader.", "ADVANCED"),
        ("patriarch", "The respected patriarch guided four generations with wisdom, patience, and love.", "Male leader.", "ADVANCED")
    ],
    "home-and-daily-life": [
        ("broom", "Use a soft coconut-leaf broom to sweep the courtyard clean every morning.", "Sweeping tool.", "BEGINNER"),
        ("dustpan", "Collect the swept dust into the plastic dustpan and empty it into the bin.", "Cleaning pan.", "BEGINNER"),
        ("scrub", "Use a coconut coir pad to scrub the clay cooking pot until spotless.", "Clean vigorously.", "BEGINNER"),
        ("sponge", "A damp cellulose sponge wipes kitchen counter spills quickly and cleanly.", "Absorbent pad.", "BEGINNER"),
        ("bucket", "Draw a bucket of cool, sweet drinking water from the ancestral well.", "Pail.", "BEGINNER"),
        ("mug", "Keep a plastic bathing mug beside the water bucket in the bathroom.", "Bathing cup.", "BEGINNER"),
        ("doormat", "Wipe your wet sandals thoroughly on the coir doormat before entering the hall.", "Floor mat.", "BEGINNER"),
        ("hanger", "Hang your ironed shirts on sturdy wooden clothes hangers inside the wardrobe.", "Closet hook.", "BEGINNER"),
        ("clothespin", "Secure the bedsheets to the terrace clothesline using colorful plastic clothespins.", "Laundry clip.", "BEGINNER"),
        ("clothesline", "Mother tied a strong nylon clothesline across the sunny terrace for drying laundry.", "Drying rope.", "BEGINNER"),
        ("dustbin", "Segregate kitchen food waste into the green biodegradable dustbin daily.", "Trash can.", "BEGINNER"),
        ("sponge", "Rinse the cleaning sponge thoroughly after washing the dinner plates.", "Wipe pad.", "BEGINNER"),
        ("colander", "Drain the boiled tapioca roots in a large stainless steel colander.", "Straining bowl.", "INTERMEDIATE"),
        ("grater", "Use a stainless steel box grater to shred fresh coconut for the dessert.", "Shredding tool.", "INTERMEDIATE"),
        ("peeler", "A sharp vegetable peeler strips potato skins in seconds without wasting flesh.", "Peeling blade.", "INTERMEDIATE"),
        ("tongs", "Use silicone-tipped kitchen tongs to turn hot parottas safely over the iron skillet.", "Gripping tool.", "INTERMEDIATE"),
        ("whisk", "Whisk the yogurt, water, ginger, and green chilies together to make refreshing sambharam.", "Beating tool.", "INTERMEDIATE"),
        ("rolling pin", "Roll out the whole wheat dough into thin, even circles using a wooden rolling pin.", "Dough roller.", "INTERMEDIATE"),
        ("saucepan", "Heat the milk and tea leaves together in a small copper-bottomed saucepan.", "Cooking pan.", "INTERMEDIATE"),
        ("pressure cooker", "Cooking lentils inside an aluminum pressure cooker saves fuel and time.", "Sealed pot.", "INTERMEDIATE"),
        ("spatula", "Flip the fluffy golden appam gently using a non-stick wooden spatula.", "Turning tool.", "INTERMEDIATE"),
        ("ladle", "Use a deep brass ladle to serve generous portions of steaming vegetable sambar.", "Serving spoon.", "INTERMEDIATE"),
        ("casserole", "Keep the freshly baked flatbreads warm inside an insulated thermal casserole.", "Thermal dish.", "INTERMEDIATE"),
        ("thermos", "Fill the stainless steel thermos flask with boiling hot black tea for travel.", "Insulated flask.", "INTERMEDIATE"),
        ("masonry", "The sturdy laterite stone masonry of the foundation has withstood fifty monsoons.", "Stonework.", "ADVANCED"),
        ("carpentry", "Traditional wooden joinery in the ceiling rafters displays master carpentry.", "Woodworking.", "ADVANCED")
    ],
    "food-and-restaurants": [
        ("curd", "A bowl of chilled homemade curd with a pinch of salt aids digestion after lunch.", "Yogurt.", "BEGINNER"),
        ("buttermilk", "Spiced buttermilk seasoned with ginger, shallots, and curry leaves cools the body.", "Sambharam.", "BEGINNER"),
        ("pickle", "Traditional spicy lime pickle adds an irresistible punch to a simple curd-rice meal.", "Achar.", "BEGINNER"),
        ("chutney", "Freshly ground coconut and green chili chutney is the soulmate of hot steamed idlis.", "Condiment paste.", "BEGINNER"),
        ("sambar", "A rich, steaming bowl of vegetable sambar is filled with drumsticks and pumpkins.", "Lentil stew.", "BEGINNER"),
        ("rasam", "Tangy tomato and black pepper rasam is a comforting, therapeutic southern broth.", "Spiced broth.", "BEGINNER"),
        ("papad", "Crispy fried lentil papads provide a delightful crunch to any festive sadhya feast.", "Crispy wafer.", "BEGINNER"),
        ("payasam", "Rich rice ada payasam cooked in jaggery and coconut milk is a festive masterpiece.", "Sweet pudding.", "BEGINNER"),
        ("halwa", "Sweet wheat halwa glistening with ghee and roasted cashew nuts melts in your mouth.", "Confection.", "BEGINNER"),
        ("ladoo", "Golden motichoor ladoos were distributed to all guests celebrating the baby's birth.", "Sweet ball.", "BEGINNER"),
        ("jalebi", "Crispy golden jalebis soaked in fragrant saffron sugar syrup are served hot.", "Syrup sweet.", "BEGINNER"),
        ("biryani", "Fragrant kaima rice layered with spiced chicken creates an authentic Thalassery biryani.", "Spiced rice dish.", "BEGINNER"),
        ("porotta", "Flaky, layered Malabar porottas served with spicy beef roast is a legendary street food.", "Layered flatbread.", "BEGINNER"),
        ("appam", "Lacy, bowl-shaped fermented rice appams are soft and fluffy in the center.", "Rice pancake.", "BEGINNER"),
        ("puttu", "Steamed cylindrical rice puttu layered with grated coconut is a breakfast classic.", "Steamed rice cake.", "BEGINNER"),
        ("dosa", "A paper-thin crispy ghee roast dosa served with three fresh chutneys is unbeatable.", "Crisp crepe.", "BEGINNER"),
        ("idli", "Soft, pillowy steamed idlis are naturally fermented, oil-free, and easy to digest.", "Steamed rice cake.", "BEGINNER"),
        ("vada", "Golden crispy medu vadas dipped in piping hot sambar make a classic tea-time snack.", "Lentil fritter.", "BEGINNER"),
        ("bhaji", "Hot onion bhajis fried in chickpea batter are heavenly on rainy monsoon afternoons.", "Fritter snack.", "BEGINNER"),
        ("samosa", "Crispy triangular pastry samosas stuffed with spiced potatoes are served with mint sauce.", "Stuffed pastry.", "BEGINNER"),
        ("noodles", "Stir-fried vegetable noodles with soy sauce and spring onions is a popular dinner.", "Wheat strands.", "BEGINNER"),
        ("pasta", "Italian penne pasta tossed in creamy garlic tomato sauce is a family favorite.", "Italian noodles.", "BEGINNER"),
        ("sandwich", "Mother packed a wholesome toasted cheese and vegetable sandwich for the school picnic.", "Bread snack.", "BEGINNER"),
        ("roll", "A hot chicken kathi roll wrapped in a flaky paratha makes a quick lunch on the go.", "Bread wrap.", "BEGINNER"),
        ("soup bowl", "The waiter served creamy sweet corn soup in a matching porcelain soup bowl.", "Deep dish.", "BEGINNER"),
        ("gravy", "Pour generous ladlefuls of aromatic chicken gravy over your fragrant ghee rice.", "Curry sauce.", "BEGINNER"),
        ("appetite", "The tempting aroma of roasting spices and garlic aroused everyone's appetite.", "Hunger urge.", "INTERMEDIATE"),
        ("simmering", "Keep the mutton curry simmering on low heat so the meat absorbs the roasted coconut paste.", "Gentle boiling.", "INTERMEDIATE"),
        ("seasoning", "A final seasoning of mustard seeds, dried red chilies, and curry leaves completes the dal.", "Tadka tempering.", "INTERMEDIATE"),
        ("garnishing", "Garnishing the steaming biryani with fresh mint leaves adds color and fragrant aroma.", "Topping food.", "INTERMEDIATE"),
        ("tenderize", "Marinating meat with grated raw papaya helps naturally tenderize tough fibers.", "Make soft.", "INTERMEDIATE"),
        ("caramelizing", "Slowly caramelizing onions in pure ghee creates the rich base for the gravy.", "Sugar browning.", "INTERMEDIATE"),
        ("blanching", "Blanching almonds in boiling water for thirty seconds makes peeling their skins effortless.", "Brief scalding.", "INTERMEDIATE"),
        ("fermenting", "Fermenting the rice and black gram batter overnight creates natural probiotic cultures.", "Yeast culture.", "INTERMEDIATE"),
        ("confectionery", "The heritage French bakery crafts exquisite almond croissants and sweet confectionery.", "Pastry sweets.", "INTERMEDIATE"),
        ("succulent", "The coastal tiger prawns were succulent, juicy, and bursting with fresh pepper flavors.", "Juicy texture.", "ADVANCED"),
        ("delectability", "The sheer delectability of the slow-cooked duck roast drew praise from all diners.", "Delicious quality.", "ADVANCED"),
        ("ambrosial", "Drinking chilled coconut water under the midday tropical sun felt truly ambrosial.", "Food of gods.", "ADVANCED"),
        ("degustation", "The seaside fine dining resort presented an exquisite ten-course coastal degustation menu.", "Tasting journey.", "ADVANCED"),
        ("sommelier", "The certified master sommelier recommended a crisp white wine to complement the grilled fish.", "Wine specialist.", "ADVANCED"),
        ("gastronome", "The visiting international gastronome wrote an article celebrating Kerala's spice heritage.", "Culinary philosopher.", "ADVANCED")
    ],
    "health-and-appointments": [
        ("scalpel", "The surgeon held the sterile surgical scalpel with steady, practiced precision.", "Surgical blade.", "BEGINNER"),
        ("syringe", "The nurse filled the disposable plastic syringe with the prescribed antibiotic dose.", "Injection tube.", "BEGINNER"),
        ("gauze", "Apply a sterile medicated gauze pad over the clean cut before taping it securely.", "Wound mesh.", "BEGINNER"),
        ("stethoscope", "The physician warmed the stethoscope chest piece before placing it on the child's back.", "Listening tool.", "BEGINNER"),
        ("thermometer", "The digital clinical thermometer beeped softly to display a normal body temperature.", "Heat reader.", "BEGINNER"),
        ("inhaler", "Asthmatic patients should always keep their rescue bronchodilator inhaler within arm's reach.", "Breathing device.", "BEGINNER"),
        ("ointment", "Gently rub the analgesic herbal ointment over the stiff neck muscles before sleeping.", "Medicated paste.", "BEGINNER"),
        ("lozenge", "Suck on a honey and lemon throat lozenge to soothe a dry, hacking ticklish cough.", "Throat sweet.", "BEGINNER"),
        ("tincture", "Apply a few drops of iodine tincture around the scraped knee to prevent infection.", "Antiseptic solution.", "BEGINNER"),
        ("dressing", "Visit the community health clinic daily to have your surgical dressing changed hygienically.", "Wound covering.", "BEGINNER"),
        ("suture", "The casualty doctor placed four neat dissolvable sutures to close the forehead cut.", "Medical stitch.", "INTERMEDIATE"),
        ("splint", "The paramedic applied a rigid padded splint to immobilize the fractured forearm.", "Limb support.", "INTERMEDIATE"),
        ("tourniquet", "Apply a tight medical tourniquet above an arterial limb wound to halt catastrophic hemorrhage.", "Bleeding clamp.", "INTERMEDIATE"),
        ("defibrillator", "The public airport terminal is equipped with automated external defibrillator stations.", "Heart shock unit.", "INTERMEDIATE"),
        ("incubator", "Premature newborn infants are cared for inside temperature-controlled hospital incubators.", "Baby chamber.", "INTERMEDIATE"),
        ("ventilator", "Advanced mechanical ventilators supported the patient's breathing during lung infection.", "Respirator.", "INTERMEDIATE"),
        ("cannula", "The staff nurse inserted an intravenous cannula into the vein on the back of his hand.", "IV needle tube.", "INTERMEDIATE"),
        ("catheter", "Surgeons inserted a flexible urinary catheter following the major pelvic procedure.", "Medical drain tube.", "INTERMEDIATE"),
        ("biopsy", "The laboratory technician prepared thin tissue biopsy slices for microscopic inspection.", "Sample analysis.", "INTERMEDIATE"),
        ("pathologist", "The clinical pathologist examined the blood smear to detect malarial parasites.", "Lab MD.", "INTERMEDIATE"),
        ("radiologist", "The consultant radiologist interpreted the complex high-resolution brain MRI scans.", "Imaging MD.", "INTERMEDIATE"),
        ("pharmacologist", "The medical pharmacologist conducted clinical trials investigating the new cardiac drug.", "Drug scientist.", "INTERMEDIATE"),
        ("immunologist", "Consult an allergy immunologist to identify specific triggers causing your chronic hives.", "Immune MD.", "INTERMEDIATE"),
        ("neurologist", "The neurologist conducted nerve conduction studies to evaluate numbness in the legs.", "Nerve MD.", "INTERMEDIATE"),
        ("cardiologist", "The intervention cardiologist successfully implanted a stent to restore coronary blood flow.", "Heart MD.", "INTERMEDIATE"),
        ("endocrinologist", "An endocrinologist specializes in optimizing insulin and thyroid hormonal balance.", "Hormone MD.", "ADVANCED"),
        ("nephrologist", "The nephrologist monitored kidney filtration rates and managed fluid electrolyte balances.", "Kidney MD.", "ADVANCED")
    ],
    "social-situations": [
        ("jubilee", "The historic public library celebrated its centenary jubilee with an international book fair.", "Anniversary milestone.", "BEGINNER"),
        ("gathering", "A peaceful community gathering was held in the central park to promote communal harmony.", "Public assembly.", "BEGINNER"),
        ("celebration", "The entire coastal town joined in the colorful boat race festival celebration.", "Festive event.", "BEGINNER"),
        ("anniversary", "The loving couple celebrated their golden wedding anniversary surrounded by grandchildren.", "Yearly milestone.", "BEGINNER"),
        ("ceremony", "The traditional lamp-lighting ceremony officially inaugurated the state arts festival.", "Formal ritual.", "BEGINNER"),
        ("banquet", "The governor hosted a formal state banquet in honor of visiting foreign ambassadors.", "Grand feast.", "BEGINNER"),
        ("reception", "The wedding reception featured live classical violin music and a multi-course dinner.", "Social party.", "BEGINNER"),
        ("fellowship", "Shared cultural festivals promote communal solidarity, empathy, and social fellowship.", "Mutual bond.", "BEGINNER"),
        ("hospitality", "Southern Kerala is renowned for its generous, heartwarming, and open domestic hospitality.", "Warm reception.", "BEGINNER"),
        ("cordiality", "The two neighboring communities resolved their festival boundary issue in cordiality.", "Civil warmth.", "BEGINNER"),
        ("congratulations", "We sent our warmest congratulations to the young poet on winning the national Sahitya award.", "Felicitations.", "BEGINNER"),
        ("reunion", "Our college batch organized an emotional silver jubilee reunion at the lakeside resort.", "Coming together.", "BEGINNER"),
        ("farewell", "Teachers and students gathered in the auditorium to bid an emotional farewell to the principal.", "Parting tribute.", "BEGINNER"),
        ("homecoming", "The annual festival serves as a joyous homecoming for thousands working in the Gulf.", "Returning home.", "BEGINNER"),
        ("tradition", "Making flower carpets in front yards on festival mornings is an ancient living tradition.", "Cultural heritage.", "BEGINNER"),
        ("heritage", "Preserving classical performing arts like Kathakali protects our irreplaceable cultural heritage.", "Ancestral legacy.", "BEGINNER"),
        ("folklore", "The grandmother narrated captivating folklore about benevolent forest spirits and rivers.", "Folk stories.", "BEGINNER"),
        ("felicitation", "The cultural council held a public felicitation honoring thirty distinguished veteran teachers.", "Public praise.", "INTERMEDIATE"),
        ("commemoration", "A solemn public commemoration honored the valiant rescue workers of the coastal floods.", "Memorial service.", "INTERMEDIATE"),
        ("procession", "A majestic elephant procession accompanied by eighty percussion drummers circled the temple.", "Festive parade.", "INTERMEDIATE"),
        ("extravaganza", "The annual youth arts festival was a dazzling three-day musical and theatrical extravaganza.", "Spectacular show.", "INTERMEDIATE"),
        ("recital", "She gave a mesmerizing solo vocal recital of classical devotional melodies in the shrine.", "Solo concert.", "INTERMEDIATE"),
        ("ovation", "The dramatic stage performance concluded to a thunderous, emotional standing ovation.", "Enthusiastic cheer.", "INTERMEDIATE"),
        ("philanthropist", "The generous philanthropist donated five acres of land to build a public sports complex.", "Charity patron.", "INTERMEDIATE"),
        ("toastmaster", "The witty toastmaster kept the wedding banquet audience chuckling with humorous anecdotes.", "MC host.", "INTERMEDIATE"),
        ("etiquette", "Observing polite social etiquette ensures that every guest feels comfortable and respected.", "Social manners.", "INTERMEDIATE"),
        ("decorum", "All assembly members are expected to uphold the historical decorum of the legislative hall.", "Proper conduct.", "INTERMEDIATE"),
        ("urbanity", "The ambassador's cosmopolitan urbanity and diplomatic charm won over every table guest.", "Refined poise.", "INTERMEDIATE"),
        ("punctilious", "She was punctilious about mailing handwritten thank-you notes within forty-eight hours.", "Meticulously polite.", "INTERMEDIATE"),
        ("convivial", "We spent a deeply convivial evening sharing stories around the glowing garden fireplace.", "Festively social.", "INTERMEDIATE"),
        ("bonhomie", "A buoyant atmosphere of warm bonhomie permeated the festival gathering as comrades embraced.", "Genial heartiness.", "INTERMEDIATE"),
        ("magnanimity", "In a display of magnanimity, the victor commended his opponent's spirited competitive effort.", "Noble generosity.", "ADVANCED"),
        ("munificence", "The new community hospital wing was constructed through the munificence of an overseas alumnus.", "Splendid giving.", "ADVANCED"),
        ("panegyric", "The orator delivered a soaring panegyric celebrating the selfless lives of primary school teachers.", "Laudatory speech.", "ADVANCED"),
        ("eulogy", "The community assembled in silent reverent mourning to deliver a moving eulogy for their elder.", "Funeral tribute.", "ADVANCED"),
        ("esprit de corps", "The demanding disaster relief effort forged a legendary esprit de corps among the fishermen.", "United spirit.", "ADVANCED")
    ]
}

def main():
    print("🚀 Top-up script running to ensure EVERY category has EXACTLY 300 items...")
    
    for slug, new_tuples in TOPUP_DATA.items():
        file_path = os.path.join(OUTPUT_DIR, f"{slug}.json")
        if not os.path.exists(file_path):
            print(f"⚠️ {file_path} not found, skipping.")
            continue
            
        with open(file_path, 'r', encoding='utf-8') as f:
            existing = json.load(f)
            
        needed = 300 - len(existing)
        if needed <= 0:
            print(f"✅ {slug} already has {len(existing)} items.")
            continue
            
        print(f"\n📦 {slug}: Currently {len(existing)} items. Adding {needed} items to reach 300...")
        to_add = new_tuples[:needed]
        
        words = [t[0] for t in to_add]
        sentences = [t[1] for t in to_add]
        
        word_trans = translate_batch(words)
        sentence_trans = translate_batch(sentences)
        
        for i, t in enumerate(to_add):
            existing.append({
                "word": t[0],
                "wordMeaning": word_trans[i] if i < len(word_trans) else t[0],
                "englishText": t[1],
                "malayalamMeaning": sentence_trans[i] if i < len(sentence_trans) else t[1],
                "usageExample": t[2],
                "difficulty": t[3]
            })
            
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(existing, f, ensure_ascii=False, indent=2)
            
        print(f"🎉 {slug} updated to EXACTLY {len(existing)} items!")

if __name__ == '__main__':
    main()
