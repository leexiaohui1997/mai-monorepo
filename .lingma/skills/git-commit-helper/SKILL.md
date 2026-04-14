---
name: git-commit-helper
description: 智能分析 Git 暂存区和工作区状态,自动暂存变更并生成中文提交信息。使用当用户需要提交代码、生成 commit message、或分析代码变更时。
---

# Git 提交助手

## 工作流程

严格按照以下步骤执行 Git 提交流程:

### 步骤一:分析 Git 状态

首先检查暂存区和工作区的状态:

```bash
# 检查暂存区是否有内容(返回码 0=无差异,非 0=有差异)
git diff --cached --quiet
STAGED_EXIT=$?

# 检查工作区是否有内容(返回码 0=干净,非 0=有变更)
git diff --quiet
WORKING_EXIT=$?
```

**决策逻辑**:

- **情况 1**: `$STAGED_EXIT != 0` (暂存区有内容)
  - ✅ 直接进入步骤二

- **情况 2**: `$STAGED_EXIT == 0` 且 `$WORKING_EXIT != 0` (暂存区空,工作区有变更)
  - 执行 `git add .` 将所有变更加入暂存区
  - ✅ 进入步骤二

- **情况 3**: `$STAGED_EXIT == 0` 且 `$WORKING_EXIT == 0` (都没有内容)
  - ❌ 结束流程,提示"没有可提交的变更"

### 步骤二:获取 Diff 变更

获取暂存区的详细变更信息,需要**逐个文件**分析:

```bash
# 1. 先获取变更文件列表
git diff --cached --name-only

# 2. 对每个文件获取具体变更(重要!)
git diff --cached <filepath>
```

**关键信息提取策略**:

1. **对于新增文件**:
   - 读取文件内容了解其功能
   - 识别文件类型和所属模块
   - 提取关键函数、类、接口定义

2. **对于修改文件**:
   - 使用 `git diff --cached <filepath>` 查看具体变更
   - 关注新增/删除的代码行
   - 识别修改的业务逻辑或功能点

3. **对于删除文件**:
   - 记录被删除的文件路径
   - 理解删除原因(重构/废弃/替换)

4. **综合分析**:
   - 归纳所有文件的变更主题
   - 识别涉及的功能模块或业务领域
   - 提炼出 2-5 个核心变更点

### 步骤三:生成并提交

根据 diff 变更生成**中文**提交信息并直接提交。

#### 提交信息格式

```
<type>(<scope>): <subject>

- <变更点1>
- <变更点2>
- <变更点3>
```

**重要规范**:
- ✅ **使用中文**:Subject 和 Body 都使用中文(技术术语可保留英文)
- ✅ **Body 格式**:必须使用 `- xxx` 逐行列出变更点
- ❌ **无 Footer**:项目不使用 Issue 系统,禁止生成 `Closes #xxx` 等标记
- ✅ **直接提交**:生成后立即执行 `git commit`,无需询问用户

#### Type 类型选择

根据变更内容选择合适的 type:

| Type | 使用场景 | 示例 |
|------|---------|------|
| `feat` | 新功能 | `feat(auth): add JWT login` |
| `fix` | Bug 修复 | `fix(api): correct date parsing` |
| `docs` | 文档变更 | `docs(readme): update installation guide` |
| `style` | 代码格式(不影响功能) | `style: format with prettier` |
| `refactor` | 重构(非功能新增/Bug修复) | `refactor(db): simplify query logic` |
| `perf` | 性能优化 | `perf(render): reduce re-renders` |
| `test` | 测试相关 | `test(auth): add login test cases` |
| `chore` | 构建过程/辅助工具变动 | `chore(deps): update dependencies` |
| `ci` | CI 配置变更 | `ci(github): add deployment workflow` |

#### Scope 范围确定

Scope 应该是受影响的模块或组件名称:
- 前端页面: `pages/login`, `components/header`
- 后端接口: `api/users`, `services/auth`
- 配置文件: `config/database`, `docker`
- 通用变更可省略 scope

#### Subject 主题编写规范

- 使用中文描述
- 精炼专业,避免流水账
- 不超过 50 个字符
- 末尾不加句号
- 清晰说明"做了什么"

**好的示例**:
- ✅ `添加用户登录功能`
- ✅ `修复日期格式化错误`
- ✅ `更新依赖版本`

**差的示例**:
- ❌ `添加了用户的登录功能模块` (冗余)
- ❌ `修复了一个在报表模块中日期显示不正确的bug` (太长)
- ❌ `更新了一些东西` (不清晰)

#### Body 正文格式

**必须使用列表格式**,逐条列出主要变更点:

```
- 实现登录表单及邮箱密码验证
- 集成认证 API 接口
- 添加表单错误提示功能
```

**规范要求**:
- 每条以 `- ` 开头
- 精炼描述,避免冗长解释
- 通常 2-5 条即可
- 与 subject 之间空一行



### 步骤四:直接提交

生成提交信息后,立即执行提交:

```bash
git commit -m "<完整的提交信息>"
```

**无需询问用户**,直接完成提交流程。

## 文件分析示例

### 示例 A:新增多个文件

**场景**:首次提交一个新模块

**分析流程**:
```bash
# 1. 获取文件列表
git diff --cached --name-only
# 输出:
# packages/api/src/providers/manager.ts
# packages/api/src/providers/storage.ts
# packages/api/src/providers/types.ts

# 2. 逐个文件分析
git diff --cached packages/api/src/providers/types.ts
# 看到定义了 Provider 接口和配置类型

git diff --cached packages/api/src/providers/storage.ts  
# 看到实现了本地文件存储逻辑

git diff --cached packages/api/src/providers/manager.ts
# 看到实现了提供商管理器,包含 CRUD 操作
```

**生成的提交信息**:
```
feat(providers): 实现提供商管理模块

- 定义 Provider 接口和配置类型
- 实现基于本地文件的持久化存储
- 提供提供商的增删改查管理功能
```

### 示例 B:修改现有文件

**场景**:修复 Bug 或优化代码

**分析流程**:
```bash
# 1. 获取变更文件
git diff --cached --name-only
# 输出:
# src/utils/date.ts
# src/components/Report.tsx

# 2. 查看具体变更
git diff --cached src/utils/date.ts
# 看到修改了 formatDate 函数,添加了时区处理

git diff --cached src/components/Report.tsx
# 看到调用 formatDate 时传入了正确的时区参数
```

**生成的提交信息**:
```
fix(reports): 修复日期格式化时区转换错误

- 在 formatDate 中添加时区参数支持
- 修复报表组件中日期显示偏差问题
```

## 实际示例

### 示例 1:简单功能新增

**Diff 内容**:
- 新增 `src/pages/Login.tsx`
- 新增 `src/api/auth.ts`

**生成的提交信息**:
```
feat(auth): 添加用户登录功能

- 实现登录表单及邮箱密码验证
- 集成认证 API 接口
```

### 示例 2:Bug 修复

**Diff 内容**:
- 修改 `src/utils/date.ts` 中的日期格式化逻辑
- 修改 `src/components/Report.tsx` 中的日期显示

**生成的提交信息**:
```
fix(reports): 修复日期格式化时区转换错误

- 统一使用 UTC 时间戳处理
- 修复不同时区用户日期显示异常
```

### 示例 3:依赖更新

**Diff 内容**:
- `package.json` 中多个依赖版本更新
- `pnpm-lock.yaml` 相应更新

**生成的提交信息**:
```
chore(deps): 更新项目依赖

- 升级 React 至 v18.2.0
- 升级 TypeScript 至 v5.0.0
- 更新其他次要依赖
```

### 示例 4:重构代码

**Diff 内容**:
- 重构 `src/services/userService.ts`
- 简化数据库查询逻辑
- 提取公共函数

**生成的提交信息**:
```
refactor(users): 简化数据库查询逻辑

- 提取通用查询模式为可复用函数
- 减少用户服务层代码重复
- 优化联表查询提升性能
```

## 注意事项

1. **始终先检查状态**:不要假设暂存区已有内容
2. **使用中文**:Subject 和 Body 都使用中文,保持精炼专业
3. **Body 格式**:必须使用 `- xxx` 列表格式
4. **无 Footer**:严禁生成 `Closes #xxx` 等 Issue 关联标记
5. **直接提交**:生成后立即执行 `git commit`,无需询问
6. **多文件变更**:如果涉及多个不相关的变更,建议拆分为多次提交

## 快速参考

**常用命令**:
```bash
# 查看暂存区状态
git diff --cached --stat

# 查看工作区状态
git diff --stat

# 查看完整 diff
git diff --cached

# 提交
git commit -m "message"
```

**Type 速查**:
- 新功能 → `feat`
- Bug 修复 → `fix`
- 文档 → `docs`
- 重构 → `refactor`
- 样式 → `style`
- 测试 → `test`
- 杂项 → `chore`
