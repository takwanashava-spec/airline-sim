import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()

ai_airlines = [
    ("SkyBridge Aggressive", "LHR", "aggressive"),
    ("Velocity Air", "SIN", "aggressive"),
    ("Everest Airways", "ZRH", "cautious"),
    ("Sentinel Airlines", "YYZ", "cautious"),
    ("Aurelia Airways", "DXB", "premium"),
    ("Meridian Prestige", "NRT", "premium"),
    ("HopJet", "MAD", "budget"),
    ("ValueWings", "BKK", "budget"),
    ("Continental Bridge", "ATL", "balanced"),
    ("Pacific Link", "SYD", "balanced"),
]

for name, hub_code, personality in ai_airlines:
    hub = cur.execute("SELECT id FROM airports WHERE iata_code = %s", (hub_code,))
    hub_row = cur.fetchone()
    if not hub_row:
        print(f"Skipping {name}, hub {hub_code} not found")
        continue
    cur.execute("""
        INSERT INTO airlines (name, hub_airport_id, is_ai, ai_personality, cash_balance)
        VALUES (%s, %s, true, %s, 10000000)
    """, (name, hub_row[0], personality))

conn.commit()
print(f"Seeded {len(ai_airlines)} AI airlines")
cur.close()
conn.close()
