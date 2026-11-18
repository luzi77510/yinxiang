# 印象研究所

《别人对你的第一印象测试》完整网页项目。18 道情境单选题，三个主结果、一个隐藏彩蛋，支持答题续存、雷达图、分享海报和真实管理后台。

在线网页：[https://luzi77510.github.io/yinxiang/](https://luzi77510.github.io/yinxiang/)

![网站首页预览](docs/preview.webp)

## 两种运行方式

| 功能                         | GitHub Pages 网页        | 完整服务器版     |
| ---------------------------- | ------------------------ | ---------------- |
| 18题、正确计分、同分和彩蛋   | 支持                     | 支持             |
| 返回修改、刷新恢复、结果分析 | 本机保存                 | 本机与服务器保存 |
| 海报与分享摘要               | 支持                     | 支持             |
| 撤销公开链接                 | 链接自包含，无法远程撤销 | 支持             |
| 管理员登录、题库与版本发布   | 需启动服务器版           | 支持             |
| 多用户统计与CSV导出          | 不收集                   | 真实数据库统计   |

GitHub Pages 只提供静态托管。服务端代码和数据库初始化逻辑已经包含在此仓库中；部署到 Node.js 服务器即可启用完整后台。没有伪造参与人数、测试结果或后台统计。

## 本地启动

需要 Node.js 24 LTS（最低 22.13）和 pnpm 11。首次安装可执行 `npm install -g pnpm@11.25.0`。

```sh
git clone https://github.com/luzi77510/yinxiang.git
cd yinxiang
pnpm install
pnpm admin:init
pnpm dev
```

网站：`http://localhost:5180/`。后台：`http://localhost:5180/#/admin`。

`admin:init` 默认生成随机密码，写入本机 `first-login.txt`；此文件已被 Git 忽略。重新执行会重置管理员密码并使原登录失效。可将 `.env.example` 复制为 `.env`，设置自己的 `ADMIN_USERNAME` 和至少 12 位的 `ADMIN_PASSWORD` 后再运行初始化命令。管理员密码使用 scrypt 加盐存储。

Windows 也可在已安装 Node.js/pnpm 后双击 `start-preview.cmd`。

## 验证与构建

```sh
pnpm test
pnpm build
pnpm build:pages
```

`pnpm test` 覆盖算法、同分、彩蛋、1000组多倾向模拟、API权限、结果幂等、分享撤销、版本快照、回滚及统计。测试数据库在内存中，与实际数据隔离。

浏览器检查：安装 Playwright 后执行 `node tests/browser-smoke.mjs`。需启动本地服务、初始化管理员，并在本机安装 Chrome；可通过 `PLAYWRIGHT_MODULE` 指向已有 Playwright 模块，通过 `TEST_URL` 设置测试地址。该脚本会实际生成测试记录和海报，不应在生产服务上运行。

## 生产部署

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm admin:init
pnpm start
```

默认绑定本机 `127.0.0.1:5180`。通过环境变量 `HOST=0.0.0.0` 可对外监听。建议配置 HTTPS 反向代理，在可信代理之后设置 `TRUST_PROXY=1`、`COOKIE_SECURE=true`，同时限制到应用端口的直接访问。

SQLite 数据存放在 `data/yinxiang.sqlite`，首次启动自动建表和导入正式题库，不需要外部数据库账号。服务器部署需要**持久磁盘和单个写入实例**，不适合直接放到无持久存储的函数平台。数据库路径由 `DATA_DIR` 配置，升级前备份整个数据目录。使用 SQLite 是便于直接运行的实现选择；未来可按相同 API 迁移到 PostgreSQL。

### Docker

```sh
docker compose up -d --build
docker compose exec -e ADMIN_USERNAME=admin -e ADMIN_PASSWORD='替换为至少12位的强密码' web node server/init-admin.mjs
```

访问 `http://localhost:5180`。数据库保存在命名卷中。对外启用 HTTPS 时同步修改 Compose 中的 Cookie 与代理设置。Dockerfile 已提供，当前交付环境的本地验证采用 Node.js 运行方式。

### GitHub Pages

仓库 Settings → Pages → Source 选择 **GitHub Actions**。`.github/workflows/pages.yml` 会在 main 分支更新后运行测试、构建静态网页并发布，部署目录为 `dist-pages`。项目基础路径是 `/yinxiang/`，使用 HashRouter 保证刷新与分享链接可用。

`.github/workflows/ci.yml` 会检查完整服务器版和静态版构建。构建工具使用 pnpm 11 的 `allowBuilds` 允许 esbuild 必需的安装脚本。

## 产品规则

- 每题只为 P/G/M 中的一个维度加 1 分，总原始分 18。
- 展示分数为 `Math.round(raw / 18 * 100)`，保留真实四舍五入值，不强行凑成 100。
- P/G 同分看 Q5/Q10/Q15；P/M 看 Q3/Q9/Q12；G/M 看 Q6/Q14/Q18，比较最终选项的维度归属。
- 三维同分按 P > G > M；彩蛋独立检测，不影响正常分数和主结果。
- 三种普通结果比例排除彩蛋会话；彩蛋触发率以全部有效完成会话为分母。后台保留彩蛋的正常主结果字段。
- 每个会话绑定完整配置版本快照，发布与回滚只影响新会话。题目及选项稳定 ID 与显示顺序独立。

完整题库、映射和结果文案见 `shared/seed.json`，规范见 [产品规范](docs/产品规范.md)。

## 代码结构

```text
src/                 React 页面、SVG人格插画、雷达图、海报绘制
shared/seed.json      18题、72选项、四种完整结果和规则
shared/scoring.mjs    统一评分、同分和彩蛋判定、配置校验
server/app.mjs       受保护的服务端 API
server/store.mjs     SQLite 结构、事务、版本、密码与清理
tests/               算法、API和浏览器检查
docs/                产品规范
.github/workflows/   自动验证与静态网页发布
```

## 数据与权限

匿名所有权与管理员登录凭据采用 HttpOnly / SameSite Cookie；正式分数由服务端重算；单个会话重复提交返回已有结果。公开分享只返回摘要，不返回逐题答案或私人结果标识，可撤销。写接口校验请求来源，后台区分管理员与内容运营，关键编辑、发布、回滚和导出写入操作日志。

未完成会话最多保留 7 天，完成记录最多 30 天，操作日志最多 90 天，服务器启动及每小时执行清理。用户可在结果页删除当前记录，服务器会一并移除对应分享。Pages 版仅在浏览器存储记录，公开链接中的摘要发出后无法远程撤回。真实密钥、密码、答题数据库和检查截图均不会上传。

本测试仅供娱乐与自我探索，不代表他人真实评价或专业心理测量结论。尚未进行真人样本的心理测量或均衡性验证。
