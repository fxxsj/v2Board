# Vite 重做 user 前端实施设计

## 1. 目标

本方案目标：

- 保留现有 Laravel / v2Board 后端 API
- 重做 user 前端，不再沿用旧 `public/theme/default` 主题构建体系
- 使用 Vite + React + TypeScript 构建独立、可维护、可部署的新用户前端
- Laravel 仅作为 API 提供者和前端入口挂载层
- 新前端先通过独立入口验证，再决定是否替换正式 `/` 首页

非目标：

- 本阶段不重做 admin 前端
- 本阶段不兼容旧 Umi 运行时/旧 theme 构建产物
- 本阶段不保留旧 hash 路径拼接、外部 i18n script 注入等历史机制

---

## 2. 现状问题

旧 user 前端存在以下结构性问题：

- 主题模板、构建产物、运行时配置耦合严重
- 路由模式、资源路径、publicPath、Blade 注入逻辑互相污染
- i18n 依赖外部脚本注入，初始化顺序不稳定
- 升级 Umi 版本后，layout / runtime / plugin manager 兼容性差
- 构建产物不可重复部署，需要手工 patch bundle

结论：继续修补旧前端收益极低，应停止在旧 `theme/default` 架构上打补丁。

---

## 3. 总体架构

### 3.1 技术选型

推荐技术栈：

- Vite
- React 18
- TypeScript
- React Router 6
- Ant Design 5
- Axios
- Zustand
- react-i18next

### 3.2 目录结构

建议目录：

```txt
v2board/
├─ app/
├─ routes/
├─ resources/views/
│  ├─ admin.blade.php
│  └─ user-app.blade.php
├─ public/
│  ├─ build/
│  │  └─ user/
│  └─ ...
├─ frontend/
│  └─ user/
│     ├─ src/
│     ├─ public/
│     ├─ index.html
│     ├─ package.json
│     ├─ tsconfig.json
│     └─ vite.config.ts
```

说明：

- `frontend/user`：新 user 前端源码
- `public/build/user`：构建输出目录
- `resources/views/user-app.blade.php`：Laravel 挂载入口

---

## 4. 接入策略

### 4.1 分阶段上线

第一阶段不替换现有 `/`。

建议新增测试入口，例如：

- `/app`
- `/app/{any?}`

用于验证新前端。

第二阶段验证稳定后，再决定是否把 `/` 切到新前端。

### 4.2 Laravel 的职责

Laravel 只负责：

1. 提供 API：`/api/v1/...`
2. 返回前端入口 HTML

Laravel 不再负责：

- 手工拼接 hash 文件名
- 手工注入 chunk / css / i18n 外部脚本
- 运行时 publicPath 修补
- 旧主题资源路径映射

---

## 5. Blade 挂载方案

新增 `resources/views/user-app.blade.php`：

- 提供 `<div id="root"></div>`
- 提供 `window.__APP_CONFIG__`
- 通过 Vite manifest 加载入口 js / css

建议注入配置：

```js
window.__APP_CONFIG__ = {
  apiBase: '/api/v1',
  appName: 'V2Board',
  version: 'x.y.z',
  theme: {
    color: 'default'
  }
}
```

仅保留前端真正需要的配置，不传历史 theme 脚本和模板拼装信息。

---

## 6. 路由设计

### 6.1 公共路由

- `/app`
- `/app/login`
- `/app/register`
- `/app/forgot-password`
- `/app/plan`

### 6.2 登录后路由

- `/app/dashboard`
- `/app/subscribe`
- `/app/ticket`
- `/app/invite`
- `/app/profile`
- `/app/order`

### 6.3 路由原则

- 使用 BrowserRouter
- Laravel 为 `/app/{any?}` 做统一入口 fallback
- 不再使用 hash 路由
- 不沿用 `/user/shop` 等旧 URL 结构

---

## 7. 页面布局

拆分为两套布局：

### PublicLayout

用于：

- 首页
- 登录
- 注册
- 忘记密码
- 套餐页

### AppLayout

用于：

- Dashboard
- 工单
- 邀请
- 订阅
- 个人资料
- 订单

这样可以避免旧系统中“一个 layout 兼容所有场景”的复杂度。

---

## 8. 状态管理

推荐 Zustand，初始拆分：

### authStore

- token
- userInfo
- isAuthenticated
- login/logout

### appStore

- locale
- theme
- globalLoading

### bootstrapStore（可选）

- guest config
- app config
- plans/cache

---

## 9. API 分层

建议目录：

```txt
src/api/
├─ client.ts
├─ auth.ts
├─ guest.ts
├─ user.ts
├─ plan.ts
├─ order.ts
├─ ticket.ts
└─ subscribe.ts
```

### 9.1 client.ts 职责

- 创建 axios 实例
- 注入 baseURL
- 自动附带 Authorization
- 统一处理 401 / 403 / 通用错误
- 统一 response unwrap

### 9.2 首批重点接口

- `GET /guest/comm/config`
- `POST /passport/auth/login`
- `POST /passport/auth/register`
- `GET /user/getUserInfo`
- `GET /user/plan/fetch`
- `GET /user/order/fetch`
- `GET /user/ticket/fetch`

---

## 10. i18n 策略

语言资源直接放前端源码内：

```txt
src/locales/
├─ zh-CN.ts
├─ en-US.ts
└─ index.ts
```

策略：

- 优先用户设置
- 其次浏览器语言
- 最后 fallback 到 `zh-CN`

不再依赖 Blade 注入的外部 i18n js 文件。

---

## 11. 样式与主题

### 11.1 初始方案

- 仅实现 light theme
- 通过 Antd theme token 定制品牌色
- 页面局部样式使用 CSS Modules / Less

### 11.2 暂不做

- 动态加载多套 theme css
- `default.css / green.css / black.css` 运行时切换

理由：先保证系统稳定，避免再次引入运行时路径复杂度。

---

## 12. 静态资源规则

所有资源必须通过以下方式之一引用：

- `import logo from '@/assets/logo.svg'`
- 放在 `frontend/user/public` 并以 `/app-assets/...` 或相对 Vite public 路径引用

禁止：

- `/images/...`
- `/theme/default/...`
- `/theme/v2board/...`

---

## 13. 构建与部署

### 13.1 本地开发

```bash
cd frontend/user
npm install
npm run dev
```

### 13.2 构建

```bash
npm run build
```

输出目录：

- `frontend/user/dist`

### 13.3 部署

将 `dist/*` 同步到：

- `public/build/user/`

Laravel 通过 manifest 读取入口文件。

---

## 14. 路由接入方案

建议在 `routes/web.php` 增加：

- `/app`
- `/app/{any?}`

并返回 `user-app` Blade。

路由示意：

```php
Route::get('/app/{any?}', function () {
    return view('user-app', [...]);
})->where('any', '.*');
```

---

## 15. 实施阶段

### Phase 1：骨架与基础设施

- 建立 Vite 工程
- React Router
- Axios client
- Zustand stores
- i18n 初始化
- 公共 Layout
- App Layout
- Laravel `/app` 入口接入

### Phase 2：公共页面

- 首页
- 登录
- 注册
- 忘记密码
- 套餐页

### Phase 3：登录后核心页面

- Dashboard
- Subscribe
- Ticket
- Invite
- Profile
- Order

### Phase 4：优化与切换

- 验证 `/app` 可用
- 压测常用接口
- 评估是否切换 `/`

---

## 16. 验收标准

满足以下条件才算第一阶段完成：

- 新前端可在 `/app` 正常打开
- 无需手改 bundle / hash / publicPath
- 首页、登录、注册、套餐页可用
- 登录后基础布局和用户信息可用
- 所有静态资源和 chunk 均从 `public/build/user` 正常加载
- Blade 不再承担旧主题运行时注入职责

---

## 17. 下一步任务

立刻执行：

1. 创建 `frontend/user` Vite 项目骨架
2. 创建基础路由和布局
3. 创建 API client 与配置注入
4. 新增 `resources/views/user-app.blade.php`
5. 新增 `/app` 路由接入
6. 验证 `/app` 可以加载空白但完整的 React app
