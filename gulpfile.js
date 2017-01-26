// Gulp
var gulp = require('gulp');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var autoprefixer = require('gulp-autoprefixer');
var cleanCSS = require('gulp-clean-css');
var runSequence = require('run-sequence');
var browserify = require('gulp-browserify');

// Browser-sync
var browserSync = require('browser-sync');

gulp.task('default', function () {

  // Initialize browser sync
  browserSync.init({
    server : {
      baseDir : './'
    }
  });

  gulp.watch('./index.html', ['reload']);
  gulp.watch('./src/**/*.js', function () {
    runSequence(
      'compile',
      'reload'
      );
  });
  gulp.watch('./style/**/*.scss', function () {
    runSequence(
      'sass',
      'reload'
      );
  });

});

gulp.task('reload', function () {
  browserSync.reload();
});


// Compiles and concats javascript for module development
gulp.task('compile', function () {
  return gulp.src('./src/index.js')
    .pipe(sourcemaps.init())
    .pipe(browserify({debug: true}))
    .on('error', function (err) {
      console.log(err);
      this.emit('end');
    })
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(__dirname));
});

// Compiles, sourcemaps, and autoprefixes sass for module development
gulp.task('sass', function () {
  return gulp.src('./style/main.scss')
    .pipe(sourcemaps.init())
    .pipe(sass())
    .pipe(autoprefixer({
      browsers: ['last 2 version']
    }))
    .pipe(cleanCSS())
    .on('error', function (err) {
      console.log(err);
      this.emit('end');
    })
    .pipe(sourcemaps.write('./maps'))
    .pipe(gulp.dest('./'));
});
