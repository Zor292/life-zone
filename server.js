const express = require('express');
const fs = require('fs');
const app = express();
app.use(express.json());

// ملف لحفظ البيانات
const DATA_FILE = 'players.json';

// تحميل البيانات
function loadPlayers() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading players:', err);
  }
  return [];
}

// حفظ البيانات
function savePlayers(players) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(players, null, 2));
    return true;
  } catch (err) {
    console.error('Error saving players:', err);
    return false;
  }
}

let acceptedPlayers = loadPlayers();

// API للتحقق من اللاعب (يستخدمه Roblox)
app.get('/check-player/:username', (req, res) => {
  const username = req.params.username.toLowerCase();
  const isAccepted = acceptedPlayers.some(p => p.username.toLowerCase() === username);
  
  res.json({
    username: req.params.username,
    accepted: isAccepted,
    timestamp: new Date().toISOString()
  });
});

// API لإضافة لاعب مقبول (يستخدمه Discord Bot)
app.post('/add-player', (req, res) => {
  const { username, secret, discordId } = req.body;
  
  // مفتاح سري للحماية - غيره لمفتاحك الخاص
  const API_SECRET = process.env.API_SECRET || 'YOUR_SECRET_KEY_123';
  
  if (secret !== API_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  if (!username) {
    return res.status(400).json({ error: 'Username required' });
  }
  
  const existingIndex = acceptedPlayers.findIndex(
    p => p.username.toLowerCase() === username.toLowerCase()
  );
  
  if (existingIndex === -1) {
    acceptedPlayers.push({
      username: username,
      discordId: discordId || null,
      addedAt: new Date().toISOString()
    });
    savePlayers(acceptedPlayers);
    console.log(`✅ تم إضافة: ${username}`);
  } else {
    console.log(`⚠️ ${username} موجود بالفعل`);
  }
  
  res.json({
    success: true,
    username: username,
    totalAccepted: acceptedPlayers.length
  });
});

// API لإزالة لاعب
app.post('/remove-player', (req, res) => {
  const { username, secret } = req.body;
  
  const API_SECRET = process.env.API_SECRET || 'YOUR_SECRET_KEY_123';
  
  if (secret !== API_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const index = acceptedPlayers.findIndex(
    p => p.username.toLowerCase() === username.toLowerCase()
  );
  
  if (index > -1) {
    acceptedPlayers.splice(index, 1);
    savePlayers(acceptedPlayers);
    console.log(`❌ تم إزالة: ${username}`);
  }
  
  res.json({
    success: true,
    username: username,
    totalAccepted: acceptedPlayers.length
  });
});

// عرض جميع اللاعبين المقبولين
app.get('/players', (req, res) => {
  res.json({
    players: acceptedPlayers,
    total: acceptedPlayers.length
  });
});

// مسح كل البيانات (للطوارئ)
app.post('/reset', (req, res) => {
  const { secret } = req.body;
  const API_SECRET = process.env.API_SECRET || 'YOUR_SECRET_KEY_123';
  
  if (secret !== API_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  acceptedPlayers = [];
  savePlayers(acceptedPlayers);
  
  res.json({ success: true, message: 'تم مسح جميع البيانات' });
});

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>Roblox-Discord API</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          text-align: center;
        }
        .container {
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 30px;
          max-width: 600px;
          margin: 50px auto;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        h1 { font-size: 2.5em; margin-bottom: 10px; }
        .status { 
          background: rgba(0,255,0,0.2);
          padding: 15px;
          border-radius: 10px;
          margin: 20px 0;
          font-size: 1.2em;
        }
        .endpoints {
          text-align: right;
          background: rgba(0,0,0,0.3);
          padding: 20px;
          border-radius: 10px;
          margin-top: 20px;
        }
        .endpoints li {
          margin: 10px 0;
          font-family: monospace;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎮 Roblox-Discord API</h1>
        <div class="status">
          <p>✅ API يعمل بنجاح!</p>
          <p>👥 اللاعبين المقبولين: ${acceptedPlayers.length}</p>
        </div>
        
        <div class="endpoints">
          <h3>📡 Endpoints المتاحة:</h3>
          <ul style="list-style: none; padding: 0;">
            <li>✅ GET /check-player/:username</li>
            <li>➕ POST /add-player</li>
            <li>➖ POST /remove-player</li>
            <li>📋 GET /players</li>
            <li>🔄 POST /reset</li>
          </ul>
        </div>
        
        <p style="margin-top: 30px; opacity: 0.7;">
          Developed by firas | Powered by Render
        </p>
      </div>
    </body>
    </html>
  `);
});

// Health check لـ Render
app.get('/health', (req, res) => {
  res.json({ status: 'OK', players: acceptedPlayers.length });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Loaded ${acceptedPlayers.length} players`);
});