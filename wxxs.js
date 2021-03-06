// 来源 无限小说网
const https = require('https');
const cheerio = require('cheerio');
const request = require("request");
const fs = require('fs');
var arguments = process.argv
var _arg = arguments.splice(2)

var option={
    rejectUnauthorized: false,
    path:'/',
    headers:{
        'Accept':'*/*',
        'Accept-Encoding':'utf-8',
        'Accept-Language':'zh-CN,zh;q=0.8',
        'Connection':'keep-alive',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36'
    }
}
var bookId = _arg[0] || '21241'
var len = -1

var errorArr = []
var name = 'result'
var url = 'https://www.555x.org/read/'+bookId+'.html'

request(url,option,function(error,res,body){
    var $=cheerio.load(body);
    len = $('.read_list').find('a').length || 1
    name = $('.view_t').text() || 'result'
    action(1)
})
// 递归回调，异步变同步
function action(id) {
    if(id<=len) {
        getGroupData(id,function() {
            action(id+100)
        });
        
    } else {
        console.log('全部完成！')
        return false
    }
}
// 一次100页保证速度
function getGroupData(i, callback) {
    var promiseArr = []
    var result = []
    var lastBad = []
    var maxPage = (i+100)<len?(i+100):len
    for(let index=i;index<=maxPage;index++) {
        promiseArr.push(getdata(index))
    }
    Promise.allSettled(promiseArr).then((values)=> {
        values.map(item => {
            if(item.status==='fulfilled') {
                result.push({
                    id:item.value.id,
                    text:item.value.text
                })
            } else {
                errorArr.push(item.reason)
            }
        })
        console.log('重新请求章节：',errorArr)
        if(errorArr.length>0) {
            var badPromsies = []
            errorArr.map(item => {
                badPromsies.push(getdata(item))
            })
            Promise.allSettled(badPromsies).then((values)=> {
                values.map(item => {
                    if(item.status==='fulfilled') {
                        result.push({
                            id:item.value.id,
                            text:item.value.text
                        })
                    } else {
                        console.log('第二次尝试失败',item.value.id)
                        lastBad.push(item.value.id)
                    }
                })
                result.sort((a,b)=> {
                    return parseInt(a.id) - parseInt(b.id)
                })
                if(lastBad.length>0) {
                    console.log('缺失页数',lastBad,'其余成功')
                } else {
                    console.log(`${i}页至${maxPage}页全部成功`)
                }
                appendToFile(result)
                callback()
            })
        } else {
            console.log(`${i}页至${maxPage}页全部成功`)
            appendToFile(result)
            callback()
        }
    })
}

// 每个请求返回一个promise
function getdata(id) {
    let url0 = 'https://www.555x.org/read/'+bookId+'_'+id+'.html'
    return new Promise((resolve,reject)=> {
        request(url0, function(error,res,body) {
            if(!body) {
                console.log('body为空',id)
                reject(id)
                return
            }
            var $=cheerio.load(body);
            $('.view_page').remove()
            var text = $('#view_content_txt').text()
            if(text) {
                console.log(id+'/'+len)
                resolve({
                    id,
                    text
                })
            } else {
                console.log('页面信息空，id为',id)
                reject(id)
            }
        }).on('error', function() {
            console.log('获取页面错误，id为',id)
            reject(id)
        })
    })
}

function appendToFile(result) {
    var txtName = './public/'+name+'.txt';
    result.map(item => {
        fs.appendFileSync(txtName,item.text , function (err, data) {
            if (err) throw err ;console.log('生成文件失败')
        })
    })
}
