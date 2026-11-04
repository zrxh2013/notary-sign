#!/usr/bin/env bash
# =============================================================================
# 信签云 · 自签 HTTPS 证书重签 + 服务重启
# -----------------------------------------------------------------------------
# 功能：
#   1. 备份现有证书（带时间戳）
#   2. 生成新的自签证书（自动收录本机所有局域网 IPv4 到 SAN）
#   3. 导出 cert.cer（供 Windows / Android / iOS 安装）
#   4. 停止并重启 HTTPS 服务
#   5. 校验服务返回 HTTP 200
#
# 用法：
#   ./scripts/renew-selfsigned-cert.sh                  # 默认：365 天，自动收录局域网 IP
#   ./scripts/renew-selfsigned-cert.sh --days 730       # 指定有效期
#   ./scripts/renew-selfsigned-cert.sh --san 192.168.1.20 --san notary.lan
#   ./scripts/renew-selfsigned-cert.sh --no-restart     # 仅重签，不重启
#
# 环境变量：
#   CERT_DIR     证书目录（默认 /workspace/certs）
#   SERVER_PORT  服务端口（默认 8090）
#   APP_DIR      应用目录（默认脚本所在目录的上一级）
#   AUTO_LAN_IPS 是否自动收录局域网 IP（默认 1，设为 0 关闭）
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
CERT_DIR="${CERT_DIR:-$APP_DIR/certs}"
SERVER_PORT="${SERVER_PORT:-8090}"
AUTO_LAN_IPS="${AUTO_LAN_IPS:-1}"
LOG_FILE="/tmp/notary-https.log"

DAYS=365
NO_RESTART=0
EXTRA_SANS=()

# ---------------- 参数解析 ----------------
while [ $# -gt 0 ]; do
  case "$1" in
    --days)
      [ $# -ge 2 ] || { echo "[ERR] --days 需要参数" >&2; exit 1; }
      DAYS="$2"; shift 2 ;;
    --san)
      [ $# -ge 2 ] || { echo "[ERR] --san 需要参数" >&2; exit 1; }
      EXTRA_SANS+=("$2"); shift 2 ;;
    --no-restart)
      NO_RESTART=1; shift ;;
    --help|-h)
      sed -n '2,22p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *)
      echo "[ERR] 未知参数: $1（使用 --help 查看用法）" >&2; exit 1 ;;
  esac
done

# ---------------- 前置检查 ----------------
command -v openssl >/dev/null 2>&1 || { echo "[ERR] 未找到 openssl" >&2; exit 1; }
command -v node    >/dev/null 2>&1 || { echo "[ERR] 未找到 node" >&2; exit 1; }

mkdir -p "$CERT_DIR"

# ---------------- 组装 SAN ----------------
SAN_LIST="DNS:localhost,IP:127.0.0.1"
SAN_SEEN=" 127.0.0.1 localhost "

add_san() {
  local value="$1"
  [ -z "$value" ] && return 0
  # 去重
  case "$SAN_SEEN" in *" $value "*) return 0 ;; esac
  if [[ "$value" =~ ^[0-9]{1,3}(\.[0-9]{1,3}){3}$ ]]; then
    SAN_LIST="$SAN_LIST,IP:$value"
  else
    SAN_LIST="$SAN_LIST,DNS:$value"
  fi
  SAN_SEEN="$SAN_SEEN $value "
}

# 自动收录本机局域网 IPv4（排除回环）
if [ "$AUTO_LAN_IPS" = "1" ] && command -v hostname >/dev/null 2>&1; then
  while IFS= read -r ip; do
    [ -n "$ip" ] || continue
    add_san "$ip"
  done < <(hostname -I 2>/dev/null | tr ' ' '\n' | grep -E '^[0-9]+\.' || true)
fi

# 追加手动指定的 SAN
for s in "${EXTRA_SANS[@]:-}"; do
  [ -n "$s" ] && add_san "$s"
done

echo "[INFO] 应用目录 : $APP_DIR"
echo "[INFO] 证书目录 : $CERT_DIR"
echo "[INFO] 有效期   : $DAYS 天"
echo "[INFO] SAN 列表 : $SAN_LIST"

# ---------------- 备份旧证书 ----------------
TS="$(date +%Y%m%d%H%M%S)"
for f in cert.pem key.pem cert.cer; do
  if [ -f "$CERT_DIR/$f" ]; then
    cp -p "$CERT_DIR/$f" "$CERT_DIR/$f.bak.$TS"
    echo "[INFO] 已备份: $CERT_DIR/$f.bak.$TS"
  fi
done

# ---------------- 生成新证书 ----------------
echo "[INFO] 正在生成自签证书..."
openssl req -x509 -newkey rsa:2048 \
  -keyout "$CERT_DIR/key.pem" \
  -out "$CERT_DIR/cert.pem" \
  -days "$DAYS" -nodes \
  -subj "/CN=localhost/O=XinQianYun Notary" \
  -addext "subjectAltName=$SAN_LIST" >/dev/null 2>&1

chmod 600 "$CERT_DIR/key.pem"
chmod 644 "$CERT_DIR/cert.pem"

# ---------------- 导出 DER（供终端设备安装） ----------------
openssl x509 -in "$CERT_DIR/cert.pem" -outform der -out "$CERT_DIR/cert.cer"
chmod 644 "$CERT_DIR/cert.cer"

# ---------------- 校验 key / cert 配对 ----------------
KEY_MOD="$(openssl rsa -in "$CERT_DIR/key.pem" -noout -modulus 2>/dev/null | openssl md5)"
CERT_MOD="$(openssl x509 -in "$CERT_DIR/cert.pem" -noout -modulus 2>/dev/null | openssl md5)"
if [ "$KEY_MOD" != "$CERT_MOD" ]; then
  echo "[ERR] 私钥与证书不匹配，已中止（旧证书备份仍在 $CERT_DIR）" >&2
  exit 1
fi
echo "[OK] 私钥与证书配对校验通过"

FINGERPRINT="$(openssl x509 -in "$CERT_DIR/cert.pem" -noout -fingerprint -sha256 | sed 's/^.*=//')"
echo "[OK] SHA-256 指纹: $FINGERPRINT"

# ---------------- 重启服务 ----------------
if [ "$NO_RESTART" = "1" ]; then
  echo "[INFO] 已指定 --no-restart，跳过服务重启"
else
  echo "[INFO] 正在重启 HTTPS 服务（端口 $SERVER_PORT）..."

  # 找出监听该端口的进程
  PIDS=""
  if command -v ss >/dev/null 2>&1; then
    PIDS="$(ss -tlnp 2>/dev/null | grep -E "LISTEN.*:${SERVER_PORT} " \
      | sed -E 's/.*pid=([0-9]+).*/\1/' | sort -u || true)"
  fi
  if [ -z "$PIDS" ] && command -v pgrep >/dev/null 2>&1; then
    PIDS="$(pgrep -f "node server.js" || true)"
  fi

  if [ -n "$PIDS" ]; then
    echo "[INFO] 停止旧进程: $(echo "$PIDS" | tr '\n' ' ')"
    # shellcheck disable=SC2086
    kill -TERM $PIDS 2>/dev/null || true
    for _ in $(seq 1 10); do
      # shellcheck disable=SC2086
      kill -0 $PIDS 2>/dev/null || break
      sleep 0.5
    done
    # shellcheck disable=SC2086
    kill -KILL $PIDS 2>/dev/null || true
  else
    echo "[INFO] 未发现运行中的服务进程"
  fi

  # 等待端口释放
  for _ in $(seq 1 10); do
    if ! ss -tln 2>/dev/null | grep -q ":${SERVER_PORT} "; then break; fi
    sleep 0.5
  done

  # 启动服务
  cd "$APP_DIR"
  nohup node server.js > "$LOG_FILE" 2>&1 &
  NEW_PID=$!
  echo "[INFO] 新进程 PID: $NEW_PID，日志: $LOG_FILE"

  # 校验启动结果
  OK=0
  for _ in $(seq 1 20); do
    CODE="$(curl -sk -o /dev/null -w '%{http_code}' "https://localhost:${SERVER_PORT}/" 2>/dev/null || true)"
    if [ "$CODE" = "200" ]; then OK=1; break; fi
    sleep 0.5
  done

  if [ "$OK" = "1" ]; then
    echo "[OK] 服务已重启并通过校验: https://localhost:${SERVER_PORT}/"
  else
    echo "[ERR] 服务启动校验失败，最近日志如下：" >&2
    tail -20 "$LOG_FILE" >&2 || true
    exit 1
  fi
fi

echo ""
echo "[OK] 证书已更新: $CERT_DIR/cert.pem"
echo "[OK] 分发文件   : $CERT_DIR/cert.cer"
echo "[NOTE] 各终端设备需重新安装并信任新证书"
echo "[NOTE] 若操作指引中记录了旧指纹，请同步更新为: $FINGERPRINT"
