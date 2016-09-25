import cheerio from 'cheerio';
import URL from 'url';
import querystring from 'querystring';
import got from 'got';
import log from 'winston';
import Promise from 'bluebird';
import Queue from 'promise-queue';

Promise.promisify(got);

Queue.configure(Promise);

var queue = new Queue(3, Infinity);

const headers = {
  'pragma': 'no-cache',
  'accept-encoding': 'gzip, deflate, sdch',
  'accept-language': 'en-US,en;q=0.8,nb;q=0.6',
  'user-agent': 'Chrome/43.0.2357.130',
  'accept': 'text/html,*/*;q=0.8'
};

// all got() calls are wrapped in getDocument
// which uses promise-queue to ensure that at most
// 3 fetches are done in parallel
// returns a cheerio document
async function getDocument(url) {

  const fetch = async () => {
    try {

      // pretend to be chrome
      const headers = {
        'Referer': 'http://m.finn.no/car/browse.html',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.8,nb;q=0.6'
      };

      const response = await got(url, {headers});
      return cheerio.load(response.body);
     }
     catch(e) {
        log.error(e);
        throw e;
     }
  };

  return await queue.add(fetch);
}


function toInteger(str) {
  return parseInt(str.replace(/[^0-9]/g, ''), 10);
}

function toFloat(str) {
  return parseFloat(str.replace(',', '.').replace(/[^0-9\.]/g, ''));
}

// scrape details from an article page
async function scrapeArticle(url) {
  const $ = await getDocument(url);

  const data = {};

  $('dt').each((i, term) => {
    const $term = $(term);
    const key = $term.text().trim().replace(/,/g, '');
    const value = $term.next('dd').text().trim();
    data[key] = value;
  });

  // data is crawled as strings
  // need to map into proper types (int/float)

  if ('Km.stand' in data) {
    data['Km.stand'] = toInteger(data['Km.stand']);
  }

  if ('Effekt' in data) {
    data['Effekt'] = toInteger(data['Effekt']);
  }

  if ('Årsmodell' in data) {
    data['Årsmodell'] = toInteger(data['Årsmodell']);
  }

  if ('Vekt' in data) {
    data['Vekt'] = toInteger(data['Vekt']);
  }

  if ('Sylindervolum' in data) {
    data['Sylindervolum'] = toFloat(data['Sylindervolum']);
  }

  if ('Antall seter' in data) {
    data['Antall seter'] = toInteger(data['Antall seter']);
  }

  if ('Antall dører' in data) {
    data['Antall dører'] = toInteger(data['Antall dører']);
  }

  if ('Antall eiere' in data) {
    data['Antall eiere'] = toInteger(data['Antall eiere']);
  }

  let price = $('div[class~=h1][data-automation-id=value]').text();
  if(price) {
    data['Totalpris'] = toInteger(price);
  }

  return data;
}

// sets the page get parameter to the given page
function setPage(url, page) {
  const uri = URL.parse(url);
  const query = querystring.parse(uri.query);
  query.page = page;
  uri.search = '?' + querystring.stringify(query);
  return uri.format();
}

async function scrapeNumberOfPages(url) {
  const ITEMS_PER_PAGE = 50;
  const $ = await getDocument(url);

  // extract number of pages from data-count attribute
  let result = $(`span[class='current-hit-count'] > b`).attr('data-count');
  result = parseInt(result, 10);

  const numPages = Math.ceil(result / ITEMS_PER_PAGE);

  if (isNaN(numPages)) {
    throw new Error('Invalid number of pages');
  }

  log.info(`${url}: found ${numPages} pages`);

  return numPages;
}

// goes through all pages of url
// and retrieves the list of articles to scrape
async function scrapeArticleList(url) {
  const urlObject = URL.parse(url);

  log.info(`${url}: scraping number of pages`);

  const numPages = await scrapeNumberOfPages(url);

  const articleList = [];

  // go through all pages and extract articles
  for (let page = 1; page <= numPages; page++) {

    let pageUrl = setPage(url, page);
    log.info(`${pageUrl}: scraping article list on page ${page}`);

    let $ = await getDocument(pageUrl);

    // extract articles on this page
    const articles = $('div[data-automation-id=adList] a[data-search-resultitem]');

    log.info(`${pageUrl}: found ${articles.length} articles`);

    articles.each((i, article) => {

      const $article = cheerio(article);

      // read relative href, resolve to absolute URL
      const href = URL.resolve(urlObject, $article.attr('href'));

      // read title
      let title = $article.find('h3[data-automation-id=titleRow]').text();
      // remove space padding
      title = title.trim();
      // remove comma
      title = title.replace(/,/g, '');

      articleList.push({title,href});
    });

  }

  return articleList;
}

async function fetchArticles(url) {
  const articleLinks = await scrapeArticleList(url);

  log.info(`${url}: scraped pages. Found ${articleLinks.length} articles`);

  // create list of scraping promises
  const articlePromises = articleLinks.map(async (article, i) => {
    let doc = await scrapeArticle(article.href);
    doc.Tittel = article.title;
    doc.Url = article.href;
    return doc;
  });

  const articles = await Promise.all(articlePromises);

  // make set of unique columns
  const columns = new Set();
  articles.forEach(ad => {
    Object.keys(ad).forEach(col => columns.add(col));
  });

  return {
    columns,
    articles
  };
}

export default {
  fetchArticles
};
