let currentPage=1;
let temp_link='/html/gndy/dyzz/index_295.html';
let link=temp_link.split(".")[0].split("_");
link[1]=++currentPage;
let dytt8_host='http://www.dy2018.com';
let next_link=dytt8_host+link.join("_")+".html";
console.log(next_link);


