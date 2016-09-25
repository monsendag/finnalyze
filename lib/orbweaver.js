import scraper from './scraper';
import Promise from 'bluebird';
import json2csv from 'json2csv';
import winston from 'winston';

Promise.promisify(json2csv);

export default {
  getCsv
};

async function getCsv(url) {

  const {columns,articles} = await scraper.fetchArticles(url);

  columns.forEach(column => {
    articles.forEach(article => {
      // remove comma from all article data
      if (typeof article[column] === "string") {
        article[column] = article[column].replace(',', '');
      }

      // ensure that we have data in all fields
      if (!(column in article)) {
        article[column] = '';
      }
    });
  });

  const fields = [
    'Tittel',
    'Totalpris',
    'Km.stand',
    'Sylindervolum',
    'Effekt',
    'Årsmodell',
    'Vekt',
    'Karosseri',
    'Avgiftsklasse',
    'Garanti',
    'Drivstoff',
    'Girkasse',
    'Hjuldrift',
    'Farge',
    'Antall seter',
    'Antall dører',
    'Antall eiere',
    'Url'
  ];

  winston.info(`${url}: converting to csv`);
  return await json2csv({
    data: articles,
    fields
  });
}
