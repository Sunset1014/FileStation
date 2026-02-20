# 📁 File Station

> 将简陋的 Nginx 原生目录索引改造成现代、优雅的文件下载站。

纯静态方案，零依赖，零编译，不需要 fancyindex 等第三方 Nginx 模块。只需 3 个文件 + 几行 Nginx 配置，即可拥有一个美观的文件下载站。

---

## ✨ 功能亮点

| 功能 | 说明 |
|------|------|
| 🎨 极简设计 | Vercel / Apple 风格，`Inter` / `system-ui` 字体栈 |
| 🌗 主题切换 | 自动跟随系统偏好，也可手动切换深色 / 浅色模式 |
| 🔍 实时搜索 | 顶部搜索框即时过滤文件列表，带输入防抖 |
| 📊 列排序 | 点击表头按名称 / 大小 / 修改时间排序，目录始终置顶 |
| 🗂️ 文件图标 | 根据后缀名自动匹配对应 SVG 图标（压缩包/图片/视频/音频/代码/PDF/文档） |
| 🧭 面包屑导航 | 自动解析路径层级，可点击跳转 |
| 📱 响应式布局 | 移动端自动隐藏时间列，适配各种屏幕 |
| 👁️ 在线预览 | 图片/视频/音频/PDF/文本文件在模态框中直接预览，大文本自动截断 |
| ⬇️ 独立下载 | 每个文件行末尾有独立下载按钮，与预览互不冲突 |
| 📢 公告栏 | 可展开/收起的公告区域，内容支持 HTML |
| ⏳ 加载状态 | JS 加载期间显示加载动画，避免空白闪烁 |
| ⚡ 零依赖 | 纯原生 HTML5 + CSS3 + Vanilla JS，无任何第三方库 |

---

## 🔧 工作原理

File Station 利用 Nginx 原生的 `autoindex` 和 `add_before_body` / `add_after_body` 指令实现主题注入：

```
浏览器请求目录
    │
    ├── add_before_body → .theme/header.html    ← CSS 样式 + HTML 骨架
    │                     └── <script src="fs.js">
    │
    ├── Nginx 生成原始 <h1> + <hr> + <pre> 文件列表
    │   （被 CSS 隐藏：body > h1, body > hr, body > pre { display: none }）
    │
    └── add_after_body → .theme/footer.html     ← 页脚 + 闭合标签

fs.js 在页面加载后：
  1. 解析隐藏的 <pre> 中的文件列表数据
  2. 渲染成美观的表格 + 图标 + 预览链接
  3. 初始化搜索、排序、主题切换、公告等交互功能
```

整个过程不需要后端脚本或第三方 Nginx 模块，纯前端完成。

---

## 📦 文件结构

```
filestation/
├── header.html      # CSS 样式 + HTML 结构（由 Nginx 注入到页面头部）
├── footer.html      # 页脚 + 闭合标签（由 Nginx 注入到页面尾部）
├── fs.js            # 核心 JavaScript 逻辑
├── install.sh       # 一键安装脚本
├── nginx.conf       # Nginx 配置模板
└── README.md        # 本文档
```

部署后的目录结构：

```
/www/wwwroot/your-site/
├── .theme/                 ← 主题文件夹（对外不可见）
│   ├── header.html
│   ├── footer.html
│   └── fs.js
├── movies/                 ← 你的文件和目录
├── music/
└── readme.txt
```

---

## 🚀 部署

### 方式 A：一键安装（推荐）

```bash
git clone https://github.com/Sunset1014/FileStation.git
cd FileStation
chmod +x install.sh
sudo ./install.sh /www/wwwroot/your-site
```

脚本会自动创建 `.theme/` 目录、复制文件并设置权限（目录 755，文件 644）。

### 方式 B：手动安装

```bash
mkdir -p /www/wwwroot/your-site/.theme
cp header.html footer.html fs.js /www/wwwroot/your-site/.theme/
chmod 755 /www/wwwroot/your-site/.theme
chmod 644 /www/wwwroot/your-site/.theme/*
```

### 配置 Nginx

将以下配置加入你的站点 `server` 块（完整模板见 `nginx.conf`）：

```nginx
server {
    listen       80;
    server_name  files.example.com;          # 改为你的域名
    root         /www/wwwroot/your-site;     # 改为你的网站根目录
    charset      utf-8;

    # 核心：开启目录索引 + 注入主题
    location / {
        autoindex on;
        autoindex_exact_size off;
        autoindex_localtime on;
        add_before_body /___theme___/header.html;
        add_after_body  /___theme___/footer.html;
        ssi on;
        try_files $uri $uri/ =404;
    }

    # 主题 HTML 映射（internal 防止直接访问）
    location /___theme___/ {
        alias /www/wwwroot/your-site/.theme/;   # 改为你的路径，末尾带 /
        internal;
    }

    # 主题 JS 映射（浏览器需要加载，不能 internal）
    location = /___theme___/fs.js {
        alias /www/wwwroot/your-site/.theme/fs.js;   # 改为你的路径
    }

    # 禁止访问隐藏目录
    location ~ ^/(\.theme|\.git|\.env|\.svn|\.htaccess|\.user\.ini) {
        return 404;
    }
}
```

> **⚠️ 关键注意事项：**
> - `alias` 路径必须与 `root` 指向同一网站目录，末尾带 `/`
> - `fs.js` 的 location **不能**加 `internal`，否则浏览器无法加载 JS，页面会变成原始样式
> - 必须添加 `ssi on;`，否则主题注入不生效

### 重载 Nginx

```bash
nginx -t && nginx -s reload
```

---

## 🎛️ 自定义

| 项目 | 位置 | 说明 |
|------|------|------|
| 站点名称 | `header.html` | 搜索 `File Station` 替换为你的站点名 |
| 页脚文字 | `footer.html` | 修改 `<footer>` 中的内容 |
| 公告内容 | `header.html` | 编辑 `id="jAX"` 的 `<div>` |
| GitHub 链接 | `header.html` | 修改 GitHub 按钮的 `href` |
| 强调色 | `header.html` | 修改 `:root` 中的 `--accent`（默认 `#0071e3`） |
| 最大宽度 | `header.html` | 修改 `--max-width`（默认 `960px`） |
| 文件图标分类 | `fs.js` | 修改 `EXT_MAP` 对象 |
| 可预览的格式 | `fs.js` | 修改 `PREVIEW_IMAGE` / `PREVIEW_VIDEO` / `PREVIEW_AUDIO` / `PREVIEW_PDF` / `PREVIEW_TEXT` 数组 |

---

## ❓ 常见问题

**页面显示 404 或原始 Nginx 目录列表？**
1. 确认 `ssi on;` 已添加
2. 确认 `alias` 路径末尾带 `/`
3. 确认 `fs.js` 的 location 没有 `internal`
4. 确认 `.theme/` 目录中文件存在且路径正确
5. F12 → Network 检查哪些资源返回了 404

**`.theme` 在文件列表中可见？**
添加 `location ~ ^/(\.theme) { return 404; }`。

**`index.html` 覆盖了文件列表？**
删除根目录下的 `index.html`，autoindex 只在没有 index 文件时生效。

**中文文件名乱码？**
确保 Nginx 配置中有 `charset utf-8;`。

**HTTPS 配置？**
将 `listen 80` 改为 `listen 443 ssl`，添加证书配置即可，主题部分不需要改动。

---

## 🛡️ 防盗刷 / 流量防护

### Nginx 限流

在 `nginx.conf` 的 `http {}` 块中添加：

```nginx
limit_req_zone $binary_remote_addr zone=fs_req:10m rate=10r/s;
limit_conn_zone $binary_remote_addr zone=fs_conn:10m;
```

在站点的 `location /` 中启用：

```nginx
limit_req zone=fs_req burst=20 nodelay;
limit_conn fs_conn 10;
limit_rate 5m;            # 单连接限速 5MB/s
limit_req_status 429;
limit_conn_status 429;
```

### Fail2Ban 自动封禁

创建 `/etc/fail2ban/filter.d/nginx-429.conf`：

```ini
[Definition]
failregex = ^<HOST> .* 429
```

创建 `/etc/fail2ban/jail.d/nginx-429.conf`：

```ini
[nginx-429]
enabled  = true
filter   = nginx-429
logpath  = /www/wwwlogs/*.log
maxretry = 30
findtime = 60
bantime  = 3600
```

### 宝塔面板

网站 → 流量限制 / 安全 → CC 防护 / Nginx 防火墙插件。

### Cloudflare

开启 Under Attack Mode / Rate Limiting / Bot Fight Mode。

---

## 📄 许可证

MIT License — 可自由使用、修改和分发。
