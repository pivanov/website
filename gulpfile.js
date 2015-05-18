"use strict";

var gulp = require("gulp");


// Loads the plugins without having to list all of them
// Call them as $.pluginname
var $ = require("gulp-load-plugins")();


// "del" is used to clean out directories
var del = require("del");


// BrowserSync isn't a gulp package, and needs to be loaded manually
var browserSync = require("browser-sync");


// merge is used to merge the output from two different streams into the same stream
var merge = require("merge-stream");


// Need a command for reloading webpages using BrowserSync
var reload = browserSync.reload;


// And define a variable that BrowserSync uses in it's function
var bs;


// Deletes the directory that is used to serve the site during development
gulp.task("clean:dev", del.bind(null, ["dev"]));


// Deletes the directory that the optimized site is output to
gulp.task("clean:prod", del.bind(null, ["site"]));


// Runs the build command for Jekyll to compile the site locally
// This will build the site with the production settings
gulp.task("jekyll:dev", $.shell.task("bundle exec jekyll build"));
gulp.task("jekyll-rebuild", ["jekyll:dev"], function() {
  reload;
});


// Almost identical to the above task, but instead we load in the build configuration
// that overwrites some of the settings in the regular configuration so that you
// don"t end up publishing your drafts or future posts
gulp.task("jekyll:prod", $.shell.task("jekyll build --config _config.yml,_config.build.yml"));


// Compiles the SASS files and moves them into the "assets/css" directory
gulp.task("styles", function() {
  // Looks at the style.scss file for what to include and creates a style.css file
  return gulp.src("src/assets/scss/style.scss")
    .pipe($.sass())
    // AutoPrefix your CSS so it works between browsers
    .pipe($.autoprefixer("last 1 version", {
      cascade: true
    }))
    // Directory your CSS file goes to
    .pipe(gulp.dest("src/assets/css/"))
    .pipe(gulp.dest("dev/assets/css/"))
    // Outputs the size of the CSS file
    .pipe($.size({
      title: "styles"
    }))
    // Injects the CSS changes to your browser since Jekyll doesn"t rebuild the CSS
    .pipe(reload({
      stream: true
    }));
});


// Optimizes the images that exists
gulp.task("images", function() {
  return gulp.src("src/assets/images/**")
    .pipe($.changed("public/assets/images"))
    .pipe($.imagemin({
      // Lossless conversion to progressive JPGs
      progressive: true,
      // Interlace GIFs for progressive rendering
      interlaced: true
    }))
    .pipe(gulp.dest("public/assets/images"))
    .pipe($.size({
      title: "images"
    }));
});


// Copy over fonts to the "public" directory
gulp.task("fonts", function() {
  return gulp.src("src/assets/fonts/**")
    .pipe(gulp.dest("public/assets/fonts"))
    .pipe($.size({
      title: "fonts"
    }));
});


// Copy xml and txt files to the "public" directory
gulp.task("copy", function() {
  return gulp.src(["dev/*.txt", "dev/*.xml"])
    .pipe(gulp.dest("public"))
    .pipe($.size({
      title: "xml & txt"
    }))
});


// Optimizes all the CSS, HTML and concats the JS etc
gulp.task("html", ["styles"], function() {
  var assets = $.useref.assets({
    searchPath: "dev"
  });

  return gulp.src("dev/**/*.html")
    .pipe(assets)
    // Concatenate JS files and preserve important comments
    .pipe($.if("*.js", $.uglify({
      preserveComments: "some"
    })))
    // Minify CSS
    .pipe($.if("*.css", $.minifyCss()))
    .pipe(assets.restore())
    // Conctenate your files based on what you specified in _layout/header.html
    .pipe($.useref())
    // Replace the asset names with their cache busted names
    .pipe($.revReplace())
    // Minify HTML
    .pipe($.if("*.html", $.htmlmin({
      removeComments: true,
      removeCommentsFromCDATA: true,
      removeCDATASectionsFromCDATA: true,
      collapseWhitespace: true,
      collapseBooleanAttributes: true,
      removeAttributeQuotes: true,
      removeRedundantAttributes: true
    })))
    // Send the output to the correct folder
    .pipe(gulp.dest("public"))
    .pipe($.size({
      title: "optimizations"
    }));
});


// Run JS Lint against your JS
gulp.task("jslint", function() {
  gulp.src("./dev/assets/js/*.js")
    // Checks your JS code quality against your .jshintrc file
    .pipe($.jshint(".jshintrc"))
    .pipe($.jshint.reporter());
});


// Runs "jekyll doctor" on your site to check for errors with your configuration
// and will check for URL errors a well
gulp.task("doctor", $.shell.task("bundle exec jekyll doctor"));


// BrowserSync will serve our site on a local server for us and other devices to use
// It will also autoreload across all devices as well as keep the viewport synchronized
// between them.
gulp.task("dev:dev", ["styles", "jekyll:dev"], function() {
  bs = browserSync({
    notify: true,
    // tunnel: "",
    server: {
      baseDir: "dev"
    }
  });
});


// These tasks will look for files that change while serving and will auto-regenerate or
// reload the website accordingly. Update or add other files you need to be watched.
gulp.task("watch", function() {
  gulp.watch(["src/**/*.md", "src/**/*.html", "src/**/*.xml", "src/**/*.txt", "src/**/*.js"], ["jekyll-rebuild"]);
  gulp.watch(["dev/assets/css/*.css"], reload);
  gulp.watch(["dev/assets/js/*.js"], ["jslint"]);
  gulp.watch(["src/assets/scss/**/*.scss"], ["styles"]);
});


// Serve the site after optimizations to see that everything looks fine
gulp.task("dev:prod", function() {
  bs = browserSync({
    notify: false,
    server: {
      baseDir: "public"
    }
  });
});


// Default task, run when just writing "gulp" in the terminal
gulp.task("default", ["dev:dev", "watch"]);


// Checks your CSS, JS and Jekyll for errors
gulp.task("check", ["jslint", "doctor"], function() {
  // Better hope nothing is wrong.
});


// Builds the site but doesn"t serve it to you
gulp.task("build", ["jekyll:prod", "styles"], function() {});


// Builds your site with the "build" command and then runs all the optimizations
gulp.task("production", ["build"], function() {
  gulp.start("html", "copy", "images", "fonts");
});