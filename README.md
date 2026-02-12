## Classroom MAC-based Attendance PoC

This is a proof-of-concept classroom attendance system that uses the **MAC address of devices connected to the professor's access point** to track attendance.

- **AP stack (Arch Linux host)**: C daemon scans `/proc/net/arp` and syncs connected devices into MySQL.
- **Web stack (captive portal)**: Node.js + Express web app running on the AP host.
- **Database**: MySQL (or MariaDB) with a small schema for students, devices, and attendance logs.

When a student connects to the classroom Wi‑Fi:

1. The AP host assigns an IP and learns the client's MAC address (via ARP).
2. The `arp_scanner` daemon periodically reads `/proc/net/arp` and upserts `(MAC, IP, last_seen)` into the `devices` table.
3. A **captive portal** (Node/Express app) intercepts HTTP traffic and:
   - If the MAC is **not yet registered**, shows a registration form (student enters `stdid`).
   - If the MAC is **already registered**, shows a single button to check attendance.
4. On submission, the portal binds the device MAC to the given student ID and records an attendance row.

---

### 1. Requirements on the Arch AP host

- Arch Linux with:
  - Wireless interface capable of AP mode (e.g. `wlan0`)
  - `hostapd` (for Wi‑Fi AP)
  - `dnsmasq` or similar (for DHCP/DNS)
  - `iptables` or `nftables` (to enforce captive portal + NAT)
- MySQL server (or MariaDB) running locally.
- Build tools: `gcc`, `make`, and MySQL client dev libs (`mariadb-libs` / `libmariadbclient`).
- Node.js (LTS) + `npm`.

On Arch (roughly):

```bash
sudo pacman -S --needed hostapd dnsmasq iptables-nft mariadb-libs mysql nodejs npm
```

---

### 2. Database setup

Load the schema:

```bash
mysql -u root -p < db_schema.sql
```

This creates:

- `students(student_id, ...)`
- `devices(mac_address, last_ip, last_seen, student_id, registered, ...)`
- `attendance_logs(student_id, device_id, ap_label, checked_in_at)`

If you don't use `root`, adjust DB env vars later.

---

### 3. Build and run the ARP scanner (C)

The daemon polls `/proc/net/arp` and writes connected devices into `devices`.

Build:

```bash
cd /home/aloha/Uni/cp422012proj
make
```

Run (example with default DB settings):

```bash
DB_HOST=127.0.0.1 \
DB_USER=root \
DB_PASS=your_mysql_password \
DB_NAME=classroom_attendance \
SCAN_INTERVAL_SEC=5 \
sudo ./arp_scanner
```

Notes:

- It reads **only** the ARP table; it does **not** manage IPs or Wi‑Fi radio itself.
- It does not overwrite registration or student bindings; it only updates `last_ip` and `last_seen`.

You can later wrap this in a `systemd` service if desired.

---

### 4. Node.js captive portal

Install dependencies:

```bash
cd /home/aloha/Uni/cp422012proj
npm install
```

Run the portal:

```bash
DB_HOST=127.0.0.1 \
DB_USER=root \
DB_PASS=your_mysql_password \
DB_NAME=classroom_attendance \
PORT=8080 \
node server.js
```

The server listens on `0.0.0.0:8080`. In a captive portal setup, you will redirect HTTP traffic from clients to this port.

Flow by IP/MAC:

- The portal uses the client's **source IP** from the HTTP connection.
- It looks up the corresponding device row (inserted by `arp_scanner`) within the last 5 minutes.
- From there it drives one of two UIs:
  - **Registration form** (first time; binds `student_id` to MAC and records attendance).
  - **Single-button check-in** (subsequent visits; records attendance with one click).

---

### 5. Example hostapd + dnsmasq + captive portal wiring

Below is **one possible** minimal setup. Adapt interface names and IP ranges as needed.

#### 5.1. Wi‑Fi AP with hostapd

Example `/etc/hostapd/hostapd.conf`:

```ini
interface=wlan0
driver=nl80211
ssid=ClassroomAP
hw_mode=g
channel=6
wmm_enabled=1
ieee80211n=1
auth_algs=1
wpa=2
wpa_key_mgmt=WPA-PSK
rsn_pairwise=CCMP
wpa_passphrase=classroom-pass-1234
ignore_broadcast_ssid=0
```

Enable IP, DHCP, and routing on the AP host. For example, using `192.168.100.1/24` on `wlan0`:

```bash
sudo ip link set wlan0 down
sudo ip addr flush dev wlan0
sudo ip addr add 192.168.100.1/24 dev wlan0
sudo ip link set wlan0 up

sudo sysctl -w net.ipv4.ip_forward=1
```

#### 5.2. dnsmasq (DHCP + DNS)

Example `/etc/dnsmasq.d/classroom.conf`:

```ini
interface=wlan0
bind-interfaces

dhcp-range=192.168.100.10,192.168.100.200,12h

# Send all DNS queries to the AP (captive portal behavior)
address=/#/192.168.100.1
```

Restart:

```bash
sudo systemctl restart dnsmasq
```

Now clients connecting to `ClassroomAP` should get:

- IP in `192.168.100.0/24`
- DNS responses for any hostname pointing to `192.168.100.1`

#### 5.3. Captive portal redirection (iptables example)

Assuming:

- AP interface: `wlan0`
- Upstream internet: `eth0`
- Portal listening on: `192.168.100.1:8080`

Basic NAT + HTTP redirect to portal:

```bash
# Flush old rules (be careful on a real system)
sudo iptables -F
sudo iptables -t nat -F

# NAT for internet access (optional, once allowed)
sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE

# Redirect all port 80 traffic from clients on wlan0 to the portal
sudo iptables -t nat -A PREROUTING -i wlan0 -p tcp --dport 80 \
  -j DNAT --to-destination 192.168.100.1:8080

# Allow traffic to the portal
sudo iptables -A INPUT -i wlan0 -p tcp --dport 8080 -j ACCEPT
```

This forces any HTTP request from students to hit the Node portal first. After you extend the system, you could change the rules to allow full internet only after successful attendance, but that is not implemented in this PoC.

---

### 6. End‑to‑end test walkthrough

1. **On the AP host**:
   - Start MySQL and load `db_schema.sql`.
   - Build and run `./arp_scanner` with the correct DB env vars.
   - Start `hostapd` and `dnsmasq` with the sample configs above.
   - Apply the iptables rules to redirect HTTP port 80 → `8080`.
   - Run the Node portal: `node server.js`.

2. **On a student device**:
   - Connect to Wi‑Fi `ClassroomAP`.
   - Open any HTTP site (e.g. `http://example.com`).
   - You should be redirected to the captive portal.
   - On first visit:
     - If the ARP scanner has not yet picked up the device, you'll see a "Retry lookup" screen.
     - After a few seconds, reload; a registration form appears.
     - Enter `stdid` and submit; the device is bound and attendance recorded.
   - On subsequent visits:
     - The portal shows a single check‑in button.
     - Clicking it inserts a new row into `attendance_logs`.

3. **Professor view (manual for now)**:
   - Use MySQL CLI or any GUI to inspect:
     - `SELECT * FROM devices;`
     - `SELECT * FROM students;`
     - `SELECT * FROM attendance_logs ORDER BY checked_in_at DESC;`

You can later build a small admin UI (also in Node.js) on top of this same DB.

---

### 7. Notes and extensions

- **Security**: This PoC does not attempt to prevent MAC spoofing or multiple devices per student. Production use would require additional controls.
- **Multiple classes / APs**: You can extend the schema (`courses`, `class_sessions`, `aps`) and tag `attendance_logs` accordingly.
- **Systemd services**: For real deployments, wrap `arp_scanner` and `server.js` in `systemd` units.
- **Existing `main.c`**: The provided `main.c` script that brings up an AP via shell commands can coexist with this stack, but is not required by the PoC logic above.

