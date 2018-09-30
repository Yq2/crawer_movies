let async=require('async');
let request=require('request');
let cheerio=require('cheerio');
let charset = require('superagent-charset'); //解决乱码问题:
let superagent = require('superagent'); //发起请求
charset(superagent);
const Dbapi = require('../api/dbapi');
const Function=require('../api/function.js');
let dy2018_url='http://www.dy2018.com/html/gndy/dyzz/index.html';
let dy2018_host='http://www.dy2018.com';
let headers = {
    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.80 Safari/537.36'
};
let pageTotal;
let currentPage=1;
let results=[];
function download_movies() {
    this.run=function (callback) {
        get_movies_list(dy2018_url, function (err) {
            callback(err);
        });

    };

    function get_movies_list(link,callback) {
        console.log('list_link=',link);
        async.waterfall([
            function (cb) {
                let links=[];
                superagent
                    .get(link)
                    .charset('gb2312')
                    .end(function(err, res){
                        if (err) {
                            console.error(err);
                            return cb(null,links);
                        }
                        let $=cheerio.load(res.text);
                        $("div.co_content8 ul table").each(function (index,ele) {
                            let download_link=$(this).find("tr").eq(1).find("td").eq(1).find("a").attr("href");
                            download_link=dy2018_host+download_link;
                            links.push(download_link);
                        });
                        let temp_link=$("div.co_content8 div.x").find("a").last().attr("href");
                        if (!pageTotal) {
                            pageTotal=temp_link.split("_")[1].split(".")[0];
                        }
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
                //  /html/gndy/dyzz/index_295.html
                //  http://www.dy2018.com/html/gndy/dyzz/index_2.html
                let link=temp_link.split(".")[0].split("_");
                link[1]=++currentPage;
                let next_link=dy2018_host+link.join("_")+".html";
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
        console.log(link);
        let item={};
        superagent
            .get(link)
            .charset('gb2312')
            .end(function(err, res){
                if (err) {
                    console.error(err);
                    return fn(null,item);
                }
                try {
                    let $=cheerio.load(res.text);
                    item.publish_time=$("div.co_content8 ul").find("span.updatetime").text().trim().substr(5,10);
                    item.category=$("div.co_content8 ul").find("span").eq(1).find("a").text().trim();
                    let rank=$("div.co_content8 ul").find("span").first().text().trim().split('：')[1];
                    item.rank=parseFloat(rank);
                    item.img=$("div#Zoom p").find("img").first().attr("src");
                    item.description=$("div#Zoom p").text().replace("&nbsp;","").trim().split("◎");
                    item.stills='';
                    item.download_link=[];
                    $("td[style='WORD-WRAP: break-word']").find("a").each(function (i,e) {
                        if (i===0) {
                            let download_item={};
                            download_item.type='FTP';
                            download_item.link=$(this).text();
                            item.download_link.push(download_item);
                        }
                    });
                    item.type="近期新品";
                    item.website=dy2018_host;
                    item.update=new Date().toLocaleString();
                    _sendItem(item,function (err) {
                        fn(err,item);
                    });
                } catch (e) {
                    console.error(e);
                    return fn(null,item);
                }
            });
    }
    function _sendItem(item,callback) {
        Dbapi.sendMsg({
            json: {
                "website":"dy2018",
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


}
module.exports=new download_movies();
