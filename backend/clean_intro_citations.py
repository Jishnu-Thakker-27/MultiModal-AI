import sqlite3

conn = sqlite3.connect('backend/study_companion.db')
cur = conn.cursor()
cur.execute("""
    UPDATE messages 
    SET citations = '[]' 
    WHERE sender = 'assistant' 
      AND (content LIKE '%what do you already know%' OR content LIKE '%what do you think this topic is about%')
""")
conn.commit()
print("Cleaned up", cur.rowcount, "messages.")
conn.close()
