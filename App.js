const puppeteer = require('puppeteer');
const xlsx = require('xlsx');
const yargs = require('yargs');
const moment = require('moment');
const pageScrapeGeekyGadgets = 'https://www.geeky-gadgets.com/page/';
const monthsGlobal = [ "January", "February", "March", "April", "May", "June",
"July", "August", "September", "October", "November", "December" ];


const options = yargs
 .usage("Usage: -d <date><DD-MM-AAAA> or --drs <date><DD-MM-AAAA> --drf <date><DD-MM-AAAA>")
 .option("d", { alias: "date", describe: "Date with DD-MM-AAAA format", type: "string" })
 .option("drs", { alias: "startDate", describe: "Start Range Date with DD-MM-AAAA format", type: "string"})
 .option("drf", { alias: "finalDate", describe: "Final Range Date with DD-MM-AAAA format", type: "string"})
 .argv;

/**
 * TODO:
 * ---Avanzado---
 * Conexión Vía API con Google Drive
 * Ejecución Diaria en Servidor
 */

 function getDate(userDate)
 {
     const date = moment(userDate, 'DD-MM-YYYY').startOf('day');
     return date;
 }

 async function main() {
         /** UserData from Arguments */
    const userDate = options.date;
    const userStartDate = options.startDate;
    const userFinalDate = options.finalDate;

    if (userDate !== undefined) {
        startRangeDate = getDate(userDate);
        finalRangeDate = startRangeDate;
    } else if (userStartDate !== undefined) {
        startRangeDate = getDate(userStartDate);
        finalRangeDate = getDate(userFinalDate);
    } else {
        startRangeDate = moment().startOf('day');
        finalRangeDate = startRangeDate;
    }

    console.log('Ejecutando...');
    const browser = await createBrowser();
    const page = await browser.newPage();
    let exit = false;
    let pageNumber = 1;
    let totalUrls = [];
    while(exit === false) {

        urlPage= pageScrapeGeekyGadgets.concat(pageNumber, '/');
        console.log('Procesando: ', urlPage);
        await page.waitForTimeout(1000);
        await page.goto(urlPage);
        await page.waitForSelector('.entry-header');

        articles = await extractArticles(page);

        articlesDateParsedArray = articlesDateParsed(articles);
        articlesFiltered = articlesDateParsedArray.filter(article => {
            if((article.date >= startRangeDate) && (article.date <= finalRangeDate)) {
                return article
            }
        })
        
        console.log('Encontradas ', articlesFiltered.length, ' urls en la página...');

        articlesFiltered.forEach(article => {
            if (article.date < startRangeDate) {
                exit = true
                return        
            } else {
                totalUrls.push({A: article.url, B: moment(article.date).format('DD-MM-YYYY')});
            }
        })

        if (articlesFiltered.length === 0 && totalUrls.length !== 0 ) {
            exit = true;
        }

        pageNumber = pageNumber + 1;
    }

    console.log('Total urls: ', totalUrls.length )

    if (totalUrls.length > 0) {
        let finish = await saveExtractUrlsInExcel(totalUrls, totalUrls.length);
    } else {
        console.log('No se han encontrado URS para el día solicitado');
    }

    browser.close();

    return;
 }

 async function extractArticles(page) {
    let articlesUrls = await page.$$eval('.content > .post', articles => {
        const urls = articles.map(article => {
            const url = article.querySelector('h2 > a').href
            const date = article.querySelector('.entry-time:nth-child(2)').innerHTML;
            return {url, date};
        })

        return urls
    })

    return articlesUrls;
 }

 function articlesDateParsed(articles) {
     const articlesDateParsed = articles.map(article => {
         date = extractDate(article.date)
         return {url: article.url, date: date}
     })

     return articlesDateParsed;
 }

 function extractDate(date) {
    const dateSplit = date.split(' ');
    const monthIndex = monthsGlobal.findIndex(el => el === dateSplit[0]) + 1;
    const yearIndex = dateSplit[2];
    const dayIndex = dateSplit[1].split(',')[0];
    const dateFormat = dayIndex + '/' + monthIndex + '/' + yearIndex 
    const momentDate = moment(dateFormat, 'DD-MM-YYYY').startOf('day');

    return momentDate;
 }

async function saveExtractUrlsInExcel(arrayUrls, findUrls)
{
    console.log('Volcando ', findUrls, ' urls encontradas en Documento Excel...');

    // Declare WorkBook
    const availableWB = xlsx.readFile('xlsx/geekyGadgetsExport.xlsx');

    // Declare WorkSheet
    const availableWS = availableWB.Sheets['urls'];

    xlsx.utils.sheet_add_json(availableWS, arrayUrls, { skipHeader: true, origin: "A2"});

    // // Wirte File With WorkBook
    xlsx.writeFile(availableWB, 'xlsx/geekyGadgetsExport.xlsx');

    console.log('Se han grabado los datos en el Fichero xlsx');

    return true;

}

async function createBrowser() 
{
    const args = ['--no-default-browser-check'];
    const excludeSwitches = ['--enable-automation'];

    return puppeteer.launch({
        headless: false,
        devtools: false,
        defaultViewport: null,
        args: args,
        ignoreDefaultArgs: excludeSwitches,
    })
}

main();
