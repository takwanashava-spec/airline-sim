import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()

aircraft = [
    ("Cessna Grand Caravan", "Cessna", 1200, 9, 340, 90, 2500000, 15000, 2000),
    ("Embraer ERJ-145", "Embraer", 2500, 50, 830, 900, 22000000, 120000, 4500),
    ("Bombardier CRJ-900", "Bombardier", 2900, 90, 850, 1100, 35000000, 180000, 5000),
    ("Embraer E175", "Embraer", 3300, 88, 870, 1200, 40000000, 200000, 5500),
    ("Embraer E195-E2", "Embraer", 4800, 132, 870, 1500, 55000000, 260000, 5700),
    ("Airbus A220-300", "Airbus", 6300, 160, 870, 1600, 65000000, 300000, 5000),
    ("Boeing 737-700", "Boeing", 6000, 140, 840, 2400, 70000000, 320000, 6000),
    ("Boeing 737-800", "Boeing", 5400, 189, 840, 2600, 95000000, 400000, 6500),
    ("Boeing 737 MAX 8", "Boeing", 6570, 189, 840, 2200, 121000000, 450000, 6500),
    ("Airbus A320", "Airbus", 6100, 180, 830, 2500, 98000000, 410000, 6500),
    ("Airbus A320neo", "Airbus", 6500, 180, 830, 2100, 110000000, 440000, 6500),
    ("Airbus A321neo", "Airbus", 7400, 220, 830, 2400, 129000000, 480000, 7000),
    ("Boeing 757-200", "Boeing", 7250, 200, 850, 3400, 80000000, 350000, 7000),
    ("Airbus A330-300", "Airbus", 11750, 335, 870, 6900, 260000000, 900000, 8500),
    ("Airbus A330-900neo", "Airbus", 13300, 287, 900, 5800, 296000000, 1000000, 8500),
    ("Boeing 767-300ER", "Boeing", 11000, 269, 850, 6300, 200000000, 750000, 8000),
    ("Boeing 787-8", "Boeing", 13600, 248, 900, 5400, 248000000, 950000, 9000),
    ("Boeing 787-9", "Boeing", 14000, 296, 900, 5760, 292000000, 1050000, 9000),
    ("Airbus A350-900", "Airbus", 15000, 325, 910, 6000, 317000000, 1150000, 9500),
    ("Airbus A350-1000", "Airbus", 16100, 369, 910, 6700, 366000000, 1300000, 10000),
    ("Boeing 777-200ER", "Boeing", 13080, 314, 900, 7600, 296000000, 1100000, 9500),
    ("Boeing 777-300ER", "Boeing", 13650, 396, 900, 7900, 375000000, 1250000, 10000),
    ("Boeing 747-8", "Boeing", 14320, 467, 910, 10500, 418000000, 1500000, 10500),
    ("Airbus A380-800", "Airbus", 15200, 555, 900, 12000, 445000000, 1600000, 11000),
    ("ATR 72-600", "ATR", 1500, 72, 510, 700, 27000000, 140000, 4200),
]

for a in aircraft:
    cur.execute("""
        INSERT INTO aircraft_types
        (name, manufacturer, max_range_km, seat_capacity, cruise_speed_kmh, fuel_burn_lph, purchase_price, lease_price_monthly, min_runway_ft)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """, a)

conn.commit()
print(f"Inserted {len(aircraft)} aircraft types")
cur.close()
conn.close()
