/*jshint browser: false, node: true */
var path = require('path'),
    fs = require('fs'),
    glob = require('glob');


// This is the main application configuration file.  It is a Grunt
// configuration file, which you can learn more about here:
// https://github.com/cowboy/grunt/blob/master/docs/configuring.md
module.exports = function(grunt) {
  'use strict';

  // load all grunt tasks
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    // The jshint option
    jshint: { // grunt-contrib-jshint
      all: ['lib/**/*.js', 'test/**/*.js', 'Gruntfile.js'],
      options: {
        jshintrc: '.jshintrc'
      }
    },

    jsvalidate: { // grunt-jsvalidate
      files: ['lib/**/*.js', 'test/**/*.js']
    },

    simplemocha: { // grunt-simple-mocha
      options: {
        compilers: 'coffee:coffee-script',
        timeout: 3000,
        ignoreLeaks: false,
        ui: 'bdd',
        reporter: 'spec'
      },
      all: { src: ['test/**/*.spec.coffee'] }
    },

    mochacov: {
      coverage: {
        options: {
          compilers: ['coffee:coffee-script'],
          timeout: 3000,
          ignoreLeaks: false,
          ui: 'bdd',
          coverage: true,
          reporter: 'html-cov'
        },
        all: { src: ['test/**/*.spec.coffee'] }
      },
      test: {
        options: {
          compilers: ['coffee:coffee-script'],
          timeout: 3000,
          ignoreLeaks: false,
          ui: 'bdd',
          reporter: 'spec'
        },
        all: { src: ['test/**/*.spec.coffee'] }
      }
    },

    clean: { // grunt-contrib-clean
      docs: ['docs/']
    },

    yuidoc: { // grunt-contrib-yuidoc
      compile: {
        name: '<%= pkg.name %>',
        description: '<%= pkg.description %>',
        version: '<%= pkg.version %>',
        url: '<%= pkg.homepage %>',
        options: {
          paths: 'lib/',
          outdir: 'docs/api/'
        }
      }
    },

    plato: { // grunt-plato
      def: {
        options : {
          jshint : grunt.file.readJSON('.jshintrc')
        },
        files: {
          'docs/plato': ['lib/**/*.js']
        }
      }
    },

    dox: {
      options: {
        title: 'test'
      },
      files: {
        src: ['lib/'],
        dest: 'docs/dox'
      }
    }

  });

  // Grunt task for development
  grunt.registerTask('default', ['jsvalidate']);

  // Run server-side tests
  grunt.registerTask('test', ['jshint', 'jsvalidate', 'simplemocha']);

  // Generates the docs api (yuidoc) and inline docs (groc)
  //grunt.registerTask('docs', ['clean:docs', 'groc', 'yuidoc', 'plato']);
};
