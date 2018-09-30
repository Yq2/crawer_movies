let download_movies_dytt8=require('./task/download_movies_dytt8');
let download_movies_dy2018=require('./task/download_movies_dy2018');
process.on('uncaughtException', function (err) {
    console.error('!!!uncaughtException', new Date().toString(), err.stack);
});

main();

function main() {
    console.log('dytt8 movies scan start');
    download_movies_dytt8.run(function (err) {
        setTimeout(function () {
            main();
        },24*60*60*1000);
    });

    console.log('dy2018 movies scan start');
    download_movies_dy2018.run(function (err) {
        setTimeout(function () {
            main();
        },24*60*60*1000);
    });
}