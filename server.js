const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();
const port = 3000;

// Middleware
app.use(cors()); // Allows your frontend to talk to this server
app.use(express.json()); // Allows the server to understand JSON data

// Connect to the SQLite database (or create it if it doesn't exist)
const db = new sqlite3.Database(".database.db", (err) => {
  if (err) {
    console.error("Error opening database", err.message);
  } else {
    console.log("Connected to the SQLite database.");
    // Create the single table for contact page submissions if it doesn't exist
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS page_contacts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                email TEXT,
                subject TEXT,
                message TEXT,
                submitted_at TEXT
            )`);
    });
  }
});

// The API endpoint that receives the form data
app.post("/submit-form", (req, res) => {
  // Extract data relevant to the single form
  const { fullName, email, subject, message } = req.body;
  const submitted_at = new Date().toISOString(); // Generate a standardized UTC timestamp

  // Check that required fields are present
  if (!fullName || !email || !subject || !message) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  // Insert into the single 'page_contacts' table
  const sql = `INSERT INTO page_contacts (name, email, subject, message, submitted_at) VALUES (?, ?, ?, ?, ?)`;
  
  // NOTE: 'fullName' from the frontend is mapped to 'name' in the DB
  db.run(sql, [fullName, email, subject, message, submitted_at], function (err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ message: "Error saving your message." });
    }
    res.status(200).json({ message: "Thank you! Your message has been received." });
  });
});

// --- ENDPOINT TO GET ALL CONTACTS (Simplified) ---
app.get("/get-contacts", (req, res) => {
  // Get all contacts from the page_contacts table, newest first
  db.all(
    "SELECT * FROM page_contacts ORDER BY submitted_at DESC",
    [],
    (err, pageRows) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ message: "Error retrieving contacts." });
      }
      // Return the data directly as a list
      res.status(200).json({ pageContacts: pageRows });
    }
  );
});

// --- ENDPOINT TO DELETE A CONTACT ---
app.delete('/delete-contact/:id', (req, res) => {
    // The table name is implicitly 'page_contacts'
    const { id } = req.params;
    const table = 'page_contacts';

    const sql = `DELETE FROM ${table} WHERE id = ?`;

    db.run(sql, id, function(err) {
        if (err) {
            console.error(`Error deleting from ${table}:`, err.message);
            return res.status(500).json({ message: 'Error deleting the entry.' });
        }
        if (this.changes === 0) {
             return res.status(404).json({ message: 'Entry not found.' });
        }
        res.status(200).json({ message: 'Entry deleted successfully.' });
    });
});
  
// --- ENDPOINT TO CLEAR THE TABLE AND RESET ID ---
app.delete('/clear-table', (req, res) => {
    // The table name is implicitly 'page_contacts'
    const table = 'page_contacts';

    const deleteSql = `DELETE FROM ${table}`;
    const resetSql = `DELETE FROM sqlite_sequence WHERE name = ?`;

    db.serialize(() => {
        db.run(deleteSql, function(err) {
            if (err) {
                console.error(`Error clearing ${table}:`, err.message);
                return res.status(500).json({ message: 'Error clearing the table.' });
            }
            
            // Now, reset the sequence
            db.run(resetSql, table, function(err) {
                 if (err) {
                    console.error(`Error resetting sequence for ${table}:`, err.message);
                    return res.status(500).json({ message: 'Error resetting the table ID.' });
                }
                res.status(200).json({ message: `All entries from ${table} cleared successfully.` });
            });
        });
    });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});