# API 链式调用

## 串行

```json
{
  "type": "button", "label": "创建项目",
  "onEvent": {"click": {"actions": [
    {"actionType":"ajax","api":"post:/api/projects","data":{"name":"${name}"},"outputVar":"project"},
    {"actionType":"ajax","api":"/api/projects/${project.id}/init","outputVar":"init"},
    {"actionType":"toast","args":{"msg":"完成: ${init.url}"}},
    {"actionType":"goPage","args":{"url":"/projects/${project.id}"}}
  ]}}
}
```

## 并行

```json
{"actionType":"parallel","children":[
  {"actionType":"ajax","api":"/api/users","outputVar":"users"},
  {"actionType":"ajax","api":"/api/roles","outputVar":"roles"}
]}
```

## 循环

```json
{"actionType":"loop","loopName":"item","loopData":"${selectedItems}","children":[
  {"actionType":"ajax","api":"post:/api/process/${item.id}"}
]}
```

## 条件分支

```json
{"actionType":"switch","condition":"${action}","cases":[
  {"value":"approve","actions":[{"actionType":"ajax","api":"post:/api/approve"}]},
  {"value":"reject","actions":[{"actionType":"ajax","api":"post:/api/reject"}]}
]}
```
