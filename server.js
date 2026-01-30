const http = require('http');
const fs = require('fs');
const path = require('path');

// CONFIGURATION: Environment
const PORT = process.env.PORT || 3001;
const DB_FILE = path.join(__dirname, 'database.json');

// GLOBAL STATE (In-Memory Fallback)
let MEMORY_DB = {
  users: [],
  courses: [],
  enrollments: []
};
let USING_MEMORY_DB = false;

// --- Persistence Helpers ---

const initializeDB = () => {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      try {
        MEMORY_DB = JSON.parse(data);
      } catch (e) {
        console.warn("DB Corrupt, resetting to empty.");
        // If corrupt, overwrite with clean state immediately
        writeDB(MEMORY_DB);
      }
    } else {
      // Create new DB file immediately
      writeDB(MEMORY_DB);
    }
  } catch (err) {
    console.error("Critical DB Init Error:", err);
    USING_MEMORY_DB = true;
  }
};

const readDB = () => {
  if (USING_MEMORY_DB) return MEMORY_DB;
  try {
    if (!fs.existsSync(DB_FILE)) return MEMORY_DB;
    const data = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(data);
    
    // Ensure essential collections exist
    if (!parsed.users) parsed.users = [];
    if (!parsed.courses) parsed.courses = [];
    if (!parsed.enrollments) parsed.enrollments = [];
    
    return parsed;
  } catch (err) {
    console.error("Error reading DB:", err);
    return MEMORY_DB;
  }
};

const writeDB = (data) => {
  MEMORY_DB = data;
  if (USING_MEMORY_DB) return;
  
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error writing DB:", err);
    USING_MEMORY_DB = true;
  }
};

// --- Server Setup ---

// Initialize DB immediately on start
initializeDB();

const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
};

const getMimeType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

const server = http.createServer((req, res) => {
  // CORS
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host || 'localhost';
  const url = new URL(req.url, `${protocol}://${host}`);
  const pathname = url.pathname;

  // JSON Response Helper
  const sendJSON = (data, status = 200) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  const readBody = () => new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', (err) => reject(err));
  });

  // --- API Routing ---
  if (pathname.startsWith('/api')) {
    const db = readDB();
    // Normalize: /api/users -> /users
    let route = pathname.substring(4); 
    if (route.length > 1 && route.endsWith('/')) {
        route = route.slice(0, -1);
    }

    try {
      // Health Check
      if (route === '/health') {
        return sendJSON({ status: 'ok', mode: USING_MEMORY_DB ? 'memory' : 'disk' });
      }

      // Users
      if (route === '/users') {
        if (req.method === 'GET') return sendJSON(db.users || []);
        if (req.method === 'POST') {
          readBody().then(user => {
            if (!db.users) db.users = [];
            db.users.push(user);
            writeDB(db);
            sendJSON(user, 201);
          });
          return;
        }
      }
      
      if (route.startsWith('/users/') && req.method === 'PATCH') {
        const id = route.split('/')[2];
        readBody().then(updates => {
          if (!db.users) return sendJSON({ error: 'User not found' }, 404);
          const idx = db.users.findIndex(u => u.id === id);
          if (idx !== -1) {
            db.users[idx] = { ...db.users[idx], ...updates };
            writeDB(db);
            sendJSON(db.users[idx]);
          } else {
            sendJSON({ error: 'User not found' }, 404);
          }
        });
        return;
      }

      // Courses
      if (route === '/courses') {
        if (req.method === 'GET') return sendJSON(db.courses || []);
        if (req.method === 'POST') {
          readBody().then(course => {
            if (!db.courses) db.courses = [];
            db.courses.push(course);
            writeDB(db);
            sendJSON(course, 201);
          });
          return;
        }
      }

      if (route.startsWith('/courses/')) {
        const id = route.split('/')[2];
        if (req.method === 'PUT') {
          readBody().then(course => {
            if (!db.courses) db.courses = [];
            const idx = db.courses.findIndex(c => c.id === id);
            if (idx !== -1) db.courses[idx] = course;
            else db.courses.push(course);
            writeDB(db);
            sendJSON(course);
          });
          return;
        }
        if (req.method === 'DELETE') {
          if (db.courses) {
            db.courses = db.courses.filter(c => c.id !== id);
            writeDB(db);
          }
          return sendJSON({ success: true });
        }
      }

      // Enrollments
      if (route === '/enrollments') {
        if (req.method === 'GET') return sendJSON(db.enrollments || []);
        if (req.method === 'POST') {
          readBody().then(enrollment => {
            if (!db.enrollments) db.enrollments = [];
            const exists = db.enrollments.find(e => e.userId === enrollment.userId && e.courseId === enrollment.courseId);
            if (exists) return sendJSON(exists);
            
            db.enrollments.push(enrollment);
            writeDB(db);
            sendJSON(enrollment, 201);
          });
          return;
        }
      }

      if (route.startsWith('/enrollments/')) {
        const id = route.split('/')[2];
        if (req.method === 'PUT') {
          readBody().then(updates => {
            if (!db.enrollments) return sendJSON({ error: 'Not found' }, 404);
            const idx = db.enrollments.findIndex(e => e.id === id || (e.userId === updates.userId && e.courseId === updates.courseId));
            if (idx !== -1) {
              db.enrollments[idx] = { ...db.enrollments[idx], ...updates };
              writeDB(db);
              sendJSON(db.enrollments[idx]);
            } else {
              sendJSON({ error: 'Enrollment not found' }, 404);
            }
          });
          return;
        }
      }

      console.log(`API Route missing: ${route}`);
      // Ensure we explicitly return 404 JSON, not text/html
      return sendJSON({ error: 'Route not found' }, 404);

    } catch (err) {
      console.error("API Error:", err);
      return sendJSON({ error: 'Internal Server Error' }, 500);
    }
  }

  // --- Static File Serving ---
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  
  // Prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
      fs.createReadStream(filePath).pipe(res);
    } else {
      // SPA Fallback: Serve index.html for unknown non-API routes
      const indexFile = path.join(__dirname, 'index.html');
      fs.stat(indexFile, (err, stats) => {
        if (!err && stats.isFile()) {
           res.writeHead(200, { 'Content-Type': 'text/html' });
           fs.createReadStream(indexFile).pipe(res);
        } else {
           res.writeHead(404);
           res.end('Not Found');
        }
      });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});