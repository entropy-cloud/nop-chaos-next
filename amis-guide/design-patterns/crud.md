# CRUD 标准操作

```json
{
  "type": "crud",
  "name": "table1",
  "api": "/api/users",
  "mode": "table",
  "perPage": 10,
  "syncLocation": false,
  "columns": [
    {"name": "id", "label": "ID", "width": 60},
    {"name": "name", "label": "姓名", "searchable": true},
    {"name": "email", "label": "邮箱"},
    {"name": "status", "label": "状态", "type": "mapping", "map": {"1":"启用","0":"禁用"}},
    {"name": "createdAt", "label": "时间", "type": "date", "format": "YYYY-MM-DD"},
    {"type": "operation", "label": "操作", "buttons": [
      {"type":"button","label":"编辑","actionType":"dialog","dialog":{
        "title":"编辑用户","data":{"id":"${id}","name":"${name}","email":"${email}"},
        "body":{"type":"form","api":"put:/api/users/${id}","body":[
          {"type":"input-text","name":"name","label":"姓名","required":true},
          {"type":"input-email","name":"email","label":"邮箱"}
        ]}
      }},
      {"type":"button","label":"删除","actionType":"ajax","api":"delete:/api/users/${id}",
       "confirmText":"确定删除？","reload":"table1"}
    ]}
  ],
  "toolbar": [
    {"type":"action","label":"新增","level":"primary","icon":"fa-plus","actionType":"dialog","dialog":{
      "title":"新增用户",
      "body":{"type":"form","api":"post:/api/users","body":[
        {"type":"input-text","name":"name","label":"姓名","required":true},
        {"type":"input-email","name":"email","label":"邮箱"}
      ]}
    }}
  ],
  "footerToolbar": ["statistics", "pagination"]
}
```

**关键点**：`dialog.data` 传当前行数据给弹窗 → 弹窗内 form 引用 `${id}` → 操作完 `reload` table。
