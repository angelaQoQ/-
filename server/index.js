/*
 * @Description: 使用者在浏览器选择本地UTF8文本资源,express转换成语音文件,响应给浏览器
 * @FilePath: \JD语音测试代码\server\index.js
 * @Version: 1.0
 * @Autor: CuiGang
 * @Date: 2020-01-14 16:37:32
 * @LastEditors  : CuiGang
 * @LastEditTime : 2020-01-15 19:02:25
 */

const express = require("express")
const util = require("./util")
const fs = require("fs")
const path = require("path")
const app = express()
const bodyParser = require('body-parser');
const multer = require("multer")
const upload = multer()
// upload.single 单文件信息, upload.array文件数组信息, upload.fields是{文件名:文件信息}组成的数组
// 单独的文本内容,不需要上面3个函数, 使用upload.none()解脱了, 但在req.body中包含请求体

app.use(bodyParser.json()) // 处理post提交json
app.use(bodyParser.urlencoded({ extended: true })) // 处理表单序列化请求体

// 配置静态资源服务
app.use(express.static('public'))

// 初始化请求

app.get('/', (req, res) => {
    fs.readFile(path.join(__dirname, './index.html'), 'utf-8', function (err, data) {
        if (err) return console.log('读取文件失败：' + err.message)
        res.writeHead(200, { "Content-Type": "text/html" })
        res.end(data)
    })
})

app.get("/booklist", (req, res) => {
    let listArr = util.findSync('./source/')
    res.send(JSON.stringify({ booklist: listArr }))
})

app.post("/jdai", upload.none(), (req, res, next) => {
    console.log(1);

    // 获取文件路径
    let readFileName = util.getReadFileName('./source/', req.body.bookname)

    // 找文件,读取,请求JD
    let fileUTF8Content = util.readUTF8Content(readFileName)

    // 拆分文件内容
    let contentArr = util.getContentParts(fileUTF8Content)

    // 准备jd接口配置对象
    let options = {
        appkey: '', // 购买使用JD秘钥
        secretKey: '', // 购买使用JD秘钥
        headPro: {
            "platform": 'Windows&Win64&10.0', // {平台}&{机型}&{系统版本号}
            "version": "1.0.0",
            "parameters": {
                "tt": 0, // UTF-8
                "aue": 3, // wav 1：pcm 2：opus 3：mp3
                "tim": 1, // "桃桃女声"
                "vol": "1.0", //音量
                "sp": "1.0", //语速
                "sr": 24000 //采样率
            }
        }
    };

    // 并发请求的响应整合
    let cb = function (resArr) {
        let base64Str = []
        console.log(resArr);
        resArr.forEach((item, index) => {

            if (item.data.code == 10000 && item.data.result.audio) {
                base64Str.push(item.data.result.audio)
                console.log(`base64[${index}]长度:` + base64Str[index]);
            }
        })
        console.log("总长度:" + base64Str.join("").length);


        res.send(JSON.stringify({
            code: 100,
            audio: base64Str.join("")
        }))
    }

    util.JDAxios(contentArr, options, cb)

})





app.listen(3000, () => {
    console.log("server is running @ 3000 Port!");
})



/**
 * let callback = function (resAduio, index) {

        if (Object.prototype.toString.call(resAduio) != '[object Object]') resAduio = JSON.parse(resAduio);

        if (resAduio.code == 10000) {

            audioSourceArr[index] = resAduio.result.audio

            let flag = audioSourceArr.some((s, si) => {
                return (s == 'undefined')
            })

            if (!flag) {
                let result = JSON.stringify({ audio: audioSourceArr.join(""), code: 200 })

                // 给出响应

                res.send(result)

                console.log("----------------------------------------------------------------------DONE");
            }

        }


    }

    contentArr.forEach(async (item, index) => {
        util.JDrequestFN(item, index, options, callback)
    })
 *
 *
 *
*/