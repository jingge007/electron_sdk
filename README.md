# Agora Electron (基于声网electron sdk 和react构建示例应用程序)


## 环境要求
- 在 [Agora.io](https://dashboard.agora.io/signin/)创建一个开发人员帐户。完成注册过程后，您将被重定向到仪表板，在左侧的仪表板树中导航至“ 项目” >“ 项目列表”，从仪表板获取的应用程序ID复制到文本文件中。启动应用程序时将使用它。
- [Node.js](https://nodejs.org/en/download/) 6.9.1+ with C++11 support
- [Electron](https://electronjs.org) >= 1.8.3

## 快速开始
打开 [settings.js](src/utils/settings.js) 文件并添加应用程序App_ID.

注：如果懒得注册开发者账号获取APP ID，可以使用我的APP_ID：8797638c21bc4c1886a74228ffa5c16e

**注意:** npm install 安装依赖项其中electron会默认安装64位的，但是声网的electron sdk 只支持32位的electron
，所以在npm install 安装依赖前在package.json文件中先删掉 "electron": "^5.0.8"，等npm install 安装完依赖项
在单独安装32位的electron （ npm install -D --arch=ia32 electron@5.0.8 ）

```bash  
  # 安装依赖项
  npm install 
```

安装完依赖包可以远行 npm run dev 命令启动和运行项目查看效果
	
```bash
# 启动编译开发环境
npm run dev
```

要打包项目发布版本可以执行命令：npm run dist (但是当前声网提供的打包配置有些问题，打包成功后运行应用程序都是空白的)

```bash
# 打包
npm run dist
```


## 当前存在问题
1. 当前的demo是基于声网的electron-sdk 配置好的环境中开发的，当前的配置的开发环境中会存在打包后运行应用程序时都是空白，已经跟声网那边的相关人员反馈情况，他们正在处理排查问题中。

2. 如果是使用create-react-app 构建项目搭配electron时，根据electron-sdk的demo相关的要求安装完依赖后，执行 npm start 启动项目时会报以下的错误。
![ad](https://raw.githubusercontent.com/jingge007/images/master/1570522317.png)
现在还没有找到这个报错的原因，咨询声网那边的负责人后，他们给出了一个[参考指南](https://github.com/AgoraIO-Community/Agora-Electron-Quickstart/wiki/%E6%90%AD%E5%BB%BA%E6%95%99%E7%A8%8B)但是好像也是没有解决这个报错问题。（有兴趣的小伙伴可以研究一下）

## 相关资料与文档
1. 声网的electron-sdk 的demo地址：https://github.com/AgoraIO-Community/Agora-Electron-Quickstart
2. 声网electron-sdk 的相关资料地址：https://github.com/AgoraIO/Electron-SDK/blob/dev/2.9.0/README.zh.md
3. 声网开发者中心（electron）的文档地址：https://docs.agora.io/cn/Interactive%20Broadcast/API%20Reference/electron/index.html
