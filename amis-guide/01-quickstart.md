# 快速入门 - 10 个最常用代码段

> 所有组件字段参考 `amis-types/*.d.ts`。这里只给最常用的骨架。

---

## 1. 最简页面

```json
{"type":"page","title":"首页","body":"Hello"}
```

## 2. 页面带数据请求

```json
{
  "type":"page","initApi":"/api/init",
  "body":{"type":"tpl","tpl":"用户: ${name}, 角色: ${role}"}
}
```

## 3. CRUD 表格

```json
{
  "type":"crud","api":"/api/users","mode":"table",
  "columns":[
    {"name":"id","label":"ID"},
    {"name":"name","label":"姓名"}
  ],
  "toolbar":[
    {"type":"action","label":"新增","actionType":"dialog","dialog":{
      "title":"新增","body":{"type":"form","api":"/api/users/create","body":[
        {"type":"input-text","name":"name","label":"姓名"}
      ]}
    }}
  ],
  "footerToolbar":["statistics","pagination"]
}
```

## 4. 表单 + 提交

```json
{
  "type":"form","api":"/api/submit",
  "body":[
    {"type":"input-text","name":"name","label":"姓名","required":true},
    {"type":"input-email","name":"email","label":"邮箱"},
    {"type":"submit","label":"提交"}
  ]
}
```

## 5. 弹窗编辑（提取当前行数据）

```json
{
  "type":"button","label":"编辑","actionType":"dialog",
  "dialog":{
    "title":"编辑","data":{"id":"${id}","name":"${name}"},
    "body":{"type":"form","api":"put:/api/users/${id}","body":[
      {"type":"input-text","name":"name","label":"姓名"}
    ]}
  }
}
```

## 6. Combo 动态增删

```json
{
  "type":"combo","name":"items","label":"明细",
  "multiple":true,"addable":true,"removable":true,"draggable":true,
  "scaffold":{"product":"","quantity":1},
  "items":[
    {"type":"input-text","name":"product","placeholder":"商品"},
    {"type":"input-number","name":"quantity","label":"数量"}
  ]
}
```

## 7. 条件显隐

```json
{
  "type":"select","name":"type","label":"类型","options":[
    {"label":"A","value":"a"},{"label":"B","value":"b"}
  ]
},
{"type":"input-text","name":"detail","label":"详情","visibleOn":"${type === 'a'}"}
```

## 8. onEvent 动作链

```json
{
  "type":"button","label":"提交","onEvent":{
    "click":{"actions":[
      {"actionType":"ajax","api":"/api/save","outputVar":"result"},
      {"actionType":"toast","args":{"msg":"${result.msg}","msgType":"success"}}
    ]}
  }
}
```

## 9. Service 数据容器

```json
{
  "type":"service","api":"/api/dashboard",
  "body":[
    {"type":"tpl","tpl":"用户数: ${userCount}"},
    {"type":"chart","api":"/api/chart/data"}
  ]
}
```

## 10. Wizard 多步骤

```json
{
  "type":"wizard","api":"/api/submit",
  "steps":[
    {"title":"第一步","body":[
      {"type":"input-text","name":"name","label":"姓名","required":true}
    ]},
    {"title":"第二步","body":[
      {"type":"input-text","name":"address","label":"地址"}
    ]}
  ]
}
```
