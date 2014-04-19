var fs = require("fs");
var pdc = require("pdc");
var jsdom = require('jsdom');
var YAML = require('json2yaml');

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

  //fetchPage(selectedLinks, iterator);
}

function fetchPage(selectedLinks, iterator) {

  if ( iterator < selectedLinks.length ) {
    jsdom.env( selectedLinks[iterator], ["http://code.jquery.com/jquery.js"], function (errors, window) {
      if (!errors) {
        console.log('Fetch page: '+iterator);
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
  var page;

  page = '';
  page = {};

  $('p.leading').each(function() {
    $( this ).replaceWith( "<h2>" + $( this ).text() + "</h2>" );
  });

  page.title = $('#blogpage h1').text();
  page.author = $('#blogpage .articleauthor a').text();

  $('#blogpage .articleauthor').remove();
  $('#blogpage h1').remove();
  $('#blogpage br').remove();

  page.body = $('#blogpage').html();

  console.info( 'Parse page: '+iterator );

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
  var date = '2014-04-01';
  var fileName;

  var metadata;
  var body;
  var output;

  // Add trailing slash to path variable
  if ( /\/$/.test(config.outputFolder) ) {
    path = config.outputFolder;
  } else {
    path = config.outputFolder + '/';
  }

  body = page.bodyInMarkdown;
  delete page.bodyInMarkdown;
  delete page.body;

  metadata = YAML.stringify(page).replace(/^---/, "---\n\n  layout: post-new-feature");
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
    console.log(config.initialPage);
    selectPages(window);
  } else {
    console.log('Error!');
  }
});
