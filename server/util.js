/*
 * @Description: 工具库
 * @FilePath: \JD语音测试代码\server\util.js
 * @Version: 1.0
 * @Autor: CuiGang
 * @Date: 2020-01-14 17:21:35
 * @LastEditors  : CuiGang
 * @LastEditTime : 2020-01-15 16:13:31
 */
const express = require("express")
const router = express.Router()
const fs = require('fs')
const Path = require('path')
const crypto = require('crypto')
const request = require('request')
const rqPromise = require('request-promise')
const axios = require('axios')



module.exports = {

    /**
     * @description: 递归读取资源文件名,组成列表返回
     * @param {string} 
     * @return: []
     * @author: CuiGang
     */
    findSync(startPath) {
        let result = []
        function finder(path) {
            let files = fs.readdirSync(path)
            files.forEach((val, index) => {
                let fPath = Path.join(path, val)
                let stats = fs.statSync(fPath)
                if (stats.isDirectory()) finder(fPath)
                if (stats.isFile()) result.push(fPath)
            })
        }

        finder(startPath)
        return result
    },


    /**
     * @description: 找出目标文件路径
     * @param {dir:文件夹路径string, reqFileName:请求体携带的文件名string } 
     * @return: 找到的文件完整路径
     * @author: CuiGang
     */
    getReadFileName(dir, reqFileName) {
        let fullNameFileList = this.findSync(dir)
        let listArr = fullNameFileList.map((item) => {
            return item.split("\\")[1]
        })
        let cominFileName = reqFileName.split('\\')[1];
        let index = listArr.indexOf(cominFileName)
        if (index != -1) {
            return fullNameFileList[index]
        } else {
            return "NONE"
        }
    },


    /**
     * @description: 读取文件
     * @param {type} 
     * @return: 
     * @author: CuiGang
     */
    readUTF8Content(filePath) {
        return fs.readFileSync(filePath, 'utf8', (err, data) => {
            if (err) throw err;
        })
    },



    /**
     * @description: 使用axios进行并发请求JD接口
     * @param {字符串组成的数组, JD配置项,  合并base64内容的回调} 
     * @return: 
     * @author: CuiGang
     */
    JDAxios(contentArr, opt, cb) {
        let _this = this

        let timeStamp = this.timeStamp();

        let options = {
            method: "post",
            url:
                `https://aiapi.jd.com/jdai/tts?appkey=${opt.appkey}&timestamp=${timeStamp}&sign=${this.md5(opt.secretKey + timeStamp)}`,
            headers: {
                "Service-Type": "synthesis", //固定值, 服务类型
                "Request-Id": this.generateUUID(), // 请求语音串标识码
                "Sequence-Id": -1, // 1标识非流式,一次性合成返回
                "Protocol": 1, // 通信协议版本号，这里设置固定值1
                "Net-State": 1, //客户端网络状态：1:WIFI，2:移动，3:联通，4:电信，5:其他  js获取不到运营商状态, 但是可以拿到网络状态, TODO:用户体验上做提醒"非wifi环境"
                "Applicator": 1, // 外部业务
                "Property": JSON.stringify(opt.headPro)
            }
        }

        let axiosArr = contentArr.map((item, index) => {
            options.data = { "": item }
            return axios(options)
        })

        axios.all(axiosArr).then((resArr) => {
            cb(resArr)
        })
    },


    /**
     * @description: md5加密
     * @param {type} 
     * @return: 
     * @author: CuiGang
     */
    md5(str) {
        let md5Sum = crypto.createHash('md5')
        md5Sum.update(str)
        return md5Sum.digest('hex')
    },


    /**
     * @description: 把字符串掐断: 第一段100个字符,后续按照200, 300...递增
     * @param {content:string} 
     * @return: 返回拆分的数组
     */
    getContentParts(content) {
        var contentArr = content.split('\r\n').join('').split('')

        var arr = []
        var flag = true
        var len = 100   // 掐段递增单位
        var maxLen = 100    // 最大的字符个数
        while (flag) {

            if (contentArr.length >= maxLen) {
                var temp = contentArr.splice(0, len).join('')
                arr.push(temp)
                len = len * 2 > maxLen ? maxLen : len * 2
            } else {
                arr.push(contentArr.join(''))
                flag = false
            }
        }

        return arr
    },

    /**
     * @description:  全局唯一值
     * @param {null} 
     * @return: string
     */
    generateUUID() {
        var d = new Date().getTime();
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
        return uuid;
    },

    /**
     * @description: 时间戳
     * @param {type} 
     * @return: 
     * @author: CuiGang
     */
    timeStamp() {
        return (new Date()).getTime()
    },








    /**
     * @description: 请求JD服务----------处理 合并异步响应的base64失败, 放弃使用
     * @param {str: utf8的文本字符串 , 字符串的顺序索引 , JD语音接口配置, base64内容的整理数组} 
     * @return: 请求promise实例,携带响应
     * @author: CuiGang
     */
    JDrequestFN(str, strindex, opt, callback) {

        let timeStamp = this.timeStamp();

        let options = {
            url:
                `https://aiapi.jd.com/jdai/tts?appkey=${opt.appkey}&timestamp=${timeStamp}&sign=${this.md5(opt.secretKey + timeStamp)}`,
            form: { "": str },
            headers: {
                "Service-Type": "synthesis", //固定值, 服务类型
                "Request-Id": this.generateUUID(), // 请求语音串标识码
                "Sequence-Id": -1, // 1标识非流式,一次性合成返回
                "Protocol": 1, // 通信协议版本号，这里设置固定值1
                "Net-State": 1, //客户端网络状态：1:WIFI，2:移动，3:联通，4:电信，5:其他  js获取不到运营商状态, 但是可以拿到网络状态, TODO:用户体验上做提醒"非wifi环境"
                "Applicator": 1, // 外部业务
                "Property": JSON.stringify(opt.headPro)
            }
        }

        rqPromise(options)
            .then((res) => {
                return callback(res, strindex)
            })
            .catch((err) => {
                console.log(err);
            })

    },

}
