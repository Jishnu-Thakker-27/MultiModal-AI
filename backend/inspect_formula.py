import sqlite3

conn = sqlite3.connect('study_companion.db')
cur = conn.cursor()
cur.execute("SELECT id, content FROM messages WHERE content LIKE '%x_{i+1}%'")
rows = cur.fetchall()
for r in rows:
    print("ID:", r[0])
    lines = [line for line in r[1].split('\n') if 'x_{i+1}' in line or 'Delta' in line]
    for l in lines[:5]:
        print("LINE:", repr(l))
conn.close()
