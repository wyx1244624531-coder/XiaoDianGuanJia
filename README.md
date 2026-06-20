# 小店管家

小店管家是一个面向便利店、粮油店、水果店、文具店、五金店、母婴店等小型门店的零售收银记账系统。

当前版本使用 Next.js + Supabase，已经完成登录保护、商品分类和商品数据的数据库读写。订单、流水、挂账等模块暂时仍保留前端本地状态，后续可以继续接入数据库。

## 技术栈

- Next.js App Router
- TypeScript
- Supabase Auth
- Supabase Database
- CSS 单文件样式

## 本地运行

先安装依赖：

```bash
pnpm install
```

再启动开发服务：

```bash
pnpm dev
```

打开：

- `http://localhost:3000/login`
- `http://localhost:3000/dashboard`

如果你不用 pnpm，也可以使用 npm：

```bash
npm install
npm run dev
```

## Supabase 配置

1. 在 Supabase 创建一个项目。
2. 打开 Project Settings，复制 Project URL 和 anon public key。
3. 复制 `.env.example`，新建 `.env.local`。
4. 填入你的 Supabase 配置：

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 创建数据库表

进入 Supabase 的 SQL Editor，复制并执行：

```text
supabase/schema.sql
```

这个脚本会创建：

- `categories`：商品分类表
- `products`：商品表

并开启 Row Level Security，保证每个用户只能访问自己的分类和商品。

## 已完成功能

- `/login` 登录和注册
- `/dashboard` 登录保护
- 退出登录
- 商品分类从 Supabase 读取和写入
- 商品从 Supabase 读取、新增、编辑、删除
- 不同店铺类型使用 `store_type` 隔离数据
- 首次进入某个店铺类型时自动创建默认分类和商品
- 商品卡片右键删除
- 当前订单、收款、库存预警、挂账记录保留前端本地逻辑

## 发布到 Vercel

部署到 Vercel 时，需要在 Project Settings 里配置：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

然后正常部署 Next.js 项目即可。

## 常用检查

```bash
pnpm exec tsc --noEmit
pnpm build
```

## 下一步计划

- 把订单写入 Supabase
- 把库存扣减写入 Supabase
- 把今日流水和挂账记录写入 Supabase
- 增加店铺信息表
- 增加更完整的数据备份和导出功能
