#!/usr/bin/env babel-node

import scraper from './lib/scraper';
import winston from 'winston';

winston.level = 'debug';


const address = process.argv[2];

scraper
  .getAll(address)
  .then(data => {
    console.dir(data);
  }, err => {
    console.error(err);
  });
