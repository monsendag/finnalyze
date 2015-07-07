import cheerio from 'cheerio';
import url from 'url';
import querystring from 'querystring';
import got from 'got';
import log from 'winston';

const headers = {
  'pragma': 'no-cache',
  'accept-encoding': 'gzip, deflate, sdch',
  'accept-language': 'en-US,en;q=0.8,nb;q=0.6',
  'user-agent': 'Chrome/43.0.2357.130',
  'accept': 'text/html,*/*;q=0.8'
};

function getDocument(url) {
  return new Promise((resolve, reject) => {
    got(url, (err, data, res) => {
      if (err) reject(err);
      resolve(cheerio.load(data));
    });
  });
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
    return numPages;
  });
}

function getAds(url) {
  return getNumPages(url).then(numPages => {
    log.debug(`got number of pages: ${numPages}`);
    const promises = [];
    for (let page = 1; page <= numPages; page++) {
      const address = setPage(url, page);
      log.debug(`fetching ads for ${address}`)
      const promise = getDocument(address).then($ => {
        const ads = $('#resultlist h2[data-automation-id=heading] a');
        const data = [];
        ads.each((i, ad) => {
          const $ad = cheerio(ad);
          const title = $ad.text().trim();
          const href = $ad.attr('href');
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
        const merged = [];
        return merged.concat.apply(merged, arrays);
      });
  });
}

function getAll(address) {
  return getAds(address).then((ads) => {

    log.debug(`got ${ads.length} ads.. Scraping ..`);

    const data = ads.map((ad, i) => {
      return scrapePage(ad.href)
      .then(doc => {
        doc.Tittel = ad.title;
        doc.Url = ad.href;
        return doc;
      });
    });
    return Promise.all(data);
  })
  .then(ads => {
    log.debug(`done`);
    const columns = new Set();
    ads.forEach(ad => {
      Object.keys(ad).forEach(col => columns.add(col));
    });
    return {columns, ads};
  });
}

export default {getAll};
