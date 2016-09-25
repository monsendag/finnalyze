#!/usr/bin/env babel-node

import orbweaver from './lib/orbweaver';
import winston from 'winston';
import fs from 'fs';

const address = process.argv[2];


finnalyze
  .getCsv(address)
  .then(csv => {
    fs.writeFile('data.csv', csv);
    console.log('done');
  }, err => console.error(err));


  //
  // finnalyze
  //   .getAll(address)
  //   .then(json => {
  //     fs.writeFile('data.json', JSON.stringify(json));
  //     console.log('done');
  //   }, err => console.error(err));
