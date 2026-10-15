# 原来如此 · yuan-lai-ru-ci

把听说过的技术讲透 —— 技术概念科普站。

🌐 线上地址：https://www.aha.voyager06.tech

## 项目结构

```
index.html          入口（页头 / 搜索 / 页脚 / #app 挂载点）
css/style.css       全部样式
js/app.js           SPA 逻辑（数据加载 / Hash 路由 / 页面渲染）
content/*.json      17 个内容文件（文章数据）
```

纯静态站点，无构建步骤，Vercel 直接部署。

## 内容数据

每篇文章包含：`id` / `name` / `category` / `tagline` / `scene`（日常场景）/
`principle`（一句话 + 步骤 + 详解）/ `guide`（路线 / 清单 / 代码 / 踩坑）/ `sources`。

## 部署

推送到 `main` 分支后 Vercel 自动部署到生产环境。
