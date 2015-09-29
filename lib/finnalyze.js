import scraper from './scraper';
import json2csv from 'json2csv';

export default {getAll, getCsv, progress: scraper.progress};

function toInteger(str) {
  return parseInt(str.replace(/[^0-9]/g, ''), 10);
}

function toFloat(str) {
  return parseFloat(str.replace(',', '.').replace(/[^0-9\.]/g, ''));
}

function getAll(address) {
  return scraper
    .getAll(address)
    .then(({columns, ads}) => {

      const mapped = ads.map(ad => {

        if('Totalpris' in ad) {
          ad['Totalpris'] = toInteger(ad['Totalpris']);
        }
        else if('Pris' in ad) {
          ad['Totalpris'] = toInteger(ad['Pris']);
        }

        if('Kilometer' in ad) {
          ad['Kilometer'] = toInteger(ad['Kilometer']);
        }

        if('Effekt' in ad) {
          ad['Effekt'] = toInteger(ad['Effekt']);
        }

        if('Årsmodell' in ad) {
          ad['Årsmodell'] = toInteger(ad['Årsmodell']);
        }

        if('Vekt' in ad) {
          ad['Vekt'] = toInteger(ad['Vekt']);
        }

        if('Sylindervolum' in ad) {
          ad['Sylindervolum'] = toFloat(ad['Sylindervolum']);
        }

        if('Antall seter' in ad) {
          ad['Antall seter'] = toInteger(ad['Antall seter']);
        }

        if('Antall dører' in ad) {
          ad['Antall dører'] = toInteger(ad['Antall dører']);
        }

        if('Antall eiere' in ad) {
          ad['Antall eiere'] = toInteger(ad['Antall eiere']);
        }

        return ad;
      });

      // ensure we have all columns in all documents
      mapped.forEach(ad => {
        columns.forEach(col => {
          if(!(col in ad)) {
            ad[col] = '';
          }

          if(typeof ad[col] === "string") {
            ad[col] = ad[col].replace(',', '');
          }

        });
      });

      return {columns, ads:mapped};

    });
}


function getCsv(address) {
  return getAll(address)
    .then(({ columns, ads }) => {

      const fields = [
        'Tittel',
        'Totalpris',
        'Kilometer',
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

      return new Promise((resolve, reject) => {
        json2csv({ data: ads, fields }, function(err, csv) {
          if (err) return reject(err);
          resolve(csv);
        });
      });
    });
}
