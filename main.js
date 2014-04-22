(function() {
"use strict";

var fs = require("fs");
var pdc = require("pdc");
var jsdom = require('jsdom');
var YAML = require('json2yaml');
var moment = require('moment');

var config = JSON.parse( fs.readFileSync('./config.json', { encoding: 'utf8' }) );

function selectPages(window) {
  var $ = window.$;
  var selectedLinks = [];
  var iterator = 0;

  $(config.linkSelectorString).each( function() {
    var link = $( this ).prop('href');
    
    if ( typeof config.filterUrlsBy === "string" && config.filterUrlsBy !== "" ) {
      if ( link.toLowerCase().indexOf(config.filterUrlsBy) >= 0 ) {
        console.log("Filtered Link: "+link);
        selectedLinks.push( link );
      }
    } else {
      console.log("Found link: "+link);
      selectedLinks.push( link );
    }
  });

  console.log( 'All Articles Count: '+$(config.linkSelectorString).length );
  console.log( 'Selected Articles Count: '+selectedLinks.length );

  fetchPage(selectedLinks, iterator);
}

function fetchPage(selectedLinks, iterator) {

  if ( iterator < selectedLinks.length ) {
    jsdom.env( selectedLinks[iterator], ["http://code.jquery.com/jquery.js"], function (errors, window) {
      if (!errors) {
        console.log('Fetched page: '+iterator);
        parsePage(window, selectedLinks, iterator);
      } else {
        console.log('Error!');
      }
    });
  } else {
    console.log('All pages fetched');
  }
}

function parsePage(window, selectedLinks, iterator) {
  var $ = window.$;
  var page = {};
  var i = 0;

  if ( Array.isArray(config.removeElements) ) {
    for ( i = 0; i < config.removeElements.length; i += 1) {
      $(config.removeElements[i]).remove();
    }
  } else if ( typeof config.removeElements === "string" ) {
    $(config.removeElements).remove();
  } else {
    console.error('Error! Please check your "removeElements" setting');
  }

  page.author = $(config.selectors.author).text();
  page.title = $(config.selectors.title).text();

  page.body = $(config.selectors.body).html();

  console.info( 'Parsed page' );

  htmlToMarkdown(page, selectedLinks, iterator);
}

function htmlToMarkdown(page, selectedLinks, iterator) {
  var data;

  data = page.body;

  pdc( data, 'html', 'markdown', function(err, result) {
    if (err) {
      throw err;
    }

    page.bodyInMarkdown = result;

    writeJekyllPost(page, selectedLinks, iterator);
  });
}

function writeJekyllPost(page, selectedLinks, iterator) {
  var path = '';
  var date = ''; 
  var fileName = '';

  var metadata;
  var body;
  var output;

  if ( /^\d{4}-\d{2}-\d{2}$/.test(config.jekyll.date) === true ) {
    date = config.jekyll.date;
  } else {
    date = moment().format("YYYY-MM-DD");
  }

  // Add trailing slash to path variable
  if ( /\/$/.test(config.outputFolder) ) {
    path = config.outputFolder;
  } else {
    path = config.outputFolder + '/';
  }

  body = page.bodyInMarkdown;
  delete page.bodyInMarkdown;
  delete page.body;

  metadata = YAML.stringify(page).replace(/^---/, "---\n\n  layout: "+config.jekyll.layout);
  metadata = metadata + "\n---\n\n";
  output = metadata + body + "\n";

  console.log( '\n'+output);

  fileName = date+'-'+page.title;
  fileName = fileName.replace(/\?/g, '')
                     .replace(/\s\/\s/g, '-')
                     .replace(/\&/g, 'and')
                     .replace(/\:/g, '')
                     .replace(/\W/gi, '-')
                     .replace(/--+/gi, '-')
                     .replace(/-+$/g, '')
                     .toLowerCase();
  fileName += '.markdown';

  fs.writeFileSync(path+fileName, output, { encoding: 'utf-8' });

  iterator += 1;
  fetchPage(selectedLinks, iterator);
}

jsdom.env( config.initialPage, ["http://code.jquery.com/jquery.js"], function (errors, window) {
  if (!errors) {
    console.log("Fetched "+config.initialPage);
    selectPages(window);
  } else {
    console.log('Error!');
  }
});

})();
