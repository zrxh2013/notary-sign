#!/usr/bin/env bash
# =============================================================================
# 信签云 · 阿里云 DNS-01 签发 Let's Encrypt 受信任证书
# -----------------------------------------------------------------------------
# 用法（三选一）：
#   1) 环境变量传入：
#        Ali_Key=xxx Ali_Secret=yyy CERT_DOMAIN=notary.example.com ./scripts/issue-cert.sh
#   2) 命令行参数传入：
#        ./scripts/issue-cert.sh <domain> <Ali_Key> <Ali_Secret>
#   3) 交互式输入（密钥不回显）：
#        ./scripts/issue-cert.sh
#
# 依赖：
#   - acme.sh（已安装在 /root/.acme.sh）
#   - 阿里云 RAM 子账号 AK/SK，需 AliyunDNSFullAccess 权限
#   - 域名已在阿里云 DNS 解析托管
# =============================================================================
set -euo pipefail

ACME_SH="/root/.acme.sh/acme.sh"
CERT_DIR="/workspace/certs"
CERT_DOMAIN="${CERT_DOMAIN:-}"
ALI_KEY="${Ali_Key:-}"
ALI_SECRET="${Ali_Secret:-}"

# ---------- 参数解析（命令行 > 环境变量 > 交互） ----------
if [ $# -ge 3 ]; then
  CERT_DOMAIN="$1"
  ALI_KEY="$2"
  ALI_SECRET="$3"
elif [ $# -eq 1 ]; then
  CERT_DOMAIN="$1"
fi

# ---------- 交互输入缺失项 ----------
if [ -z "$CERT_DOMAIN" ]; then
  read -r -p "请输入待签发域名（如 notary.example.com）：" CERT_DOMAIN
fi
if [ -z "$ALI_KEY" ]; then
  read -r -p "请输入阿里云 AccessKey ID：" ALI_KEY
fi
if [ -z "$ALI_SECRET" ]; then
  read -s -p "请输入阿里云 AccessKey Secret（不回显）：" ALI_SECRET
  echo ""
fi

# ---------- 校验 ----------
if [ -z "$CERT_DOMAIN" ] || [ -z "$ALI_KEY" ] || [ -z "$ALI_SECRET" ]; then
  echo "[ERR] 域名、Ali_Key、Ali_Secret 均不能为空" >&2
  exit 1
fi

echo "[INFO] 目标域名: $CERT_DOMAIN"
echo "[INFO] 证书目录: $CERT_DIR"

# ---------- 预检 acme.sh ----------
if [ ! -x "$ACME_SH" ]; then
  echo "[ERR] acme.sh 未安装或不可执行: $ACME_SH" >&2
  exit 1
fi

# ---------- 导出阿里云凭据（仅当前进程及子进程可见） ----------
export Ali_Key="$ALI_KEY"
export Ali_Secret="$ALI_SECRET"

# ---------- 签发 ----------
echo "[INFO] 开始通过阿里云 DNS-01 挑战签发证书（首次可能需 1-2 分钟）..."
"$ACME_SH" --issue --dns dns_ali -d "$CERT_DOMAIN" \
  --keylength ec-256 \
  --server letsencrypt

# ---------- 安装到服务目录 ----------
mkdir -p "$CERT_DIR"
# 备份现有证书（自签或旧证书）
if [ -f "$CERT_DIR/cert.pem" ]; then
  BACKUP="$CERT_DIR/cert.pem.bak.$(date +%Y%m%d%H%M%S)"
  cp "$CERT_DIR/cert.pem" "$BACKUP"
  echo "[INFO] 旧证书已备份: $BACKUP"
fi
if [ -f "$CERT_DIR/key.pem" ]; then
  BACKUP="$CERT_DIR/key.pem.bak.$(date +%Y%m%d%H%M%S)"
  cp "$CERT_DIR/key.pem" "$BACKUP"
  echo "[INFO] 旧私钥已备份: $BACKUP"
fi

# 安装 fullchain + key
"$ACME_SH" --install-cert -d "$CERT_DOMAIN" --ecc \
  --fullchain-file "$CERT_DIR/cert.pem" \
  --key-file "$CERT_DIR/key.pem" \
  --reloadcmd "pkill -f 'node server.js' 2>/dev/null; cd /workspace && nohup node server.js >/tmp/notary-https.log 2>&1 &"

# ---------- 清理敏感环境变量 ----------
unset Ali_Key Ali_Secret

echo "[OK] 证书签发并安装完成"
echo "[OK] 证书: $CERT_DIR/cert.pem"
echo "[OK] 私钥: $CERT_DIR/key.pem"
echo "[OK] HTTPS 服务已自动重载"
echo ""
echo "验证: curl -sk https://$CERT_DOMAIN:8090/  或  curl -sk https://localhost:8090/"
