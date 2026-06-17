# 自定义扩展

## Custom 组件（内联 HTML/JS）

```json
{"type":"custom","name":"myWidget","html":"<div id='c' style='height:300px'></div>",
 "onMount":"var chart=echarts.init(document.getElementById('c'));chart.setOption({...});",
 "onUpdate":"chart.setOption({...});","onUnmount":"chart.dispose();"}
```

## 注册自定义渲染器

```typescript
@Renderer({type:'my-component'})
class MyComp extends React.Component<RendererProps> {
  render() { return <div>{this.props.data?.msg}</div>; }
}
// 使用: {"type":"my-component","msg":"hello"}
```

## 注册自定义表单项

```typescript
@FormItem({type:'my-input'})
class MyInput extends React.Component<FormControlProps> {
  render() { return <input value={this.props.value} onChange={e=>this.props.onChange(e.target.value)}/>; }
}
// 使用: {"type":"my-input","name":"f1","label":"自定义"}
```

## 注册自定义动作

```typescript
registerAction('myAction', {
  async run(action, renderer, event) {
    event.context.env.notify('success', action.args.msg);
  }
});
// 使用: {"actionType":"myAction","args":{"msg":"done"}}
```
