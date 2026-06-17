# 条件显隐与联动

## 显隐

```json
{"type":"select","name":"method","label":"方式","options":[
  {"label":"邮件","value":"email"},{"label":"短信","value":"sms"}
]},
{"type":"input-email","name":"email","label":"邮箱","visibleOn":"${method==='email'}","requiredOn":"${method==='email'}"},
{"type":"input-text","name":"phone","label":"手机","visibleOn":"${method==='sms'}"}
```

## 选项联动

```json
{"type":"select","name":"province","label":"省份","options":[
  {"label":"广东","value":"gd"},{"label":"浙江","value":"zj"}
]},
{"type":"select","name":"city","label":"城市",
 "source":"/api/cities?province=${province}","initFetch":false,
 "visibleOn":"${province}"}
```

## autoFill

```json
{"type":"select","name":"product","label":"商品","source":"/api/products",
 "autoFill":{"price":"${price}","unit":"${unit}"}}
```

## 禁用条件

```json
{"type":"switch","name":"superAdmin","label":"超级管理员","disabledOn":"${role!=='admin'}"}
```
