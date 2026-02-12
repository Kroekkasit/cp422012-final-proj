const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.urlencoded({ extended: true }));

// Basic configuration; tune for your environment.
const PORT = process.env.PORT || 8080;

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASS || 'strongpassword',
  database: process.env.DB_NAME || 'classroom_attendance',
  connectionLimit: 5
};

const pool = mysql.createPool(dbConfig);

function getClientIp(req) {
  const xfwd = req.headers['x-forwarded-for'];
  if (xfwd) {
    const parts = String(xfwd).split(',');
    return parts[0].trim();
  }
  const ip =
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    (req.connection && req.connection.socket && req.connection.socket.remoteAddress) ||
    '';
  return ip.replace(/^::ffff:/, '');
}

function htmlPage(title, bodyHtml) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    :root {
      --bg: #0f172a;
      --card: #020617;
      --accent: #38bdf8;
      --accent-soft: rgba(56, 189, 248, 0.15);
      --text-main: #e5e7eb;
      --text-muted: #9ca3af;
      --danger: #f97373;
      --success: #4ade80;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
      background: radial-gradient(circle at top, #1f2937 0, var(--bg) 45%, #020617 100%);
      color: var(--text-main);
    }
    .card {
      width: 100%;
      max-width: 440px;
      background: radial-gradient(circle at top left, #1e293b 0, var(--card) 40%);
      border-radius: 24px;
      padding: 28px 24px 24px;
      box-shadow:
        0 25px 60px rgba(15, 23, 42, 0.8),
        0 0 0 1px rgba(148, 163, 184, 0.08);
      position: relative;
      overflow: hidden;
    }
    .card::before {
      content: "";
      position: absolute;
      inset: -40%;
      background:
        radial-gradient(circle at 0 0, rgba(56, 189, 248, 0.12), transparent 55%),
        radial-gradient(circle at 100% 0, rgba(167, 139, 250, 0.12), transparent 55%);
      opacity: 0.9;
      mix-blend-mode: screen;
      pointer-events: none;
    }
    .card-inner {
      position: relative;
      z-index: 1;
    }
    h1 {
      margin: 0 0 4px;
      font-size: 1.35rem;
      letter-spacing: 0.03em;
    }
    p.subtitle {
      margin: 0 0 16px;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: var(--accent);
    }
    p.muted {
      margin: 0 0 18px;
      font-size: 0.9rem;
      color: var(--text-muted);
    }
    .badge-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 18px;
    }
    .badge {
      font-size: 0.72rem;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(148, 163, 184, 0.35);
      color: var(--text-muted);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    }
    .badge-dot {
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: var(--accent);
      box-shadow: 0 0 0 5px rgba(56, 189, 248, 0.3);
    }
    .badge-soft {
      background: var(--accent-soft);
      color: var(--accent);
      border-color: rgba(56, 189, 248, 0.4);
    }
    form {
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    label {
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--text-muted);
    }
    input[type="text"] {
      margin-top: 6px;
      width: 100%;
      padding: 9px 11px;
      border-radius: 999px;
      border: 1px solid rgba(148, 163, 184, 0.5);
      background: rgba(15, 23, 42, 0.85);
      color: var(--text-main);
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
    }
    input[type="text"]::placeholder {
      color: rgba(148, 163, 184, 0.8);
    }
    input[type="text"]:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 1px rgba(56, 189, 248, 0.5);
      background: rgba(15, 23, 42, 0.9);
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 6px;
    }
    button {
      border: none;
      cursor: pointer;
      border-radius: 999px;
      padding: 10px 16px;
      font-size: 0.95rem;
      font-weight: 500;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
    }
    button.primary {
      background: linear-gradient(135deg, #38bdf8, #6366f1);
      color: #0b1120;
      box-shadow:
        0 12px 30px rgba(37, 99, 235, 0.55),
        0 0 0 1px rgba(15, 23, 42, 0.7);
    }
    button.primary:hover {
      transform: translateY(-1px);
      box-shadow:
        0 18px 40px rgba(37, 99, 235, 0.65),
        0 0 0 1px rgba(15, 23, 42, 0.7);
    }
    button.secondary {
      background: rgba(15, 23, 42, 0.85);
      color: var(--text-main);
      border: 1px solid rgba(148, 163, 184, 0.45);
    }
    button.secondary:hover {
      transform: translateY(-1px);
      border-color: rgba(148, 163, 184, 0.8);
    }
    .hint {
      margin-top: 6px;
      font-size: 0.78rem;
      color: var(--text-muted);
    }
    .status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.82rem;
      padding: 7px 10px;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(148, 163, 184, 0.35);
      margin-bottom: 6px;
    }
    .status.success {
      border-color: rgba(74, 222, 128, 0.7);
      color: var(--success);
    }
    .status.error {
      border-color: rgba(248, 113, 113, 0.7);
      color: var(--danger);
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: currentColor;
    }
    .footer {
      margin-top: 16px;
      font-size: 0.75rem;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
      gap: 10px;
      opacity: 0.85;
    }
    .footer span {
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="card-inner">
      ${bodyHtml}
    </div>
  </div>
</body>
</html>
`;
}

async function findDeviceByClientIp(ip) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute(
      `
      SELECT d.*
      FROM devices d
      WHERE d.last_ip = ?
        AND d.last_seen >= (NOW() - INTERVAL 5 MINUTE)
      ORDER BY d.last_seen DESC
      LIMIT 1
      `,
      [ip]
    );
    return rows[0] || null;
  } finally {
    conn.release();
  }
}

async function findStudentById(studentId) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute(
      `SELECT * FROM students WHERE student_id = ? LIMIT 1`,
      [studentId]
    );
    return rows[0] || null;
  } finally {
    conn.release();
  }
}

async function createStudentIfNeeded(studentId) {
  let student = await findStudentById(studentId);
  if (student) return student;

  const conn = await pool.getConnection();
  try {
    await conn.execute(
      `INSERT INTO students (student_id) VALUES (?)`,
      [studentId]
    );
  } finally {
    conn.release();
  }
  return findStudentById(studentId);
}

async function bindDeviceToStudent(deviceId, studentId) {
  const conn = await pool.getConnection();
  try {
    await conn.execute(
      `
      UPDATE devices
      SET student_id = ?, registered = 1
      WHERE id = ?
      `,
      [studentId, deviceId]
    );
  } finally {
    conn.release();
  }
}

async function recordAttendance(studentId, deviceId) {
  const conn = await pool.getConnection();
  try {
    await conn.execute(
      `
      INSERT INTO attendance_logs (student_id, device_id, ap_label)
      VALUES (?, ?, 'default_ap')
      `,
      [studentId, deviceId]
    );
  } finally {
    conn.release();
  }
}

app.get('/', async (req, res) => {
  const ip = getClientIp(req);

  try {
    const device = await findDeviceByClientIp(ip);

    if (!device) {
      const html = htmlPage(
        'Classroom Wi‑Fi Attendance',
        `
        <p class="subtitle">Classroom Check‑In</p>
        <h1>Connect to register your device</h1>
        <p class="muted">
          Your device is online, but we couldn't find it in the access point's ARP table yet.
          Try opening this page again in a few seconds, or quickly toggle Wi‑Fi off and on.
        </p>
        <div class="badge-row">
          <div class="badge">
            <span class="badge-dot"></span>
            AP portal reachable
          </div>
          <div class="badge">
            IP: ${ip || 'unknown'}
          </div>
        </div>
        <div class="hint">
          The AP tracks devices by MAC address via its ARP table. Once detected, you'll see a
          short registration form here.
        </div>
        <div class="actions">
          <form method="GET" action="/">
            <button class="secondary" type="submit">Retry lookup</button>
          </form>
        </div>
        <div class="footer">
          <span>Arch Linux host AP</span>
          <span>MAC‑based attendance PoC</span>
        </div>
        `
      );
      res.status(200).send(html);
      return;
    }

    if (!device.student_id || !device.registered) {
      const html = htmlPage(
        'Register device for attendance',
        `
        <p class="subtitle">First‑Time Registration</p>
        <h1>Link this device to your student ID</h1>
        <p class="muted">
          This Arch host will remember your device's MAC address. After this, checking in
          is a single tap each time you attend this class.
        </p>

        <div class="badge-row">
          <div class="badge badge-soft">
            <span class="badge-dot"></span>
            Device detected on AP
          </div>
          <div class="badge">
            MAC: ${device.mac_address}
          </div>
        </div>

        <form method="POST" action="/register">
          <label for="student_id">Student ID</label>
          <input
            id="student_id"
            name="student_id"
            type="text"
            required
            autocomplete="off"
            placeholder="e.g. 66123456"
          />
          <div class="hint">
            Make sure this matches the ID your professor uses for the roster.
          </div>
          <div class="actions">
            <button class="primary" type="submit">
              Register and check in
            </button>
          </div>
        </form>
        <div class="footer">
          <span>Bound to this MAC only</span>
          <span>IP: ${device.last_ip}</span>
        </div>
        `
      );
      res.status(200).send(html);
      return;
    }

    const html = htmlPage(
      'Tap to check in',
      `
      <p class="subtitle">Welcome back</p>
      <h1>Check in for attendance</h1>
      <p class="muted">
        This device is already registered for your student ID. Just tap the button below to
        record your presence for today's class.
      </p>
      <div class="badge-row">
        <div class="badge badge-soft">
          <span class="badge-dot"></span>
          Registered device
        </div>
        <div class="badge">
          MAC: ${device.mac_address}
        </div>
      </div>
      <form method="POST" action="/attend">
        <div class="actions">
          <button class="primary" type="submit">
            Check in now
          </button>
        </div>
      </form>
      <div class="footer">
        <span>IP: ${device.last_ip}</span>
        <span>AP: default_ap</span>
      </div>
      `
    );
    res.status(200).send(html);
  } catch (err) {
    console.error('GET / error:', err);
    const html = htmlPage(
      'Portal error',
      `
      <p class="subtitle">Something went wrong</p>
      <h1>Unable to reach attendance backend</h1>
      <div class="status error">
        <span class="status-dot"></span>
        <span>Database or ARP sync error. Please notify your instructor.</span>
      </div>
      <div class="hint">
        From the AP host, verify that the MySQL server is running, the schema is loaded,
        and the <code>arp_scanner</code> daemon is connected.
      </div>
      `
    );
    res.status(500).send(html);
  }
});

app.post('/register', async (req, res) => {
  const ip = getClientIp(req);
  const studentId = (req.body.student_id || '').trim();

  if (!studentId) {
    res.redirect('/');
    return;
  }

  try {
    const device = await findDeviceByClientIp(ip);
    if (!device) {
      res.redirect('/');
      return;
    }

    const student = await createStudentIfNeeded(studentId);
    await bindDeviceToStudent(device.id, student.id);
    await recordAttendance(student.id, device.id);

    const html = htmlPage(
      'Registration complete',
      `
      <p class="subtitle">All set</p>
      <h1>Device registered and checked in</h1>
      <div class="status success">
        <span class="status-dot"></span>
        <span>We saved your device's MAC and recorded your attendance.</span>
      </div>
      <div class="badge-row">
        <div class="badge badge-soft">
          Student ID: ${student.student_id}
        </div>
        <div class="badge">
          MAC: ${device.mac_address}
        </div>
      </div>
      <p class="muted">
        Next time you join this classroom Wi‑Fi, you'll just tap one button to check in.
      </p>
      <div class="footer">
        <span>AP: default_ap</span>
        <span>IP: ${device.last_ip}</span>
      </div>
      `
    );
    res.status(200).send(html);
  } catch (err) {
    console.error('POST /register error:', err);
    res.redirect('/');
  }
});

app.post('/attend', async (req, res) => {
  const ip = getClientIp(req);

  try {
    const device = await findDeviceByClientIp(ip);
    if (!device || !device.student_id || !device.registered) {
      res.redirect('/');
      return;
    }

    await recordAttendance(device.student_id, device.id);

    const html = htmlPage(
      'Attendance recorded',
      `
      <p class="subtitle">Success</p>
      <h1>Thanks, your attendance is logged</h1>
      <div class="status success">
        <span class="status-dot"></span>
        <span>We recorded a timestamp for this session from your registered device.</span>
      </div>
      <div class="badge-row">
        <div class="badge badge-soft">
          Student bound
        </div>
        <div class="badge">
          MAC: ${device.mac_address}
        </div>
      </div>
      <p class="muted">
        You can now close this tab. Internet access will be granted by the captive portal rules
        configured on the access point.
      </p>
      <div class="footer">
        <span>AP: default_ap</span>
        <span>IP: ${device.last_ip}</span>
      </div>
      `
    );
    res.status(200).send(html);
  } catch (err) {
    console.error('POST /attend error:', err);
    res.redirect('/');
  }
});

app.listen(PORT, () => {
  console.log(`Captive portal server listening on http://0.0.0.0:${PORT}`);
});

