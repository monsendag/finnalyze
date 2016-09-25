#!/usr/bin/env babel-node

import orbweaver from './lib/orbweaver';
import winston from 'winston';
import Promise from 'bluebird';
import fs from 'fs';

winston.addColors({
  trace: 'magenta',
  input: 'grey',
  verbose: 'cyan',
  prompt: 'grey',
  debug: 'blue',
  info: 'green',
  data: 'grey',
  help: 'cyan',
  warn: 'yellow',
  error: 'red'
});

// promisify fs module
Promise.promisifyAll(fs);

async function run(address) {
  const csv = await orbweaver.getCsv(address);
  await fs.writeFile('data.csv', csv);

  console.log('done');
};

try {
  // const address = process.argv[2];
  const address = 'http://m.finn.no/car/used/search.html?make=0.777&model=1.777.7566&model=1.777.2000164&filters=';

  // run with CLI argument
  run(address);
}

catch(e) {
  console.error('Caught exception while running orbweaver');
  console.error(e);
}
