let async=require('async');
let request=require('request');
let cheerio=require('cheerio');
let charset = require('superagent-charset'); //解决乱码问题:
let superagent = require('superagent'); //发起请求
charset(superagent);
const Dbapi = require('../api/dbapi');
const Function=require('../api/function.js');
let dytt8_url='http://www.dytt8.net/html/gndy/china/index.html';
let dytt8_host='http://www.dytt8.net';
let headers = {
    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    // 'accept-language':'zh-CN,zh;q=0.9',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.80 Safari/537.36'
};
let pageTotal;
let currentPage=1;
let results=[];
function download_movies() {

    function get_movies_list(link,callback) {
        console.log('list_link=',link);
        async.waterfall([
            function (cb) {
                let links=[];
                let param={
                    url:link,
                    method:'GET',
                    headers:headers
                };
                request(param,function (err,res,body) {
                    let $=cheerio.load(body);
                    $("div.co_content8 ul table").each(function (index,ele) {
                        let download_link;
                        try {
                            download_link=$(this).find("tr").eq(1).find("td").eq(1).find("a").eq(1).attr("href").trim();
                            download_link=dytt8_host+download_link;
                        } catch (e) {
                            download_link='';
                        }
                        if (download_link) {
                            links.push(download_link);
                        }
                    });
                    let temp_link=$("div.co_content8 div.x").find("a").last().attr("href");
                    if (!pageTotal) {
                        pageTotal=temp_link.split("_")[2].split(".")[0];
                    }
                    console.log('temp_link=',temp_link);
                    cb(err,links,temp_link);
                });
            },
            function (links,temp_link,cb) {
                async.eachSeries(links,function (link,cb) {
                    download(link,function (err,item) {
                        console.log(item);
                        cb(err);
                    })
                },function (err) {
                    cb(err,temp_link);
                });
            },
            function (temp_link,cb) {
                let link=temp_link.split(".")[0].split("_");
                link[2]=++currentPage;
                let next_link=dytt8_host+'/html/gndy/china/'+link.join("_")+".html";
                console.log('currentPage=',currentPage,'pageTotal=',pageTotal);
                if (parseInt(currentPage)<parseInt(pageTotal)) {
                    get_movies_list(next_link,function (err) {
                        cb(err);
                    });
                } else {
                    cb(null);
                }
            }
        ],function (err) {
            if (err) console.log(err);
            callback(err);
        });
    }
    function download(link , fn) {
        let item={};
        superagent
            .get(link)
            .charset('gb2312')
            .end(function(err, res){
                if (err) {
                    console.error(err);
                    return fn(null,item);
                }
                let $=cheerio.load(res.text);
                item.publish_time=$("div.co_content8 ul").text().trim().substr(5,10);
                item.img=$("div#Zoom span").find("img").first().attr("src");
                item.description=$("div#Zoom span").text().replace("&nbsp;","").trim().split("◎");
                item.stills=$("div#Zoom span").find("img").last().attr("src");
                item.download_link=[];
                $("td[style='WORD-WRAP: break-word']").find("a").each(function () {
                    let download_item={};
                    download_item.type='FTP';
                    download_item.link=$(this).attr("href");
                    item.download_link.push(download_item);
                });
                item.type="近期精品";
                item.category="";
                item.website=dytt8_host;
                item.update=new Date().toLocaleString();
                _sendItem(item,function (err) {
                    fn(err,item);
                });

            });
    }

    function sendMovies(callback) {
        let flag=true;
        let sendConf=100;
        async.whilst(
            function () {
                return flag;
            },
            function (fn_cb) {
                if (results.length > sendConf){
                    let buff=results.splice(0,sendConf);
                    _sendItems(buff,function (err) {
                        fn_cb(err);
                    });
                } else {
                    flag=false;
                    return fn_cb(null)
                }
            },
            function (err) {
                if (err) console.log(err);
                _sendItems(results,function (error) {
                    results.length=0;
                    callback(error);
                });
            });
    }

    function _sendItem(item,callback) {
        Dbapi.sendMsg({
            json: {
                "website":"dytt8",
                "storage_type":"single",
                "item": item
            }
        }, function (err, result) {
            console.log('Dbapi.sendMsg err', err, result);
            callback(err);
        });
    }
    function _sendItems(items,callback) {
        Dbapi.sendMsg({
            json: {
                "website":"dytt8",
                "storage_type":"group",
                "items": items
            }
        }, function (err, result) {
            console.log('Dbapi.sendMsg err', err, result);
            callback(err);
        });
    }

    this.run=function (callback) {
        get_movies_list(dytt8_url, function (err) {
            callback(err);
        });

    }
}
module.exports=new download_movies();