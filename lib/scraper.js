import cheerio from 'cheerio';
import url from 'url';
import querystring from 'querystring';
import got from 'got';
import log from 'winston';
import Queue from 'promise-queue';
import _ from 'lodash';

var queue = new Queue(3, Infinity);

const progress = {
  total: 0,
  progress: 0
};

const headers = {
  'pragma': 'no-cache',
  'accept-encoding': 'gzip, deflate, sdch',
  'accept-language': 'en-US,en;q=0.8,nb;q=0.6',
  'user-agent': 'Chrome/43.0.2357.130',
  'accept': 'text/html,*/*;q=0.8'
};

function getDocument(url) {
  const generate = () => {
    return new Promise((resolve, reject) => {
      got(url, (err, data, res) => {
        if (err) reject(err);
        resolve(cheerio.load(data));
      });
    });
  }
  return queue.add(generate);
}

function scrapePage(url) {
  return getDocument(url)
    .then(($) => {
      const dt = $('dt');
      const data = {};
      dt.each((i, term) => {
        const $term = $(term);
        const key = $term.text().trim().replace(/,/g, '');
        const value = $term.next('dd').text().trim();
        data[key] = value;
      });
      return data;
    });
}

// sets the page get parameter to the given page
function setPage(address, page) {
  const uri = url.parse(address);
  const query = querystring.parse(uri.query);
  query.page = page;
  uri.search = '?' + querystring.stringify(query);
  return uri.format();
}

function getNumPages(address) {
  const ITEMS_PER_PAGE = 30;
  return getDocument(address).then(($) => {
    const numResults = parseInt($('span[data-automation-id=resultlist-counter]').text(), 10);
    const numPages = Math.ceil(numResults / ITEMS_PER_PAGE);
    if(isNaN(numPages)) {
      throw new Error('Invalid number of pages');
    }

    log.info(`pages: ${numPages}`);

    return numPages;
  });
}

function getAds(url) {
  return getNumPages(url).then(numPages => {
    const promises = [];
    var numAds = 0;

    for (let page = 1; page <= numPages; page++) {
      const address = setPage(url, page);
      log.debug(`fetching ad links for ${address}`)
      const promise = getDocument(address).then($ => {
        const ads = $('#resultlist h2[data-automation-id=heading] a');
        const data = [];
        ads.each((i, ad) => {
          const $ad = cheerio(ad);
          const title = $ad.text().trim().replace(/,/g, '');
          const href = $ad.attr('href');
          // log.debug(`${++numAds}: ${title}`)
          data.push({title, href});
        });
        return data;
      });
      promises.push(promise);
    }

    return Promise
      .all(promises)
      .then(arrays => {
        // flatten ads
        const merged = [].concat(...arrays);
        log.info(`ad links: ${merged.length}`)
        return merged;
      });
  });
}

function getAll(address) {
  return getAds(address).then((ads) => {

    log.info(`scraping all links`)
    progress.total = ads.length;

    const data = ads.map((ad, i) => {
      return scrapePage(ad.href)
      .then(doc => {
        doc.Tittel = ad.title;
        doc.Url = ad.href;
        log.debug(`${++progress.progress}: ${doc.Tittel}`);
        return doc;
      });
    });
    return Promise.all(data);
  })
  .then(ads => {
    console.log(`got all ads: ${ads.length}`);

    const columns = new Set();
    ads.forEach(ad => {
      Object.keys(ad).forEach(col => columns.add(col));
    });
    return {columns, ads};
  });
}

export default {getAll, progress};
