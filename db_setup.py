import sqlite3
import os

DB_FILE = "chat_history.db"

# Delete old DB if it exists, for a clean start
if os.path.exists(DB_FILE):
    os.remove(DB_FILE)

# Connect to the database (this will create the file)
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# Create the 'messages' table
# This table will store every message from every chat
cursor.execute('''
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_name TEXT NOT NULL,
    sender TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)
''')

print(f"Database '{DB_FILE}' created successfully with 'messages' table.")

# Commit changes and close the connection
conn.commit()
conn.close()