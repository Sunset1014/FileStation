#!/bin/bash
# ============================================================
#  File Station — 一键安装脚本
#
#  功能：
#    1. 将主题文件（html/js）复制到网站根目录的 .theme 文件夹
#    2. 设置安全的文件权限
#    3. 输出后续配置指引
#
#  用法：
#    git clone https://github.com/Sunset1014/FileStation.git
#    cd FileStation
#    chmod +x install.sh
#    sudo ./install.sh /www/wwwroot/your-download-site
#
#  或使用交互式安装：
#    sudo ./install.sh
# ============================================================

set -e

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     📁 File Station 一键安装脚本        ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

# ============================================================
#  确定脚本所在目录（即 git clone 下来的项目目录）
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 检查必要文件是否存在
REQUIRED_FILES=("header.html" "footer.html" "fs.js")
for f in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "${SCRIPT_DIR}/${f}" ]; then
        echo -e "${RED}错误：未找到 ${f}${NC}"
        echo "请确保在 File Station 项目目录中运行此脚本。"
        exit 1
    fi
done

# ============================================================
#  获取网站根目录
# ============================================================
SITE_ROOT="$1"

if [ -z "$SITE_ROOT" ]; then
    echo -e "${YELLOW}请输入你的网站根目录路径（下载文件存放的位置）：${NC}"
    echo -e "例如：/www/wwwroot/download.example.com"
    echo ""
    read -rp "网站根目录: " SITE_ROOT
fi

# 去除末尾斜杠
SITE_ROOT="${SITE_ROOT%/}"

if [ -z "$SITE_ROOT" ]; then
    echo -e "${RED}错误：未提供网站根目录${NC}"
    exit 1
fi

if [ ! -d "$SITE_ROOT" ]; then
    echo -e "${YELLOW}目录 ${SITE_ROOT} 不存在，是否创建？(y/n)${NC}"
    read -rp "" CREATE_DIR
    if [ "$CREATE_DIR" = "y" ] || [ "$CREATE_DIR" = "Y" ]; then
        mkdir -p "$SITE_ROOT"
        echo -e "${GREEN}✓ 已创建目录：${SITE_ROOT}${NC}"
    else
        echo -e "${RED}已取消安装${NC}"
        exit 1
    fi
fi

THEME_DIR="${SITE_ROOT}/.theme"

# ============================================================
#  创建目录结构
# ============================================================
echo ""
echo -e "${BOLD}[1/3] 创建目录结构...${NC}"

mkdir -p "$THEME_DIR"

echo -e "  ${GREEN}✓${NC} ${THEME_DIR}"

# ============================================================
#  复制主题文件
# ============================================================
echo ""
echo -e "${BOLD}[2/3] 复制主题文件...${NC}"

cp "${SCRIPT_DIR}/header.html" "${THEME_DIR}/header.html"
echo -e "  ${GREEN}✓${NC} header.html"

cp "${SCRIPT_DIR}/footer.html" "${THEME_DIR}/footer.html"
echo -e "  ${GREEN}✓${NC} footer.html"

cp "${SCRIPT_DIR}/fs.js" "${THEME_DIR}/fs.js"
echo -e "  ${GREEN}✓${NC} fs.js"

# ============================================================
#  设置安全权限
# ============================================================
echo ""
echo -e "${BOLD}[3/3] 设置文件权限...${NC}"

chmod 755 "$THEME_DIR"
chmod 644 "${THEME_DIR}/header.html"
chmod 644 "${THEME_DIR}/footer.html"
chmod 644 "${THEME_DIR}/fs.js"

echo -e "  ${GREEN}✓${NC} .theme/ → 755"
echo -e "  ${GREEN}✓${NC} 主题文件 → 644 (只读)"

# ============================================================
#  完成 — 输出后续步骤
# ============================================================
echo ""
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ 安装完成！${NC}"
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo ""
echo -e "主题文件已安装到：${CYAN}${THEME_DIR}${NC}"
echo ""
echo -e "${BOLD}接下来你需要：${NC}"
echo ""
echo -e "  ${YELLOW}1.${NC} 配置 Nginx"
echo "     将以下关键配置加入你的站点 server 块："
echo ""
echo -e "     ${CYAN}location / {${NC}"
echo -e "     ${CYAN}    autoindex on;${NC}"
echo -e "     ${CYAN}    autoindex_exact_size off;${NC}"
echo -e "     ${CYAN}    autoindex_localtime on;${NC}"
echo -e "     ${CYAN}    add_before_body /___theme___/header.html;${NC}"
echo -e "     ${CYAN}    add_after_body  /___theme___/footer.html;${NC}"
echo -e "     ${CYAN}    ssi on;${NC}"
echo -e "     ${CYAN}    try_files \$uri \$uri/ =404;${NC}"
echo -e "     ${CYAN}}${NC}"
echo ""
echo -e "     ${CYAN}location /___theme___/ {${NC}"
echo -e "     ${CYAN}    alias ${THEME_DIR}/;${NC}"
echo -e "     ${CYAN}    internal;${NC}"
echo -e "     ${CYAN}}${NC}"
echo ""
echo -e "     ${CYAN}location = /___theme___/fs.js {${NC}"
echo -e "     ${CYAN}    alias ${THEME_DIR}/fs.js;${NC}"
echo -e "     ${CYAN}}${NC}"
echo ""
echo -e "     ${CYAN}location ~ ^/(\\.theme|\\.git|\\.env|\\.svn|\\.htaccess) {${NC}"
echo -e "     ${CYAN}    return 404;${NC}"
echo -e "     ${CYAN}}${NC}"
echo ""
echo -e "  ${YELLOW}2.${NC} 重载 Nginx"
echo -e "     ${CYAN}nginx -t && nginx -s reload${NC}"
echo ""
echo -e "  完整文档请参阅：${CYAN}README.md${NC}"
echo ""
