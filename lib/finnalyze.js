const cheerio = require('cheerio');
const request = require('urllib-sync').request;
const url = require('url');
const querystring = require('querystring');
const tocsv = require('json-2-csv');
const got = require('got');
const PromisePool = require('es6-promise-pool').PromisePool;


const headers = {
  'pragma': 'no-cache',
  'accept-encoding': 'gzip, deflate, sdch',
  'accept-language': 'en-US,en;q=0.8,nb;q=0.6',
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.130 Safari/537.36',
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
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
      const dt = $('.objectinfo dl dt');
      const data = {};
      dt.each((i, term) => {
        const $term = $(term);
        data[$term.text().trim()] = $term.next('dd').text().trim();
      });
      return data;
    });
}

function getNumPages(address) {
  const ITEMS_PER_PAGE = 30;
  return getDocument(address).then(($) => {
    const numResults = parseInt($('span[data-automation-id=resultlist-counter]').text(), 10);
    return Math.ceil(numResults / ITEMS_PER_PAGE);
  });
}

function setPage(address, page) {
  const uri = url.parse(address);
  const query = querystring.parse(uri.query);
  query.page = page;
  uri.search = '?' + querystring.stringify(query);
  return uri.format();
}

function getAllPages(address) {
  return getNumPages(address).then((numPages) => {
    const promises = [];
    for (let page = 1; page <= numPages; page++) {
      const address = setPage(address, page);
      let promise = getDocument(address).then(($) => {
        const ads = $('#resultlist h2[data-automation-id=heading] a');
        return ads.map((ad) => {
          const $ad = $(ad);
          return {
            title: $ad.text().trim(),
            href: $ad.attr('href')
          };
        });
      });
      promises.push(promise);
    }
    return Promise.all(promises);
  });
}

function massage(document) {
  // kilometerstand
  if ('Kilometer' in document) {
    document.Kilometer = parseInt(document.Kilometer.replace(/[^0-9]/g, ''));
  }

  if ('Årsmodell' in document) {
    document['Årsmodell'] = parseInt(document['Årsmodell'], 10);
  }
}

function getAll() {
  getAllPages.then((pages) => {


  });

  ads.forEach((ad, i) => {
    console.error(`${i} – ${ad.title}`);
    let doc = scrapePage(ad.href);
    doc.tittel = ad.title;
    data.push(doc);
  });

  data.forEach(massage);

  tocsv.json2csv(data, function(err, csv) {
    if (err) throw err;
    console.log(csv);
  }, {
    KEYS: ['tittel', 'Kilometer', 'Årsmodell'],
    DELIMITER: {
      FIELD: '#'
    }
  });

}
