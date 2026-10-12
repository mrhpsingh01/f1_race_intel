"""Populate pit stops for 2024, 2025, and 2026 seasons."""
import random
from database import SessionLocal
from sqlalchemy import text

random.seed(42)
db = SessionLocal()

# Team speed profiles (mean ms, std ms, min ms)
TEAM_PROFILES = {
    'Red Bull': (2250, 200, 1950),
    'Red Bull Racing': (2250, 200, 1950),
    'McLaren': (2300, 220, 1980),
    'Ferrari': (2350, 250, 2050),
    'Mercedes': (2400, 260, 2100),
    'Aston Martin': (2650, 300, 2250),
    'Williams': (2700, 320, 2300),
    'Alpine': (2800, 350, 2350),
    'RB': (2850, 350, 2380),
    'Haas': (2900, 380, 2400),
    'Haas F1 Team': (2900, 380, 2400),
    'Kick Sauber': (3100, 450, 2500),
}

for season in [2024, 2025, 2026]:
    races = db.execute(text("""
        SELECT r.id, r.round, r.name 
        FROM races r 
        WHERE r.season = :s AND r.status = 'completed'
        ORDER BY r.round
    """), {'s': season}).fetchall()
    
    total_stops = 0
    for r in races:
        # Find or create RACE session
        race_sess = db.execute(text("""
            SELECT id FROM sessions 
            WHERE race_id = :rid AND session_type = 'RACE'
        """), {'rid': r.id}).fetchone()
        
        if not race_sess:
            sess_id = db.execute(text("""
                INSERT INTO sessions (race_id, session_type, status)
                VALUES (:rid, 'RACE', 'completed')
                RETURNING id
            """), {'rid': r.id}).fetchone()[0]
        else:
            sess_id = race_sess[0]
            
        # Delete existing pit stops for this session to avoid duplication
        db.execute(text("DELETE FROM pit_stops WHERE session_id = :sid"), {'sid': sess_id})
        
        # Get drivers and constructors who participated in this race
        entries = db.execute(text("""
            SELECT d.id as driver_id, d.code, COALESCE(c.name, 'Independent') as team_name, rr.stops
            FROM race_results rr
            JOIN drivers d ON d.id = rr.driver_id
            LEFT JOIN entries e ON e.race_id = rr.race_id AND e.driver_id = d.id
            LEFT JOIN constructors c ON c.id = e.constructor_id
            WHERE rr.race_id = :rid
        """), {'rid': r.id}).fetchall()
        
        for entry in entries:
            num_stops = entry.stops if entry.stops and entry.stops > 0 else random.choice([1, 1, 2, 2, 2, 3])
            team = entry.team_name
            mean_ms, std_ms, min_ms = TEAM_PROFILES.get(team, (2700, 300, 2200))
            
            laps = sorted(random.sample(range(12, 52), min(num_stops, 3)))
            for stop_num, stop_lap in enumerate(laps, 1):
                # 3% chance of a slow stop / stuck wheel nut
                if random.random() < 0.03:
                    duration = random.randint(4500, 9500)
                else:
                    duration = max(min_ms, int(random.gauss(mean_ms, std_ms)))
                
                db.execute(text("""
                    INSERT INTO pit_stops (session_id, driver_id, lap, duration_ms, stop_number)
                    VALUES (:sid, :did, :lap, :dur, :stop_num)
                """), {
                    'sid': sess_id,
                    'did': entry.driver_id,
                    'lap': stop_lap,
                    'dur': duration,
                    'stop_num': stop_num
                })
                total_stops += 1
                
    db.commit()
    print(f'Season {season}: inserted {total_stops} pit stops across {len(races)} races.')

db.close()
print('Pit stop population complete!')
