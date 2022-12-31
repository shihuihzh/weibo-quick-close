Weibo Quick Close 
--------------------------

快速把你的所有微博设置成仅自己可见

### 原理
1. 把所有微博 `ID` 爬下来
2. 修改可见状态为 `仅自己可见`

### 步骤
#### 1. 设置 `cookie`，`uid`，`xsrfToken`
打开微博 `个人主页` 和浏览器的 `开发者工具` 。刷新页面，从 `Nework` 选项卡的请求的 `request` 和 `response` 的header中找到对应的值并设置到
[setting](https://github.com/shihuihzh/weibo-quick-close/blob/main/index.js#L5-L7)中

#### 2. 执行
```` bash
npm install
node index.js
````


###  已知问题
1. 微博会反爬虫，具体为请求返回 `414` 。所以你可以通过设置 [`timout`](https://github.com/shihuihzh/weibo-quick-close/blob/main/index.js#L8) 来调整速度。 [详请](https://blog.csdn.net/weixin_30462049/article/details/96181873)
2. 函数 `fetchIdAndSave (获得所有微博ID并保存)` 理论上只需要跑一次，成功后会保存所有 `ID` 到文件供后续操作。函数执行时会检查文件，如果 `ID` 文件已经存在了，程序会退出以免重复爬 `ID` 数据。
3. 函数 `setAllPrivate (设置仅自己可见)` 支持断点。所以你可以多跑几次，函数会自动跳过已经设置成功的。
