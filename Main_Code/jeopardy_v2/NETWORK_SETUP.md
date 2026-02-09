# Network Setup Guide - Making Jeopardy Game Accessible

## The Problem: WSL2 Networking

Your servers are running in WSL2, which has its own virtual network:
- **WSL2 IP**: `172.24.7.44` (internal only, changes on reboot)
- **Windows Host IP**: `192.168.1.16` (your actual network IP)
- **Public IP**: `73.232.177.61` (for external access)

External devices can't reach the WSL2 IP directly, so we need to forward ports from Windows to WSL2.

---

## Setup Steps

### Step 1: Configure Windows Port Forwarding to WSL2

**Every time you restart your computer or WSL**, run this in **Administrator PowerShell**:

```powershell
cd "C:\Users\patri\Documents\jeopardyv2_research\Jeopardy-Web\Main_Code\jeopardy_v2"
.\setup-wsl-forwarding.ps1
```

This forwards:
- Port 8000 (Backend) from Windows → WSL2
- Port 5173 (Frontend) from Windows → WSL2

### Step 2: Configure Windows Firewall

**One-time setup** - Run in **Administrator PowerShell**:

```powershell
New-NetFirewallRule -DisplayName "Jeopardy Backend (Port 8000)" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow

New-NetFirewallRule -DisplayName "Jeopardy Frontend (Port 5173)" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
```

### Step 3: Configure Router Port Forwarding (for external access)

Log into your router (usually at http://192.168.1.1) and forward these ports:

**Port 8000**:
- External Port: `8000`
- Internal Port: `8000`
- Internal IP: `192.168.1.16`
- Protocol: `TCP`

**Port 5173**:
- External Port: `5173`
- Internal Port: `5173`
- Internal IP: `192.168.1.16`
- Protocol: `TCP`

### Step 4: Start Your Servers

In WSL2:

**Terminal 1 - Backend:**
```bash
cd /mnt/c/Users/patri/Documents/jeopardyv2_research/Jeopardy-Web/Main_Code/jeopardy_v2
source venv/bin/activate
python manage.py runserver 0.0.0.0:8000
```

**Terminal 2 - Frontend:**
```bash
cd /mnt/c/Users/patri/Documents/jeopardyv2_research/Jeopardy-Web/Main_Code/jeopardy_v2/frontend
npm run dev
```

---

## Access URLs

### Local Network Access
From any device on your Wi-Fi:
- **Frontend**: `http://192.168.1.16:5173`
- **Backend**: `http://192.168.1.16:8000`

### External Access (Internet)
From any device anywhere (after router port forwarding):
- **Frontend**: `http://73.232.177.61:5173`
- **Backend**: `http://73.232.177.61:8000`

---

## Testing

### Test 1: Local Access from Host Machine
1. Open browser: `http://192.168.1.16:5173`
2. Should see Jeopardy game lobby

### Test 2: Local Access from Another Device
1. Connect phone/tablet to same Wi-Fi
2. Open browser: `http://192.168.1.16:5173`
3. Should see game lobby

### Test 3: External Access
1. Use phone on cellular data (NOT Wi-Fi)
2. Open browser: `http://73.232.177.61:5173`
3. Should see game lobby

---

## Troubleshooting

### "Can't connect to 192.168.1.16"
- Check if port forwarding script ran successfully
- Verify Windows Firewall rules are active
- Ensure servers are running with `0.0.0.0` binding

### Check Port Forwarding Status
In **Administrator PowerShell**:
```powershell
netsh interface portproxy show v4tov4
```

Should show:
```
Listen on ipv4:             Connect to ipv4:
Address         Port        Address         Port
--------------- ----------  --------------- ----------
0.0.0.0         8000        172.24.7.44     8000
0.0.0.0         5173        172.24.7.44     5173
```

### WSL2 IP Changed
WSL2 IP changes on reboot. Re-run the port forwarding script:
```powershell
.\setup-wsl-forwarding.ps1
```

### Remove Port Forwarding (When Done)
To stop exposing ports, run in **Administrator PowerShell**:
```powershell
.\remove-wsl-forwarding.ps1
```

---

## Security Notes

⚠️ **IMPORTANT**: Port forwarding exposes your services to the internet!

1. **Disable when not playing** - Run `remove-wsl-forwarding.ps1` and disable router port forwarding
2. **Monitor router logs** for suspicious activity
3. **Don't share your public IP publicly** - only with trusted friends
4. **Change Django SECRET_KEY** for production use
5. **Use strong passwords** if you add authentication

---

## Quick Reference

### Your Network Info
- **Windows Network IP**: `192.168.1.16`
- **WSL2 IP**: `172.24.7.44` (changes on reboot!)
- **Public IP**: `73.232.177.61`

### Ports Used
- **8000**: Django backend (HTTP + WebSocket)
- **5173**: Vite frontend (HTTP)

### Common Commands

**Check if servers are running:**
```bash
# In WSL2
netstat -tuln | grep -E '8000|5173'
```

**Get current WSL2 IP:**
```bash
hostname -I | awk '{print $1}'
```

**View Windows port proxy rules:**
```powershell
netsh interface portproxy show v4tov4
```
