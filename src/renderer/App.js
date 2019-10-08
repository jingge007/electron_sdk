import React, {Component} from 'react';
import AgoraRtcEngine from 'agora-electron-sdk';
import {List} from 'immutable';
import path from 'path';
import os from 'os';
import Swal from 'sweetalert2'
import {voiceChangerList, voiceReverbPreset, videoProfileList, audioProfileList, audioScenarioList, APP_ID, SHARE_ID, voiceReverbList} from '../utils/settings'
import {readImage} from '../utils/base64'
import WindowPicker from './components/WindowPicker/index.js'
import DisplayPicker from './components/DisplayPicker/index.js'

export default class App extends Component {
    constructor(props) {
        super(props)
        if (!APP_ID) {
            Swal.fire('哎呀', '当前应用程序无APP_ID', 'error');
        } else {
            let rtcEngine = this.getRtcEngine()
            this.state = {
                local: '',
                localVideoSource: '',
                localSharing: false,
                users: new List(),
                channel: '',
                role: 1,
                voiceReverbPreset: 0,
                voiceChangerPreset: 0,
                videoDevices: rtcEngine.getVideoDevices(),
                audioDevices: rtcEngine.getAudioRecordingDevices(),
                audioPlaybackDevices: rtcEngine.getAudioPlaybackDevices(),
                camera: 0,
                mic: 0,
                speaker: 0,
                encoderConfiguration: 3,
                showWindowPicker: false,
                showDisplayPicker: false,
                recordingTestOn: false,
                playbackTestOn: false,
                lastmileTestOn: false,
                windowList: [],
                displayList: [],
            }
        }
        this.enableAudioMixing = false;
    }

    // 初始化一个 AgoraRtcEngine 实例
    getRtcEngine() {
        if (!this.rtcEngine) {
            this.rtcEngine = new AgoraRtcEngine()
            this.rtcEngine.initialize(APP_ID)
            this.subscribeEvents(this.rtcEngine)
            window.rtcEngine = this.rtcEngine;
        }
        return this.rtcEngine
    }

    // 定义错误码的公共方法
    wrongData(err) {
        if (err === 17) {
            Swal.fire('哎呀', '当前用户已经进入频道', 'error');
        } else if (err === 1003) {
            Swal.fire('哎呀', '当前摄像头打开失败！', 'error')
        } else if (err === 1502) {
            Swal.fire('哎呀', '当前设备被占用', 'error')
        }
    }

    subscribeEvents = (rtcEngine) => {
        // 成功加入频道
        rtcEngine.on('joinedchannel', (channel, uid, elapsed) => {
            console.log('---------------------', uid)
            this.setState({
                local: uid
            });
        });

        // 远端用户加入当前频道回调
        rtcEngine.on('userjoined', (uid, elapsed) => {
            if (uid === SHARE_ID && this.state.localSharing) {
                return
            }
            this.setState({
                users: this.state.users.push(uid)
            })
        })

        // 远端用户离开当前频道回调
        rtcEngine.on('removestream', (uid, reason) => {
            this.setState({
                users: this.state.users.delete(this.state.users.indexOf(uid))
            })
        })

        // 离开频道回调
        rtcEngine.on('leavechannel', () => {
            this.setState({
                local: ''
            })
        })

        // 音频设备状态已改变回调
        rtcEngine.on('audiodevicestatechanged', () => {
            this.setState({
                audioDevices: rtcEngine.getAudioRecordingDevices(),
                audioPlaybackDevices: rtcEngine.getAudioPlaybackDevices()
            })
        })

        // 视频设备变化回调
        rtcEngine.on('videodevicestatechanged', () => {
            this.setState({
                videoDevices: rtcEngine.getVideoDevices()
            })
        })

        rtcEngine.on('streamPublished', (url, error) => {
            console.log(`url: ${url}, err: ${error}`)
        })
        rtcEngine.on('streamUnpublished', (url) => {
            console.log(`url: ${url}`)
        })
        rtcEngine.on('lastmileProbeResult', result => {
            console.log(`lastmileproberesult: ${JSON.stringify(result)}`)
        })
        rtcEngine.on('lastMileQuality', quality => {
            console.log(`lastmilequality: ${JSON.stringify(quality)}`)
        })

        // 提示频道内谁在说话以及说话者音量的回调
        rtcEngine.on('audiovolumeindication', (
            uid,
            volume,
            speakerNumber,
            totalVolume
        ) => {
            // console.log(`uid${uid} volume${volume} speakerNumber${speakerNumber} totalVolume${totalVolume}`)
        })
        rtcEngine.on('error', err => {
            this.wrongData(err);
        })
        rtcEngine.on('executefailed', funcName => {
            console.error(funcName, 'failed to execute')
        })
    }

    // 加入按钮
    handleJoin = () => {
        if (this.state.channel == '') {
            Swal.fire('哎呀', '通道名称不能为空~', 'error');
        } else {
            let rtcEngine = this.getRtcEngine()
            rtcEngine.setChannelProfile(1)
            rtcEngine.setClientRole(this.state.role)
            rtcEngine.setAudioProfile(0, 1)
            rtcEngine.enableVideo();
            let logpath = path.resolve(os.homedir(), "./agoramain.sdk")
            rtcEngine.setLogFile(logpath)
            rtcEngine.enableWebSdkInteroperability(true)
            let encoderProfile = videoProfileList[this.state.encoderConfiguration]
            rtcEngine.setVideoEncoderConfiguration({width: encoderProfile.width, height: encoderProfile.height, frameRate: encoderProfile.fps, bitrate: encoderProfile.bitrate})
            rtcEngine.enableDualStreamMode(true)
            rtcEngine.enableAudioVolumeIndication(1000, 3);

            let reg = /[\u4E00-\u9FA5\uF900-\uFA2D]/;
            let text = reg.test(this.state.channel);
            if (text) {
                Swal.fire('哎呀', '通道名称不能是中文字~', 'error');
            } else {
                // 加入频道
                rtcEngine.joinChannel(null, this.state.channel, '', Number(`${new Date().getTime()}`.slice(7)))
            }
        }
    }

    // 摄像头
    handleCameraChange = e => {
        this.setState({camera: e.currentTarget.value});
        this.getRtcEngine().setVideoDevice(this.state.videoDevices[e.currentTarget.value].deviceid);
    }

    // 话筒
    handleMicChange = e => {
        this.setState({mic: e.currentTarget.value});
        this.getRtcEngine().setAudioRecordingDevice(this.state.audioDevices[e.currentTarget.value].deviceid);
    }

    // 扬声器
    handleSpeakerChange = e => {
        this.setState({speaker: e.currentTarget.value});
        this.getRtcEngine().setAudioPlaybackDevice(this.state.audioPlaybackDevices[e.currentTarget.value].deviceid);
    }

    // 视频编码器
    handleEncoderConfiguration = e => {
        this.setState({
            encoderConfiguration: Number(e.currentTarget.value)
        })
    }

    // 本地语音的变声效果
    handleVoiceChanger = e => {
        this.setState({
            voiceChangerPreset: Number(e.currentTarget.value)
        })
    }

    // 设置预设的本地语音混响效果
    handleVoiceReverbPreset = e => {
        this.setState({
            voiceReverbPreset: Number(e.currentTarget.value)
        })
    }

    /**
     * prepare screen share: initialize and join
     * @param {string} token
     * @param {string} info
     * @param {number} timeout
     */

    // 准备屏幕共享：初始化并加入
    prepareScreenShare(token = null, info = '', timeout = 30000) {
        return new Promise((resolve, reject) => {
            let timer = setTimeout(() => {
                reject(new Error('超时了'))
            }, timeout)
            let rtcEngine = this.getRtcEngine()
            rtcEngine.once('videosourcejoinedsuccess', uid => {
                clearTimeout(timer)
                this.sharingPrepared = true
                resolve(uid)
            });
            try {
                rtcEngine.videoSourceInitialize(APP_ID);   // 初始化屏幕共享对象
                let logpath = path.resolve(os.homedir(), "./agorascreenshare.log")
                rtcEngine.videoSourceSetLogFile(logpath)  // 设置屏幕共享对象的日志。 请在屏幕共享对象初始化后调用。
                rtcEngine.videoSourceSetChannelProfile(1); // 设置屏幕共享对象的频道模式。0:通信   1：直播  2：游戏
                rtcEngine.videoSourceEnableWebSdkInteroperability(true)  // 开启与 Web SDK 的屏幕共享互通。
                // to adjust render dimension to optimize performance
                rtcEngine.setVideoRenderDimension(3, SHARE_ID, 1200, 680);   // 设置视频渲染的分辨率。
                rtcEngine.videoSourceJoin(token, this.state.channel, info, SHARE_ID);   // 屏幕共享对象加入频道。
            } catch (err) {
                clearTimeout(timer)
                reject(err)
            }
        })
    }

    /**
     * start screen share  开始屏幕共享
     * @param {*} windowId windows id to capture
     * @param {*} captureFreq fps of video source screencapture, 1 - 15
     * @param {*} rect null/if specified, {x: 0, y: 0, width: 0, height: 0}
     * @param {*} bitrate bitrate of video source screencapture
     */

    // 开始屏幕共享
    startScreenShare(windowId = 0, captureFreq = 15, rect = {top: 0, left: 0, right: 0, bottom: 0}, bitrate = 0) {
        if (!this.sharingPrepared) {
            Swal.fire('哎呀', '共享尚未准备好~', 'error');
            return false;
        }
        ;
        return new Promise((resolve, reject) => {
            let rtcEngine = this.getRtcEngine()
            // rtcEngine.startScreenCapture2(windowId, captureFreq, rect, bitrate);
            // there's a known limitation that, videosourcesetvideoprofile has to be called at least once
            // note although it's called, it's not taking any effect, to control the screenshare dimension, use captureParam instead
            rtcEngine.videoSourceSetVideoProfile(43, false);  // 43：分辨率 640 × 480，帧率 30 fps，码率 750 Kbps。
            rtcEngine.videoSourceStartScreenCaptureByWindow(windowId, {x: 0, y: 0, width: 0, height: 0}, {width: 0, height: 0, bitrate: 500, frameRate: 15})  // 通过指定窗口 ID 共享窗口。
            rtcEngine.startScreenCapturePreview();  // 开始屏幕共享预览
        });
    }


    startScreenShareByDisplay(displayId) {
        if (!this.sharingPrepared) {
            console.error('Sharing not prepared yet.')
            return false
        }
        ;
        return new Promise((resolve, reject) => {
            let rtcEngine = this.getRtcEngine()
            // rtcEngine.startScreenCapture2(windowId, captureFreq, rect, bitrate);
            // there's a known limitation that, videosourcesetvideoprofile has to be called at least once
            // note although it's called, it's not taking any effect, to control the screenshare dimension, use captureParam instead
            console.log(`start sharing display ${displayId}`)
            rtcEngine.videoSourceSetVideoProfile(43, false);
            // rtcEngine.videosourceStartScreenCaptureByWindow(windowId, {x: 0, y: 0, width: 0, height: 0}, {width: 0, height: 0, bitrate: 500, frameRate: 15})
            rtcEngine.videoSourceStartScreenCaptureByScreen(displayId, {x: 0, y: 0, width: 0, height: 0}, {width: 0, height: 0, bitrate: 500, frameRate: 5})
            rtcEngine.startScreenCapturePreview();
        });
    }

    // 屏幕共享
    handleScreenSharing = (e) => {
        // getWindowInfo and open Modal
        let rtcEngine = this.getRtcEngine()
        let list = rtcEngine.getScreenWindowsInfo();
        Promise.all(list.map(item => readImage(item.image))).then(imageList => {
            let windowList = list.map((item, index) => {
                return {
                    ownerName: item.ownerName,
                    name: item.name,
                    windowId: item.windowId,
                    image: imageList[index],
                }
            })
            this.setState({
                showWindowPicker: true,
                windowList: windowList
            });
        })
    }

    // 显示共享
    handleDisplaySharing = (e) => {
        // getWindowInfo and open Modal
        let rtcEngine = this.getRtcEngine()
        let list = rtcEngine.getScreenDisplaysInfo();
        Promise.all(list.map(item => readImage(item.image))).then(imageList => {
            let displayList = list.map((item, index) => {
                let name = `Display ${index + 1}`
                return {
                    ownerName: "",
                    name: name,
                    displayId: item.displayId,
                    image: imageList[index],
                }
            })
            this.setState({
                showDisplayPicker: true,
                displayList: displayList
            });
        })
    }

    // 释放
    handleRelease = () => {
        this.setState({
            localVideoSource: "",
            localSharing: false
        })
        if (this.rtcEngine) {
            this.rtcEngine.release();
            this.rtcEngine = null;
            Swal.fire({
                title: '操作成功！',
                text: '已退出屏幕共享',
                type: 'success',
                timer: 2000
            });
        }
    }

    handleWindowPicker = windowId => {
        console.log('============', windowId)
        this.setState({
            showWindowPicker: false,
            localSharing: true
        })
        this.prepareScreenShare()
            .then(uid => {
                this.startScreenShare(windowId)
                this.setState({
                    localVideoSource: uid
                })
            })
            .catch(err => {
                console.log(err)
            })
    }

    handleDisplayPicker = displayId => {
        this.setState({
            showDisplayPicker: false,
            localSharing: true
        })
        this.prepareScreenShare()
            .then(uid => {
                this.startScreenShareByDisplay(displayId)
                this.setState({
                    localVideoSource: uid
                })
            })
            .catch(err => {
                console.log(err)
            })
    }

    // 音频播放测试
    togglePlaybackTest = e => {
        let rtcEngine = this.getRtcEngine()
        if (!this.state.playbackTestOn) {
            let filepath = './test.mp3';
            let result = rtcEngine.startAudioPlaybackDeviceTest('./test.mp3');
            console.log(result);
        } else {
            rtcEngine.stopAudioPlaybackDeviceTest();
        }
        this.setState({
            playbackTestOn: !this.state.playbackTestOn
        })
    }

    // 录音测试
    toggleRecordingTest = e => {
        let rtcEngine = this.getRtcEngine()
        if (!this.state.recordingTestOn) {
            let result = rtcEngine.startAudioRecordingDeviceTest(1000);
            console.log(result);
        } else {
            rtcEngine.stopAudioRecordingDeviceTest();
        }
        this.setState({
            recordingTestOn: !this.state.recordingTestOn
        })
    }

    // 网络测试
    toggleLastmileTest = e => {
        let rtcEngine = this.getRtcEngine()
        if (!this.state.lastmileTestOn) {
            let result = rtcEngine.startLastmileProbeTest({
                probeUplink: true,
                probeDownlink: true,
                expectedDownlinkBitrate: 500,
                expectedUplinkBitrate: 500,
            });
        } else {
            rtcEngine.stopLastmileProbeTest();
        }
        this.setState({
            lastmileTestOn: !this.state.lastmileTestOn
        })
    }

    render() {
        let windowPicker, displayPicker
        if (this.state.showWindowPicker) {
            windowPicker = <WindowPicker
                onSubmit={this.handleWindowPicker}
                onCancel={e => this.setState({showWindowPicker: false})}
                windowList={this.state.windowList}
            />
        }

        if (this.state.showDisplayPicker) {
            displayPicker = <DisplayPicker
                onSubmit={this.handleDisplayPicker}
                onCancel={e => this.setState({showWindowPicker: false})}
                displayList={this.state.displayList}
            />
        }

        return (
            <div className="columns" style={{padding: "20px", height: '100%', margin: '0'}}>
                {this.state.showWindowPicker ? windowPicker : ''} {/*显示窗口选取器*/}
                {this.state.showDisplayPicker ? displayPicker : ''} {/*显示选择器*/}
                <div className="column is-one-quarter" style={{overflowY: 'auto'}}>
                    <div className="field">
                        <label className="label">通道名称</label>
                        <div className="control">
                            <input onChange={e => this.setState({channel: e.currentTarget.value})} value={this.state.channel} className="input" type="text" placeholder="Input a channel name"/>
                        </div>
                    </div>
                    <div className="field">
                        <label className="label">角色</label>
                        <div className="control">
                            <div className="select" style={{width: '100%'}}>
                                <select onChange={e => this.setState({role: Number(e.currentTarget.value)})} value={this.state.role} style={{width: '100%'}}>
                                    <option value={1}>主播</option>
                                    <option value={2}>观众</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="field">
                        <label className="label">本地语音的变声效果</label>
                        <div className="control">
                            <div className="select" style={{width: '100%'}}>
                                <select onChange={this.handleVoiceChanger} value={this.state.voiceChangerPreset} style={{width: '100%'}}>
                                    {voiceChangerList.map(item => (<option key={item.value} value={item.value}>{item.label}</option>))}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="field">
                        <label className="label">设置预设的本地语音混响效果</label>
                        <div className="control">
                            <div className="select" style={{width: '100%'}}>
                                <select onChange={this.handleVoiceReverbPreset} value={this.state.voiceReverbPreset} style={{width: '100%'}}>
                                    {voiceReverbList.map(item => (<option key={item.value} value={item.value}>{item.label}</option>))}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="field">
                        <label className="label">视频编码器</label>
                        <div className="control">
                            <div className="select" style={{width: '100%'}}>
                                <select onChange={this.handleEncoderConfiguration} value={this.state.encoderConfiguration} style={{width: '100%'}}>
                                    {videoProfileList.map(item => (<option key={item.value} value={item.value}>{item.label}</option>))}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="field">
                        <label className="label">音频编码配置</label>
                        <div className="control">
                            <div className="select" style={{width: '50%'}}>
                                <select onChange={this.handleAudioProfile} value={this.state.audioProfile} style={{width: '100%'}}>
                                    {audioProfileList.map(item => (<option key={item.value} value={item.value}>{item.label}</option>))}
                                </select>
                            </div>
                            <div className="select" style={{width: '50%'}}>
                                <select onChange={this.handleAudioScenario} value={this.state.audioScenario} style={{width: '100%'}}>
                                    {audioScenarioList.map(item => (<option key={item.value} value={item.value}>{item.label}</option>))}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="field">
                        <label className="label">照相机</label>
                        <div className="control">
                            <div className="select" style={{width: '100%'}}>
                                <select onChange={this.handleCameraChange} value={this.state.camera} style={{width: '100%'}}>
                                    {this.state.videoDevices.map((item, index) => (<option key={index} value={index}>{item.devicename}</option>))}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="field">
                        <label className="label">话筒</label>
                        <div className="control">
                            <div className="select" style={{width: '100%'}}>
                                <select onChange={this.handleMicChange} value={this.state.mic} style={{width: '100%'}}>
                                    {this.state.audioDevices.map((item, index) => (<option key={index} value={index}>{item.devicename}</option>))}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="field">
                        <label className="label">扬声器</label>
                        <div className="control">
                            <div className="select" style={{width: '100%'}}>
                                <select onChange={this.handleSpeakerChange} value={this.state.speaker} style={{width: '100%'}}>
                                    {this.state.audioPlaybackDevices.map((item, index) => (<option key={index} value={index}>{item.devicename}</option>))}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="field is-grouped is-grouped-right">
                        <div className="control">
                            <button onClick={this.handleJoin} className="button is-link">加入</button>
                        </div>
                    </div>
                    <hr/>
                    <div className="field">
                        <label className="label">网络测试</label>
                        <div className="control">
                            <button onClick={this.toggleLastmileTest} className="button is-link">{this.state.lastmileTestOn ? 'stop' : 'start'}</button>
                        </div>
                    </div>
                    <label className="label">屏幕共享</label>
                    <div className="field is-grouped">
                        <div className="control">
                            <button onClick={this.handleScreenSharing} className="button is-link">屏幕共享</button>
                        </div>
                        <div className="control">
                            <button onClick={this.handleDisplaySharing} className="button is-link">显示共享</button>
                        </div>
                    </div>
                    <div className="field">
                        <label className="label">退出屏幕共享</label>
                        <div className="control">
                            <button onClick={this.handleRelease} className="button is-link">结束共享</button>
                        </div>
                    </div>
                    <div className="field">
                        <label className="label">音频播放测试</label>
                        <div className="control">
                            <button onClick={this.togglePlaybackTest} className="button is-link">{this.state.playbackTestOn ? 'stop' : 'start'}</button>
                        </div>
                    </div>
                    <div className="field">
                        <label className="label">录音测试</label>
                        <div className="control">
                            <button onClick={this.toggleRecordingTest} className="button is-link">{this.state.recordingTestOn ? 'stop' : 'start'}</button>
                        </div>
                    </div>
                </div>
                <div className="column is-three-quarters window-container">
                    {this.state.users.map((item, key) => (
                        <Window key={key} uid={item} rtcEngine={this.rtcEngine} role={item === SHARE_ID ? 'remoteVideoSource' : 'remote'}></Window>
                    ))}
                    {/*进入频道后*/}
                    {this.state.local ? (<Window uid={this.state.local} rtcEngine={this.rtcEngine} role="local"></Window>) : ''}
                    {/*离开频道后*/}
                    {this.state.localVideoSource ? (<Window uid={this.state.localVideoSource} rtcEngine={this.rtcEngine} role="localVideoSource"></Window>) : ''}
                </div>
            </div>
        )
    }
}

class Window extends Component {
    constructor(props) {
        super(props)
        this.state = {
            loading: false
        }
    }

    componentDidMount() {
        let dom = document.querySelector(`#video-${this.props.uid}`)

        // 设置本地视图和渲染器
        if (this.props.role === 'local') {
            dom && this.props.rtcEngine.setupLocalVideo(dom)
        }

        // 设置屏幕共享的渲染器
        else if (this.props.role === 'localVideoSource') {
            dom && this.props.rtcEngine.setupLocalVideoSource(dom)
            this.props.rtcEngine.setupViewContentMode('videosource', 1);  // 设置视窗内容显示模式
            this.props.rtcEngine.setupViewContentMode(String(SHARE_ID), 1);
        }

        // 订阅远端用户并初始化渲染器
        else if (this.props.role === 'remote') {
            dom && this.props.rtcEngine.subscribe(this.props.uid, dom)
            this.props.rtcEngine.setupViewContentMode(this.props.uid, 1);
        } else if (this.props.role === 'remoteVideoSource') {
            dom && this.props.rtcEngine.subscribe(this.props.uid, dom)
            this.props.rtcEngine.setupViewContentMode('videosource', 1);
            this.props.rtcEngine.setupViewContentMode(String(SHARE_ID), 1);
        }
    }

    render() {
        return (
            <div className="window-item">
                <div className="video-item" id={'video-' + this.props.uid}></div>
            </div>
        )
    }
}
