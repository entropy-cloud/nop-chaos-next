# Combo 动态增删

```json
{
  "type": "combo",
  "name": "orderItems",
  "label": "订单明细",
  "multiple": true,
  "multiLine": true,
  "minLength": 1,
  "maxLength": 20,
  "addable": true,
  "removable": true,
  "draggable": true,
  "addButtonText": "添加商品",
  "scaffold": {"product": "", "quantity": 1, "price": 0},
  "items": [
    {"type": "input-text", "name": "product", "placeholder": "商品名", "required": true},
    {"type": "input-number", "name": "quantity", "label": "数量", "value": 1, "min": 1},
    {"type": "input-number", "name": "price", "label": "单价", "min": 0, "prefix": "¥"},
    {"type": "input-number", "name": "total", "label": "小计", "disabled": true, "value": "${quantity * price}"}
  ]
}
```

提交数据：`{"orderItems":[{"product":"苹果","quantity":10,"price":5},...]}`

**变体**：`flat:true` 取消嵌套；`typeSwitchable:true` + `forms[]` 支持多类型行。
