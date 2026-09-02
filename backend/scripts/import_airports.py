import csv
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()

BATCH_SIZE = 500

rows_to_insert = []
total_inserted = 0

def flush_batch(batch):
    global total_inserted
    if not batch:
        return
    args_str = ",".join(
        cur.mogrify("(%s,%s,%s,%s,%s,%s,%s,%s)", row).decode("utf-8")
        for row in batch
    )
    cur.execute(f"""
        INSERT INTO airports (iata_code, icao_code, name, city, country, latitude, longitude, airport_size)
        VALUES {args_str}
        ON CONFLICT (iata_code) DO NOTHING
    """)
    conn.commit()
    total_inserted += len(batch)
    print(f"Inserted so far: {total_inserted}")

with open("scripts/airports.csv", newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row["type"] not in ("large_airport", "medium_airport"):
            continue
        if not row["iata_code"]:
            continue
        rows_to_insert.append((
            row["iata_code"],
            row["gps_code"] or row["ident"],
            row["name"],
            row["municipality"],
            row["iso_country"],
            float(row["latitude_deg"]) if row["latitude_deg"] else None,
            float(row["longitude_deg"]) if row["longitude_deg"] else None,
            row["type"]
        ))
        if len(rows_to_insert) >= BATCH_SIZE:
            flush_batch(rows_to_insert)
            rows_to_insert = []

flush_batch(rows_to_insert)

print(f"Done. Total processed: {total_inserted}")
cur.close()
conn.close()
