# 提交并发防护设计规范

> **状态**: Active
> **适用范围**: 所有涉及异步提交/删除/状态变更的页面和组件
> **关联**: `AGENTS.md` Error Handling 章节、`packages/shared/src/http/client.ts`

## 核心原则

1. **提交类操作必须防重复**：保存、删除、状态切换等改变服务端状态的操作，在请求 pending 期间必须禁用触发按钮。
2. **使用 `useMutation` + `isPending`**：本项目已使用 React Query（TanStack Query），`useMutation` 自带 `isPending` 状态管理，是防重复提交的标准方案。
3. **不用 `useActionState`**：`useActionState` 是为 React Server Components 设计的，本项目的提交都是客户端 AJAX，不适合此场景。
4. **不用手动 `useState(false)` 做提交锁**：仅在无法使用 `useMutation` 的场景（如登录页，提交逻辑直接操作 auth store 而非 mutation）才允许手动 `useState` + `disabled`。

## 推荐模式

### 模式 A：单操作 mutation（保存、提交）

```tsx
const saveMutation = useMutation({
  mutationFn: saveOrderDetail,
  onSuccess: (saved) => {
    toast.success(t('masterDetail.detail.saveSuccess'));
  },
  onError: () => {
    toast.error(t('masterDetail.detail.saveFailed'));
  },
});

const handleSave = () => {
  const errors = validate();
  if (Object.keys(errors).length > 0) {
    toast.error(t('validation.fixErrors'));
    return;
  }
  saveMutation.mutate(draft);  // 不用 mutateAsync
};

<Button onClick={handleSave} disabled={saveMutation.isPending}>
  {saveMutation.isPending ? t('common.saving') : t('masterDetail.detail.saveAll')}
</Button>
```

要点：
- 使用 `mutate()` 而非 `mutateAsync()`，避免外层需要 `void` 或 `await`。
- `disabled={saveMutation.isPending}` 防止双击。
- 可选：pending 时更换按钮文字。

### 模式 B：多操作共享 mutation（列表页删除/复制/状态切换）

```tsx
const actionMutation = useMutation({
  mutationFn: async (fn: () => Promise<void>) => fn(),
  onSuccess: () => {
    void queryClient.invalidateQueries({ queryKey: ['items'] });
  },
});

const handleDelete = (id: string) => {
  if (!window.confirm(t('confirmDelete'))) return;
  actionMutation.mutate(async () => {
    await deleteItem(id);
    toast.success(t('deleteSuccess'));
  });
};

const handleDuplicate = (item: Item) => {
  actionMutation.mutate(async () => {
    await saveItem({ ...item, id: generateId() });
    toast.success(t('duplicateSuccess'));
  });
};

<Button onClick={() => handleDelete(row.id)} disabled={actionMutation.isPending}>
  <Trash2 className="size-4" />
</Button>
```

要点：
- 用 `() => Promise<void>` 作为 `mutationFn`，让不同操作共享同一个 pending 状态。
- 所有触发按钮共享 `disabled={actionMutation.isPending}`，确保同一时间只有一个操作在执行。
- `onSuccess` 中统一 invalidate queries。

### 模式 C：手动 useState（仅限无法使用 useMutation 的场景）

```tsx
const [submitting, setSubmitting] = useState(false);

const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  try {
    setSubmitting(true);
    await loginWithPassword(username, password);
    login(payload);
  } catch (error) {
    toast.error(errorMessage(error));
  } finally {
    setSubmitting(false);
  }
};

<Button disabled={submitting} type="submit">
  {submitting ? t('common.loading') : t('auth.login')}
</Button>
```

适用场景：
- 登录页（提交后直接调用 `authStore.login()`，不经过 mutation）。
- 其他不通过 React Query 管理的异步操作。

## 反模式

### 禁止：未禁用按钮的异步操作

```tsx
// 错误：用户可以连续点击触发多次请求
const handleSave = async () => {
  await saveData(draft);
};
<Button onClick={() => void handleSave()}>Save</Button>
```

### 禁止：`void handleXxx()` 无 loading 态

```tsx
// 错误：void 包裹 async 函数，既无 loading 态也无错误处理
<Button onClick={() => void handleDelete(row.id)}>Delete</Button>
```

### 禁止：`mutateAsync` + `void` 组合

```tsx
// 错误：mutateAsync 需要 await 或 void，增加复杂度
const handleSave = async () => {
  await saveMutation.mutateAsync(draft);
};
<Button onClick={() => void handleSave()}>Save</Button>

// 正确：直接用 mutate，不需要 async/void
const handleSave = () => {
  saveMutation.mutate(draft);
};
<Button onClick={handleSave} disabled={saveMutation.isPending}>Save</Button>
```

## HTTP 层并发保护

`packages/shared/src/http/client.ts` 已内置以下保护：

| 保护类型 | 实现位置 | 机制 |
|---|---|---|
| Token 刷新去重 | `createHttpClient` 中的 `refreshPromise` | 并发 401 共享同一个 refresh 调用 |
| 401 重试 | `request()` 方法 | 刷新成功后重试原请求一次，失败则 logout |
| 主动刷新 | `tokenManager.getValidToken()` | 请求前检查 token 即将过期则提前刷新 |

HTTP 层不需要额外防重复逻辑，并发防护在 UI 层（mutation isPending）完成。

## 检查清单

添加新的提交/删除/状态变更操作时：

- [ ] 是否使用了 `useMutation` 管理 async 操作？
- [ ] 触发按钮是否有 `disabled={mutation.isPending}`？
- [ ] 是否使用 `mutate()` 而非 `mutateAsync()`？
- [ ] 是否有 `onError` 回调展示错误信息？
- [ ] `onSuccess` 中是否正确刷新了相关 query？
