'use strict';
const fs = require('fs');
const recursive = require('recursive-readdir');
const async = require('async');
const util = require('../../util');
const Shannon = require('./shannon');
const shannon = new Shannon();

module.exports = function Entropy(options) {
  options = util.defaultValue(options, {});
  options = util.permittedArgs(options, []);

  let self = {};
  self.key = 'entropy';
  self.name = 'Entropy';
  self.description = 'Scans files for strings with high entropy';
  self.enabled = false;

  let target;
  self.handles = function(t) {
    util.enforceNotEmpty(t);
    target = t;
    return true;
  };
  self.run = function(results, done) {
    let defaultFiles = /^(js|json|xml|text|rb|py|sh|md)$/;
    let targetRegexp = new RegExp('^' + target + '\/?');

    let imDone = false;
    recursive(target, ['.git', 'node_modules'], (err, files) => {
      if(imDone) { return; }
      if(err) { imDone = true; return done(err); }
      async.forEach(files, (file, nextFile) => {
        let extension = file.split('.').pop();
        if(!defaultFiles.exec(extension)) { return nextFile(); }
        fs.stat(file, (err, stat) => {
          if(err) {
            return nextFile();
          }
          if(stat.size > 20000) {
            return nextFile();
          }
          fs.readFile(file, (err, contents) => {
            /* jshint maxcomplexity: 5*/
            if(err) { return nextFile(); }
            contents = contents.toString();
            let re = /\w{10,}/g;
            let m;

            do {
              m = re.exec(contents);
              if (m) {
                let word = m[0];
                let entropy = shannon.entropy(word);
                if(entropy > 4.5) {
                  let name = file.replace(targetRegexp, '');
                  let line = contents.split(m[0])[0].split('\n').length;
                  results.low(name, 'High entropy string could be password or key\nLine number: ' + line);
                }
              }
            } while (m);

            nextFile();
          });
        });
      }, done);
    });
  };
  return Object.freeze(self);
};