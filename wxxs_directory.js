// 用来更新 无限小说网的书籍目录
const https = require('https');
const cheerio = require('cheerio');
const request = require("request");
const fs = require('fs');

var option={
    time: 12000,
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
var len = -1
var errorArr = []
var url = 'https://www.555x.org/shuku/0_0_0_0_default_0_1.html'


request(url,option,function(error,res,body){
    var $=cheerio.load(body);
    len = parseInt($('.yemian ul li:last-child .pageinfo strong:first-child').text())
    console.log(len)
    var promiseArr = []
    for(let index=1;index<=len;index++) {
        promiseArr.push(getdata(index))
    }
    Promise.allSettled(promiseArr).then((values)=> {
        values.map(item => {
            if(item.status==='fulfilled') {
                updateToFile(item.value)
            } else {
                errorArr.push(item.reason)
            }
        })
        console.log('重新请求页数',errorArr)
        if(errorArr.length>0) {
            var badPromsies = []
            errorArr.map(item => {
                badPromsies.push(getdata(item))
            })
            Promise.allSettled(badPromsies).then((values)=> {
                values.map(item => {
                    if(item.status==='fulfilled') {
                        updateToFile(item.value)
                    } else {
                        console.log('第二次尝试失败',item.reason)
                    }
                })
                console.log('请求完毕！')
            })
        } else {
            console.log('全部成功！')
        }
    })
})


// 通过分页ID请求获取页面数据

function getdata(id) {
    let url0 = 'https://www.555x.org/shuku/0_0_0_0_default_0_'+id+'.html'
    return new Promise((resolve,reject)=> {
        setTimeout(()=> {
            request(url0, function(error,res,body) {
                if(!body) {
                    console.log('body为空',id)
                    reject(id)
                    return
                }
                var book_arr = []
                var $=cheerio.load(body);
                $('.xiashu ul').each(function() {
                    var $a = $(this).find('li.qq_g a')
                    book_arr.push({
                        id: $a.attr('href').split('/txt')[1].split('.html')[0],
                        name: $a.text().split('TXT')[0]
                    })
                })
                if(book_arr.length>0) {
                    console.log('第'+id+'页已获取')
                    resolve(book_arr)
                } else {
                    console.log('第'+id+'页获取失败')
                    reject(id)
                }
            }).on('error', function() {
                console.log('获取页面错误，id为',id)
                reject(id)
            })
        },3)
    })
}

function updateToFile(arr) {
    var str = ""
    arr.length>0&&arr.map(book => {
        str += ('书名：'+book.name+ ' id:'+ book.id + '\n')
    })
    fs.appendFileSync('./public/无限小说网目录.txt', str , function (err, data) {
        if (err) throw err ;console.log('生成文件失败')
    })
}
